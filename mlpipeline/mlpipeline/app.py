import logging

import psycopg2
import spacy
import uvicorn
from fastapi import FastAPI, BackgroundTasks

from mlpipeline.config.app_config import AppConfig
from mlpipeline.etl.pipeline import Pipeline
from mlpipeline.ingredient_parser.parser import IngredientParser

app = FastAPI(title="Recipe Embedding Service")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

app_config = AppConfig()

nlp_model = spacy.load(app_config.model_path)
ingredient_parser = IngredientParser(nlp_model)

def get_db_connection():
    return psycopg2.connect(
        dbname=app_config.db_name,
        user=app_config.db_user,
        password=app_config.db_password,
        host=app_config.db_host,
        port=app_config.db_port
    )

async def run_etl_background_task():
    print("Starting background ETL task for REWE Recipes", flush=True)
    """
    Wrapper to handle the DB connection lifecycle for the background task.
    """
    conn = None
    try:
        conn = get_db_connection()

        pipeline = Pipeline(conn, ingredient_parser, app_config)

        print("Starting ETL job", flush=True)
        await pipeline.run_etl()

        print("Finished ETL Job for REWE Recipes", flush=True)
    except Exception as e:
        print(f"ETL Job Failed: {e}", flush=True)
    finally:
        if conn:
            conn.close()

@app.post("/recipes/add/rewe")
async def add_rewe_recipes(
        background_tasks: BackgroundTasks,
):
    # Now you can use 'config.db_user' etc. inside here
    # background_tasks.add_task(run_etl_background_task)
    await run_etl_background_task()
    return {"status": "Import started"}

if __name__ == "__main__":
    uvicorn.run("mlpipeline.app:app", host="0.0.0.0", port=8000, reload=False)