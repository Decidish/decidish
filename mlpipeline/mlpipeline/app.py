import os
from contextlib import asynccontextmanager
from typing import List

import asyncpg
import uvicorn
from fastapi import FastAPI, HTTPException
from pgvector.asyncpg import register_vector
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

# GLOBAL VARIABLES
ml_models = {}
db_pool = None

# DATABASE CONFIG
DB_DSN = os.getenv("DATABASE_URL", "postgresql://user:1234@localhost:5433/decidish")

@asynccontextmanager
async def lifespan(app):
    print("Startup: Loading resources...")

    try:
        ml_models["embedding_model"] = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        print("AI Model Ready!")
    except Exception as e:
        print(f"Failed to load AI model: {e}")

    # 2. Connect to Database
    try:
        async def init_connection(conn):
            # This is the line that registers the adapter on the async connection
            await register_vector(conn)

        global db_pool
        db_pool = await asyncpg.create_pool(DB_DSN, min_size=1, max_size=10, init=init_connection)

        print("Database Connected")
    except Exception as e:
        print(f"Failed to connect to DB: {e}")
        exit(1)

    yield

    # Shutdown
    if db_pool:
        await db_pool.close()
    ml_models.clear()

app = FastAPI(title="Recipe Embedding Service", lifespan=lifespan)

class EmbedRequest(BaseModel):
    recipe_ids: List[int]
    recipe_strs: List[str]

@app.post("/process_batch")
async def process_batch(request: EmbedRequest):
    model = ml_models.get("embedding_model")
    if not model or not db_pool:
        raise HTTPException(status_code=503, detail="System not ready")

    try:
        vectors = model.encode(request.recipe_strs, convert_to_numpy=True).tolist()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Generation failed: {e}")

    data_pairs = list(zip(request.recipe_ids, vectors))

    try:
        async with db_pool.acquire() as conn:
            query = """
                    INSERT INTO recipe_embeddings (recipe_id, embedding)
                    VALUES ($1, $2)
                    """

            await conn.executemany(query, data_pairs)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {e}")

    return {
        "status": "success",
        "processed_count": len(vectors),
        "target_table": "recipe_embeddings"
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)