import os
import time
import logging
import traceback
import hashlib
import struct
import psycopg2 
import torch
import numpy as np
import torch.nn.functional as F
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from collections import defaultdict
from contextlib import contextmanager
from psycopg2.extras import execute_values

# --- Internal Imports ---
from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig
from mlpipeline.finetune.tune_user_embedding import CoreCfg, ModelCache, compute_updated_user_embeddings
from mlpipeline.finetune.BCE_model import (
    BCEConfig, make_bce_loss, load_or_init, ensure_dir, atomic_save, batch_stats
)
from mlpipeline.api.schemas import (
    UserItem, UserEmbeddingItem,
    AdapterFinetuneRequest, AdapterFinetuneResponse, DIM
)

# Configure Logging
logger = logging.getLogger("mlpipeline.services")
logging.basicConfig(level=logging.INFO)

class PostgresDistributedLock:
    """
    Implements a distributed lock using PostgreSQL Advisory Locks.
    If the connection dies (e.g., Pod crash), Postgres automatically releases the lock.
    """
    def __init__(self, db_url: str, lock_name: str):
        self.db_url = db_url
        self.conn = None
        # Convert string name to a 64-bit BigInt required by Postgres locks
        # We use the first 8 bytes of the SHA256 hash
        self.lock_id = struct.unpack("q", hashlib.sha256(lock_name.encode('utf-8')).digest()[:8])[0]

    def __enter__(self):
        logger.info(f"Connecting to DB to acquire distributed lock: {self.lock_id}...")
        try:
            # We open a new connection specifically for the lock to ensure 
            # the lock session persists exactly as long as this block
            self.conn = psycopg2.connect(self.db_url)
            self.conn.autocommit = True
            with self.conn.cursor() as cur:
                logger.info("Waiting for lock acquisition...")
                # pg_advisory_lock blocks until the lock is available
                cur.execute("SELECT pg_advisory_lock(%s)", (self.lock_id,))
                logger.info("Distributed lock acquired.")
        except Exception as e:
            if self.conn:
                self.conn.close()
            raise RuntimeError(f"Failed to acquire Postgres lock: {e}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            try:
                with self.conn.cursor() as cur:
                    cur.execute("SELECT pg_advisory_unlock(%s)", (self.lock_id,))
                    logger.info("Distributed lock released.")
            except Exception as e:
                logger.error(f"Error releasing lock (connection might be dead): {e}")
            finally:
                self.conn.close()

class InferenceService:
    """Handles read-only inference. Safe for horizontal scaling."""
    def __init__(self):
        self._model: Optional[UserEncoder] = None
        self._input_dim: Optional[int] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.ckpt_path = Path(__file__).resolve().parents[1] / "pretrain" / "checkpoints" / "user_encoder.pt"

    def _load_model_if_needed(self, input_dim: int):
        if self._model is not None and self._input_dim == input_dim:
            return

        if not self.ckpt_path.exists():
            raise FileNotFoundError(f"Checkpoint not found at: {self.ckpt_path}")

        logger.info(f"Loading pretrained UserEncoder from {self.ckpt_path}")
        cfg = UserEncoderConfig()
        if input_dim != cfg.user_input_dim:
            raise ValueError(f"Pretrained model expects dim {cfg.user_input_dim}, but request has {input_dim}")

        model = UserEncoder(cfg)
        ckpt = torch.load(str(self.ckpt_path), map_location="cpu")
        state_dict = ckpt["state_dict"] if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt
        model.load_state_dict(state_dict, strict=True)
        model.eval().to(self.device)

        self._model = model
        self._input_dim = input_dim

    def encode(self, users: List[UserItem]) -> Tuple[List[UserEmbeddingItem], int]:
        if not users: raise ValueError("User list cannot be empty")
        d = len(users[0].user_vector)
        self._load_model_if_needed(d)

        x_np = np.asarray([u.user_vector for u in users], dtype=np.float32)
        x_tensor = torch.from_numpy(x_np).to(self.device)

        if not self._model:
            raise Exception("User encoder model was not loaded!")

        with torch.inference_mode():
            z = self._model(x_tensor)
            z_np = z.detach().cpu().numpy()

        results = [
            UserEmbeddingItem(user_id=req_u.user_id, user_embedding=emb)
            for req_u, emb in zip(users, z_np.astype(float).tolist())
        ]
        return results, z_np.shape[1]


class AdapterService:
    """
    Handles fine-tuning logic for the User Adapter.
    
    Scalability Features:
    1. Reads training data directly from DB using JOINs (avoids passing massive JSON payloads).
    2. Updates User Embeddings in-place using Server-Side Cursors (avoids OOM on large user bases).
    3. Uses Postgres Distributed Locks to ensure only one training job runs at a time per cluster.
    """

    def __init__(self):
        # Retrieve the connection string from environment
        self.db_url = os.getenv("DATABASE_BACKEND_CONNECTION_STRING", "")
        if not self.db_url:
            # Fallback construction
            user = os.getenv("POSTGRES_USER", "postgres")
            pwd = os.getenv("POSTGRES_PASSWORD", "password")
            host = os.getenv("POSTGRES_HOST", "db_backend")
            port = os.getenv("POSTGRES_PORT", "5432")
            dbname = os.getenv("POSTGRES_DB", "postgres")
            self.db_url = f"postgresql://{user}:{pwd}@{host}:{port}/{dbname}"

        self.lock_name = "adapter_finetune_critical_section"

        self.cfg = CoreCfg(
            dim=DIM,
            hidden=int(os.getenv("ADAPTER_HIDDEN", str(DIM))),
            dropout=float(os.getenv("ADAPTER_DROPOUT", "0.0")),
            adapter_temperature=float(os.getenv("ADAPTER_TEMPERATURE", "0.07")),
            ckpt_dir=os.getenv("ADAPTER_CKPT_DIR", "ckpts_weekly_user_adapter"),
            device="cuda" if (os.getenv("FORCE_CPU", "0") != "1" and torch.cuda.is_available()) else "cpu",
        )
        self.model_cache = ModelCache(self.cfg)

    @contextmanager
    def _get_conn(self):
        """Helper context manager to get a raw psycopg2 connection."""
        conn = psycopg2.connect(self.db_url)
        try:
            yield conn
        finally:
            conn.close()

    def get_health(self):
        _, info = self.model_cache.get(reload_if_changed=True)
        return info

    def tune_online(self, batch: Dict, **kwargs):
        """
        Used for on-the-fly tuning during inference if needed.
        """
        return compute_updated_user_embeddings(
            batch=batch,
            model_cache=self.model_cache,
            **kwargs
        )

    def run_training_job(self, req: AdapterFinetuneRequest) -> AdapterFinetuneResponse:
        """
        Executes the full fine-tuning loop protected by a Postgres Lock.
        """
        # --- CRITICAL SECTION START ---
        # This blocks until any other server finishes training or times out
        with PostgresDistributedLock(self.db_url, self.lock_name):
            logger.info("Lock acquired. Starting training job.")
            
            try:
                ensure_dir(self.cfg.ckpt_dir)

                # 1. FETCH STAGE: Read training data directly from DB
                # This replaces the need to pass interactions in the request payload
                logger.info("Fetching training interactions from DB...")
                U, R, y = self._fetch_training_data_from_db(limit=req.max_batch_size)
                
                logger.info(f"Loaded {len(y)} interactions for training.")

                # 2. TRAINING STAGE
                tr_idx, val_idx = self._split_data(len(y), req.val_split)
                bce_cfg = self._create_bce_config(req)
                
                # Load (Resume) or Init model
                model, optimizer, load_info = load_or_init(self.cfg.ckpt_dir, bce_cfg)
                criterion = make_bce_loss(bce_cfg)

                best_state, metrics = self._train_loop(
                    model, optimizer, criterion, bce_cfg,
                    req.epochs, U, R, y, tr_idx, val_idx
                )

                # 3. SAVE STAGE
                tag = req.tag or f"api_{int(time.time())}"
                self._save_artifacts(tag, req, bce_cfg, best_state, metrics, load_info)

                # 4. UPDATE STAGE: In-place Database Update
                # Load the best state found during training
                model.load_state_dict(best_state, strict=False)
                model.eval()
                
                logger.info("Starting in-place user embedding update...")
                # Stream all users from DB, transform, and update back
                updated_count = self._update_users_in_place(model, batch_size=2048)

                return AdapterFinetuneResponse(
                    # Ensure your Pydantic schema supports these fields
                    updated_count=updated_count,
                    train_metrics=metrics['train'],
                    val_metrics=metrics['val'],
                    model_info={
                        "tag": tag,
                        "device": self.cfg.device,
                        "ckpt_dir": self.cfg.ckpt_dir,
                        "load_info": load_info
                    }
                )

            except Exception as e:
                logger.error(f"Training failed: {traceback.format_exc()}")
                raise e
        # --- CRITICAL SECTION END ---

    def _fetch_training_data_from_db(self, limit: int = 50000):
        """
        Joins interactions with user and recipe embeddings.
        Returns PyTorch tensors directly.
        """
        # Join interactions with Users and Recipes to get raw embeddings
        query = """
            SELECT 
                u.embedding as user_emb,
                r.embedding as recipe_emb,
                uh.action as like_value
            FROM user_history uh
            JOIN user_embeddings u ON uh.user_id = u.id
            JOIN recipe_embeddings r ON uh.recipe_id = r.id
            WHERE u.embedding IS NOT NULL 
              AND r.embedding IS NOT NULL
            ORDER BY uh.action_timestamp DESC
            LIMIT %s;
        """
        
        user_embs, recipe_embs, targets = [], [], []
        
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (limit,))
                rows = cur.fetchall()
                
                for u_emb, r_emb, val in rows:
                    if u_emb is None or r_emb is None: 
                        continue # Safety check
                    user_embs.append(u_emb)
                    recipe_embs.append(r_emb)
                    targets.append(val)

        if not targets:
            raise ValueError("No valid interactions found in database to train on.")

        # Convert to Tensor directly on configured Device
        U = torch.tensor(user_embs, dtype=torch.float32, device=self.cfg.device)
        R = torch.tensor(recipe_embs, dtype=torch.float32, device=self.cfg.device)
        y = torch.tensor(targets, dtype=torch.float32, device=self.cfg.device)
        
        return U, R, y

    def _update_users_in_place(self, model, batch_size=1024) -> int:
        """
        Streams users from DB, applies adapter, and updates DB in batches.
        Uses server-side cursors to handle millions of users safely.
        """
        # SQL to read all users with embeddings
        read_sql = "SELECT id, embedding FROM user_embeddings WHERE embedding IS NOT NULL"
        
        # SQL to bulk update. 
        # NOTE: Ensure 'embedding_adapted' column exists, or change to 'embedding' to overwrite.
        write_sql = """
            UPDATE user_embeddings AS t 
            SET embedding = v.new_emb 
            FROM (VALUES %s) AS v(id, new_emb) 
            WHERE t.id = v.id
        """

        total_processed = 0
        
        with self._get_conn() as conn:
            # IMPORTANT: name="..." creates a server-side cursor. 
            # This prevents loading millions of rows into RAM.
            with conn.cursor(name="user_stream_cursor") as read_cur:
                read_cur.itersize = batch_size
                read_cur.execute(read_sql)
                
                batch_ids = []
                batch_embs = []
                
                while True:
                    rows = read_cur.fetchmany(batch_size)
                    if not rows:
                        break
                        
                    for uid, emb in rows:
                        batch_ids.append(uid)
                        batch_embs.append(emb)

                    if batch_ids:
                        # 1. Process Batch on GPU
                        with torch.no_grad():
                            u_tensor = torch.tensor(batch_embs, dtype=torch.float32, device=self.cfg.device)
                            u_adapted = model.user_adapter(u_tensor)
                            u_norm = F.normalize(u_adapted, dim=-1)
                            new_embs = u_norm.cpu().tolist()

                        # 2. Prepare Data for Bulk Update
                        update_data = list(zip(batch_ids, new_embs))

                        # 3. Write Batch to DB using a separate cursor
                        # We use a separate transaction block or cursor for writing to avoid messing up the read cursor
                        with conn.cursor() as write_cur:
                            execute_values(
                                write_cur, 
                                write_sql, 
                                update_data, 
                                template="(%s, %s::vector)"
                            )
                        # Commit the batch update
                        conn.commit()
                        
                        total_processed += len(batch_ids)
                        if total_processed % (batch_size * 10) == 0:
                            logger.info(f"Updated {total_processed} users...")
                        
                        # Clear lists to free memory
                        batch_ids = []
                        batch_embs = []

        logger.info(f"Completed updating {total_processed} users.")
        return total_processed

    # --- Helper Methods for Training Logic ---

    def _create_bce_config(self, req: AdapterFinetuneRequest) -> BCEConfig:
        return BCEConfig(
            dim=self.cfg.dim,
            hidden=self.cfg.hidden,
            temperature=self.cfg.adapter_temperature,
            dropout=self.cfg.dropout,
            keep_recipe_embedding=True,
            lr_user=float(req.lr_user),
            lr_recipe=0.0,
            weight_decay=float(req.weight_decay),
            clip_grad_norm=float(req.clip_grad_norm),
            pos_weight=req.pos_weight,
            epochs=int(req.epochs),
            log_every=0,
            device=self.cfg.device,
        )

    def _split_data(self, n: int, val_split: float):
        if n <= 1:
            idx = torch.arange(n, device=self.cfg.device)
            return idx, idx
        
        val_split = min(max(float(val_split), 0.0), 0.5)
        if val_split <= 0:
            idx = torch.randperm(n, device=self.cfg.device)
            return idx, idx

        n_val = max(1, int(round(n * val_split)))
        n_val = min(n_val, n - 1)
        idx = torch.randperm(n, device=self.cfg.device)
        val_idx = idx[:n_val]
        tr_idx = idx[n_val:]
        return tr_idx, val_idx

    def _train_loop(self, model, optimizer, criterion, cfg, epochs, U, R, y, tr_idx, val_idx):
        best_val_loss = float("inf")
        best_state = None
        last_train_loss = float("nan")
        last_val_loss = float("nan")
        last_train_stats = {}
        last_val_stats = {}

        for _ in range(epochs):
            # Training Step
            model.train()
            out_tr = model(U[tr_idx], R[tr_idx])
            loss_tr = criterion(out_tr["logits"], y[tr_idx])

            optimizer.zero_grad(set_to_none=True)
            loss_tr.backward()
            if cfg.clip_grad_norm and cfg.clip_grad_norm > 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), cfg.clip_grad_norm)
            optimizer.step()

            last_train_loss = float(loss_tr.detach().cpu())
            last_train_stats = batch_stats(out_tr["cos"].detach(), y[tr_idx].detach())

            # Validation Step
            model.eval()
            with torch.no_grad():
                out_v = model(U[val_idx], R[val_idx])
                loss_v = criterion(out_v["logits"], y[val_idx]).item()
                last_val_loss = float(loss_v)
                last_val_stats = batch_stats(out_v["cos"].detach(), y[val_idx].detach())

            # Save Best State
            if loss_v < best_val_loss:
                best_val_loss = loss_v
                best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

        # Fallback if training exploded
        if best_state is None:
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            best_val_loss = last_val_loss

        metrics = {
            "train": {"loss_last": last_train_loss, **{f"train_{k}": float(v) for k, v in last_train_stats.items()}},
            "val": {"loss_best": best_val_loss, "loss_last": last_val_loss, **{f"val_{k}": float(v) for k, v in last_val_stats.items()}}
        }
        return best_state, metrics

    def _save_artifacts(self, tag, req, bce_cfg, best_state, metrics, load_info):
        meta = {
            "tag": tag,
            "type": "api_finetune_user_adapter",
            "epochs": req.epochs,
            "load_info": load_info,
            "metrics": metrics
        }
        payload = {
            "meta": meta,
            "cfg": {"dim": bce_cfg.dim, "hidden": bce_cfg.hidden},
            "model_state": best_state,
            "saved_at": time.time(),
        }

        best_path = os.path.join(self.cfg.ckpt_dir, "best.pt")
        ckpt_path = os.path.join(self.cfg.ckpt_dir, f"ckpt_{tag}.pt")
        last_path = os.path.join(self.cfg.ckpt_dir, "last.pt")

        atomic_save(payload, best_path)
        atomic_save(payload, ckpt_path)
        
        if req.save_best_as_last:
            atomic_save(payload, last_path)
            # Reload cache if we just overwrote the file it's watching
            self.model_cache.get(reload_if_changed=True)