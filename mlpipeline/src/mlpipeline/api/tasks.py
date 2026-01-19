import psycopg2
import torch
from mlpipeline.etl.pipeline import Pipeline
from typing import List, Optional
import numpy as np

from mlpipeline.api.schemas import EncodeBatchResponse, UserEmbeddingItem, UserItem

    
class Tasks:
    """Encapsulates background task logic and its dependencies.

    Instantiate with `app_config`, `ingredient_parser`, and `embedder` and
    call the async methods to run background jobs.
    """

    def __init__(self, app_config, ingredient_parser, embedder):
        self.app_config = app_config
        self.ingredient_parser = ingredient_parser
        self.embedder = embedder

    def _get_db_connection(self):
        """Create a new DB connection using this instance's `app_config`."""
        if self.app_config is None:
            raise RuntimeError("app_config is not set for Tasks instance")
        return psycopg2.connect(
            dbname=self.app_config.db_name,
            user=self.app_config.db_user,
            password=self.app_config.db_password,
            host=self.app_config.db_host,
            port=self.app_config.db_port,
        )

    async def run_add_recipe_background_task(self, recipe_url: str, job_id: int):
        """Background task: scrape a recipe URL and process it into the DB."""
        if self.ingredient_parser is None or self.embedder is None:
            raise RuntimeError("Tasks dependencies not provided")

        conn = None
        try:
            conn = self._get_db_connection()
            pipeline: Pipeline = Pipeline(conn, self.ingredient_parser, self.embedder, self.app_config)
            await pipeline.scrape_process_recipe(recipe_url, job_id)
        except Exception as e:
            print(f"Add Recipe Failed: {e}", flush=True)
        finally:
            if conn:
                conn.close()

    async def run_etl_background_task(self, job_id: int):
        """Background task: run the ETL job (e.g., import REWE recipes)."""
        if self.ingredient_parser is None or self.embedder is None:
            raise RuntimeError("Tasks dependencies not provided")

        conn = None
        try:
            conn = self._get_db_connection()
            pipeline = Pipeline(conn, self.ingredient_parser, self.embedder, self.app_config)
            await pipeline.run_etl(job_id)
        except Exception as e:
            print(f"ETL Job Failed: {e}", flush=True)
        finally:
            if conn:
                conn.close()

    def run_user_embedding_task(self, users: List[UserItem], device: torch.device, _MODEL: torch.nn.Module):
        """
        Synchronous task: encode a batch of user vectors using the UserEncoder model.
        """
        conn = None

        try:
            conn = self._get_db_connection()
            x = np.asarray([u.user_vector for u in users], dtype=np.float32)
            x = torch.from_numpy(x).to(device)

            with torch.inference_mode():
                z = _MODEL(x)
                z_np = z.detach().cpu().numpy()

            with conn.cursor() as cur:
                for i in range(len(users)):
                    user_id = users[i].user_id
                    user_embedding = z_np[i].astype(float).tolist()
                    # Upsert user embedding into the database
                    cur.execute("""
                        INSERT INTO user_embeddings (user_id, embedding)
                        VALUES (%s, %s)
                        ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding
                    """, (user_id, user_embedding))
        except Exception as e:
            print(f"ETL Job Failed: {e}", flush=True)
        finally:
            if conn:
                conn.close()


# Module-level runner to preserve the existing function-based import API.
runner: Optional[Tasks] = None


def init(app_config, ingredient_parser, embedder):
    """Create and register a `Tasks` runner for module-level wrappers."""
    global runner
    runner = Tasks(app_config, ingredient_parser, embedder)


async def run_add_recipe_background_task(recipe_url: str, job_id: int):
    """Wrapper that delegates to the registered `Tasks` instance."""
    if runner is None:
        raise RuntimeError("tasks runner not initialized; call init(...) from app startup")
    return await runner.run_add_recipe_background_task(recipe_url, job_id)


async def run_etl_background_task(job_id: int):
    """Wrapper that delegates to the registered `Tasks` instance."""
    if runner is None:
        raise RuntimeError("tasks runner not initialized; call init(...) from app startup")
    return await runner.run_etl_background_task(job_id)

def run_user_embedding_task(users: List[UserItem], device: torch.device, _MODEL: torch.nn.Module):
    """Wrapper that delegates to the registered `Tasks` instance."""
    if runner is None:
        raise RuntimeError("tasks runner not initialized; call init(...) from app startup")
    return runner.run_user_embedding_task(users, device, _MODEL)
