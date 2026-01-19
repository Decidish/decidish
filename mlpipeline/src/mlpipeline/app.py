import logging

import psycopg2
from pydantic import BaseModel
from mlpipeline.embedding.embedder import TextEmbedder
import spacy
import uvicorn
from fastapi import FastAPI, BackgroundTasks

from mlpipeline.etl.pipeline import Pipeline
from mlpipeline.ingredient_parser.parser import IngredientParser

from mlpipeline.config.app_config import AppConfig

from mlpipeline.ingredient_parser.unit_graph import UnitGraph
import asyncio
from ollama import AsyncClient
from pydantic import BaseModel

app = FastAPI(title="Recipe Embedding Service")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

# TODO: Change this to environment variable inside configs
OLLAMA_HOST = "https://ollama.decidish.win" # Ensure this points to your GPU instance
MODEL = "llama3.1:8b" # GPU recommended: 8B is smarter and fast on GPU.

# GPU TUNING
# For now single recipes at a time to avoid OOMs.
RECIPE_BATCH_SIZE = 1
# We allow many more in-flight requests to saturate the OLLAMA_NUM_PARALLEL slots
MAX_CONCURRENT_REQUESTS = 10

logger = logging.getLogger(__name__)

app_config = AppConfig()

client = AsyncClient(host=OLLAMA_HOST, timeout=30.0) # Faster timeout for GPU
semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

nlp_model = spacy.load(app_config.model_path)
unit_graph = UnitGraph(app_config.db_connection_string)
ingredient_parser = IngredientParser(client, unit_graph, semaphore)
embedder = TextEmbedder()

def get_db_connection():
    return psycopg2.connect(
        dbname=app_config.db_name,
        user=app_config.db_user,
        password=app_config.db_password,
        host=app_config.db_host,
        port=app_config.db_port
    )

# Scrape the given recipe URL and add it to the database in a background task
async def run_add_recipe_background_task(recipe_url: str, job_id: int):
    print("Starting background task to add a recipe", flush=True)
    """
    Wrapper to handle the DB connection lifecycle for the background task.
    """
    conn = None
    try:
        conn = get_db_connection()

        pipeline: Pipeline = Pipeline(conn, ingredient_parser, embedder, app_config)

        print("Starting to add recipe", flush=True)
        await pipeline.scrape_process_recipe(recipe_url, job_id)
        print("Finished adding recipe", flush=True)
    except Exception as e:
        print(f"Add Recipe Failed: {e}", flush=True)
    finally:
        if conn:
            conn.close()


async def run_etl_background_task(job_id: int):
    print("Starting background ETL task for REWE Recipes", flush=True)
    """
    Wrapper to handle the DB connection lifecycle for the background task.
    """
    conn = None
    try:
        conn = get_db_connection()

        pipeline = Pipeline(conn, ingredient_parser, embedder, app_config)

        print("Starting ETL job", flush=True)
        await pipeline.run_etl(job_id)

        print("Finished ETL Job for REWE Recipes", flush=True)
    except Exception as e:
        print(f"ETL Job Failed: {e}", flush=True)
    finally:
        if conn:
            conn.close()

class AddRecipeRequest(BaseModel):
    recipe_url: str
    job_id: int

# Create background task!
@app.post("/recipes/add")
async def add_recipe(
    background_tasks: BackgroundTasks,
    request: AddRecipeRequest
):
    background_tasks.add_task(run_add_recipe_background_task, request.recipe_url, request.job_id)
    return {"status": "Recipe addition started"}

class AddReweRecipesRequest(BaseModel):
    job_id: int

@app.post("/recipes/add/rewe")
async def add_rewe_recipes(
        background_tasks: BackgroundTasks,
        request: AddReweRecipesRequest
):
    background_tasks.add_task(run_etl_background_task, request.job_id)
    return {"status": "Import started"}

if __name__ == "__main__":
    uvicorn.run("mlpipeline.app:app", host="0.0.0.0", port=8000, reload=False)