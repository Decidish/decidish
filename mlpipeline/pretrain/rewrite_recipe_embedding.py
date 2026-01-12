# Chen Jia
# begin: 2026/1/11 22:13
import os

import torch
from torch import nn
import torch.nn.functional as F
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

try:
    from pgvector.psycopg2 import register_vector

    HAS_PGVECTOR = True
except Exception:
    HAS_PGVECTOR = False


@dataclass
class RecipeHeadConfig:
    hidden_dim: int = 512
    num_layers: int = 3
    output_dim: int = 384
    dropout: float = 0.1


class RecipeMLPBlock(nn.Module):
    def __init__(self, out_dim=384, hidden_dim=512, dropout=0.1):
        super().__init__()
        self.mapping = nn.Sequential(
            nn.LayerNorm(out_dim),
            nn.Linear(in_features=out_dim, out_features=hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(in_features=hidden_dim, out_features=out_dim)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.mapping(x) + x


class RecipeHead(nn.Module):
    def __init__(self, cfg: RecipeHeadConfig):
        super().__init__()
        self.mlp = nn.Sequential(
            *[RecipeMLPBlock(cfg.output_dim, cfg.hidden_dim, cfg.dropout) for _ in range(cfg.num_layers)])

    def forward(self, emb: torch.Tensor):
        return F.normalize(self.mlp(emb), dim=-1)


def load_recipe_head(pt_path: str, cfg: RecipeHeadConfig, device="cpu"):
    ckpt = torch.load(pt_path, map_location="cpu")
    sd = ckpt["state_dict"]
    model = RecipeHead(cfg).to(device)
    model.load_state_dict(sd, strict=True)
    model.eval()
    return model


def get_conn():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        user = os.environ.get("POSTGRES_USER", "user")
        pwd = os.environ.get("POSTGRES_PASSWORD", "password")
        host = os.environ.get("POSTGRES_HOST", "db_backend")
        port = os.environ.get("POSTGRES_PORT", "5432")
        db = os.environ.get("POSTGRES_DB", "decidish")
        dsn = f"postgresql://{user}:{pwd}@{host}:{port}/{db}"

    conn = psycopg2.connect(dsn)
    conn.autocommit = False
    if HAS_PGVECTOR:
        register_vector(conn)
    return conn


def ensure_dst_col(conn, dim=384):
    with conn.cursor() as cur:
        cur.execute(f"""
        ALTER TABLE recipe_embeddings
        ADD COLUMN IF NOT EXISTS embedding_mlp vector({dim});
        """)
    conn.commit()


def process_and_store(
        model: RecipeHead,
        conn,
        table: str,
        id_col: str,
        src_col: str,
        dst_col: str,
        batch_size: int = 256,
        device: str = "cpu",
        only_where_dst_is_null: bool = True,
):
    where = f"WHERE {dst_col} IS NULL" if only_where_dst_is_null else ""
    count_sql = f"SELECT COUNT(*) FROM {table} {where};"
    select_sql = f"SELECT {id_col}, {src_col} FROM {table} {where} ORDER BY {id_col};"

    update_sql = f"UPDATE {table} AS t SET {dst_col} = v.emb FROM (VALUES %s) AS v({id_col}, emb) WHERE t.{id_col} = v.{id_col};"

    with conn.cursor() as cur:
        cur.execute(count_sql)
        total = cur.fetchone()[0]
        print(f"[INFO] to process rows: {total}")

    with conn.cursor(name="recipe_emb_cursor") as cur:
        cur.itersize = batch_size
        cur.execute(select_sql)

        processed = 0
        with torch.no_grad():
            for rows in iter(lambda: cur.fetchmany(batch_size), []):
                ids = []
                embs = []

                for rid, emb in rows:
                    if emb is None:
                        continue
                    ids.append(rid)
                    embs.append(list(emb))

                if not ids:
                    continue

                x = torch.tensor(embs, dtype=torch.float32, device=device)  # [B, D]
                z = model(x).detach().cpu().tolist()  # list[list[float]]

                values = list(zip(ids, z))

                with conn.cursor() as wcur:
                    execute_values(wcur, update_sql, values, page_size=len(values))
                conn.commit()

                processed += len(values)
                if processed % (batch_size * 10) == 0 or processed == total:
                    print(f"[INFO] processed {processed}/{total}")

    print("[OK] done.")

def transform_and_update_same_table(model, conn, batch_size=512, device="cpu"):
    count_sql = """
    SELECT COUNT(*) FROM recipe_embeddings
    WHERE embedding IS NOT NULL AND embedding_mlp IS NULL;
    """
    select_sql = """
    SELECT recipe_id, embedding FROM recipe_embeddings
    WHERE embedding IS NOT NULL AND embedding_mlp IS NULL
    ORDER BY recipe_id;
    """
    update_sql = """
    UPDATE recipe_embeddings AS t
    SET embedding_mlp = v.emb
    FROM (VALUES %s) AS v(recipe_id, emb)
    WHERE t.recipe_id = v.recipe_id;
    """

    with conn.cursor() as cur:
        cur.execute(count_sql)
        total = cur.fetchone()[0]
        print(f"[INFO] to process rows: {total}")

    with conn.cursor(name="emb_cursor") as cur:
        cur.itersize = batch_size
        cur.execute(select_sql)

        processed = 0
        with torch.no_grad():
            while True:
                rows = cur.fetchmany(batch_size)
                if not rows:
                    break

                ids, embs = [], []
                for rid, emb in rows:
                    if emb is None:
                        continue
                    ids.append(rid)
                    embs.append(list(emb))

                if not ids:
                    continue

                x = torch.tensor(embs, dtype=torch.float32, device=device)
                z = model(x).detach().cpu().tolist()

                values = list(zip(ids, z))

                try:
                    with conn.cursor() as wcur:
                        execute_values(wcur, update_sql, values, page_size=len(values))
                    conn.commit()
                except Exception:
                    conn.rollback()
                    raise

                processed += len(values)
                if processed % (batch_size * 10) == 0 or processed == total:
                    print(f"[INFO] processed {processed}/{total}")

    print("[OK] done.")


if __name__ == "__main__":
    TABLE_NAME = "recipes"
    ID_COL = "id"
    SRC_COL = "embedding_precomputed"
    DST_COL = "embedding_mlp"

    device = "cuda" if torch.cuda.is_available() else "cpu"

    cfg = RecipeHeadConfig(output_dim=384, hidden_dim=512, num_layers=3, dropout=0.1)
    model = load_recipe_head("checkpoints/recipe_encoder.pt", cfg, device=device)

    conn = get_conn()
    try:
        ensure_dst_col(conn, dim=cfg.output_dim)
        transform_and_update_same_table(model, conn, batch_size=512, device=device)

    finally:
        conn.close()
