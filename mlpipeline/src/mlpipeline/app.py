import logging
import numpy as np
import spacy
import uvicorn
import asyncio
from ollama import AsyncClient
from fastapi import FastAPI

from mlpipeline.config.app_config import AppConfig
from mlpipeline.ingredient_parser.unit_graph import UnitGraph
from mlpipeline.ingredient_parser.parser import IngredientParser
from mlpipeline.embedding.embedder import TextEmbedder
from mlpipeline.api import tasks as api_tasks
from mlpipeline.api import routes

# Initialize FastAPI app
app = FastAPI(title="Recipe Embedding Service")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

# Configuration and global objects
OLLAMA_HOST = "https://ollama.decidish.win"  # TODO: Move to environment/config
MAX_CONCURRENT_REQUESTS = 10
logger = logging.getLogger(__name__)
app_config = AppConfig()
client = AsyncClient(host=OLLAMA_HOST, timeout=30.0)
semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
unit_graph = UnitGraph(app_config.db_connection_string)
ingredient_parser = IngredientParser(client, unit_graph, semaphore)
embedder = TextEmbedder()

# Initialize and inject dependencies into the tasks runner used by routes
api_tasks.init(app_config, ingredient_parser, embedder)

# Register API routers (routes defined in mlpipeline.api.routes)
app.include_router(routes.router)


if __name__ == "__main__":
    uvicorn.run("mlpipeline.app:app", host="0.0.0.0", port=8000, reload=False)