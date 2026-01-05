import asyncio

import spacy

from mlpipeline.etl.pipeline import Pipeline
import psycopg2
import uvicorn
from fastapi import FastAPI

from mlpipeline.ingredient_parser.parser import IngredientParser

app = FastAPI(title="Recipe Embedding Service")

ingredientParser = IngredientParser(spacy.load('mlpipeline/ingredient_parser/model-best/model'))

with psycopg2.connect(
    dbname="mlpipeline",
    user="mlpipeline_user",
    password="secure_password",
    host="localhost",
    port=5432
) as conn:
    etl_pipeline = Pipeline(conn, ingredientParser)

@app.post("/recipes/add/rewe")
def add_rewe_recipes():
    asyncio.run(etl_pipeline.run_etl())
    return {"status": "Import is in progress!"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)