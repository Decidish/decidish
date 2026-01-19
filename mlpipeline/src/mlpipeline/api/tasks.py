import psycopg2
from mlpipeline.etl.pipeline import Pipeline
from typing import Optional


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
