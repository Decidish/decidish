import logging
import os
from typing import Generator, Optional

import torch

from mlpipeline.embedding.embedder import TextEmbedder
import psycopg2
from pgvector.psycopg2 import register_vector

from mlpipeline.config.app_config import AppConfig
from mlpipeline.etl.models import BaseRecipe, Ingredient, ProcessedRecipe, RawRecipe
from mlpipeline.ingredient_parser.parser import IngredientParser
from mlpipeline.scraper.recipe_scraper import scrape_recipe
from mlpipeline.pretrain.rewrite_recipe_embedding import RecipeHeadConfig, load_recipe_head


class Pipeline:
    def __init__(self, conn: psycopg2.extensions.connection, parser: IngredientParser, embedder: TextEmbedder, config: AppConfig):
        self.conn = conn
        self.parser = parser
        self.embedder = embedder
        self.config = config
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        CKPT_PATH = os.getenv("ADAPTER_CKPT_DIR", "")

        if CKPT_PATH == "":
            raise Exception("ADAPTER_CKPT_DIR path not set")

        cfg = RecipeHeadConfig(output_dim=384, hidden_dim=512, num_layers=3, dropout=0.1)
        self.mlp_model = load_recipe_head(str(CKPT_PATH), cfg, device=self.device)
        # Register pgvector support with psycopg2
        register_vector(conn)

    async def scrape_process_recipe(self, recipe_url: str, job_id: int):
        try:
            self.set_running_job_status(job_id)

            recipe_json = scrape_recipe(recipe_url)
            
            print(recipe_json, flush=True)
            recipe_data = RawRecipe.model_validate_json(recipe_json)
            recipe_id, err = await self.process_recipe(recipe_data)

            if recipe_id == -1:
                raise Exception("Recipe already exists in the database. Or could not be inserted.")

            self.create_recipe_embeddings_batch([{
                'id': recipe_id,
                'text': recipe_json
            }])
            if err is not None:
                raise err
            
            self.set_done_job_status(job_id)
        except Exception as e:
            logging.error(f"ETL Job {job_id} failed: {e}")
            self.set_error_job_status(job_id)
            raise e

    async def process_recipe(self, recipe_data: BaseRecipe) -> tuple[int, Optional[Exception]]:
        try:
            with self.conn.cursor() as cursor:
                insert_query = """
                INSERT INTO recipes (title, description, instructions, cook_time, prep_time, total_time, image, rating, serving_size, calories, yields)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (title) DO NOTHING
                RETURNING id;
                """

                cursor.execute(insert_query, (
                    recipe_data.title,
                    recipe_data.description,
                    recipe_data.instructions,
                    recipe_data.cook_time,
                    recipe_data.prep_time,
                    recipe_data.total_time,
                    recipe_data.image,
                    recipe_data.ratings,
                    recipe_data.nutrients.serving_size,
                    recipe_data.nutrients.calories,
                    recipe_data.yields
                ))
                recipe_id = cursor.fetchone()
        
                if recipe_id is None:
                    print(f"Recipe '{recipe_data.title}' already exists. Skipping insertion.")
                    return -1, None
                
                recipe_id = recipe_id[0]

                # Insert keywords
                if recipe_data.keywords:
                    self.process_keywords(recipe_id, recipe_data.keywords, cursor)

                # Insert categories
                if recipe_data.category:
                    self.process_categories(recipe_id, recipe_data.category.split(","), cursor)

                if isinstance(recipe_data, ProcessedRecipe):
                    for ingredient in recipe_data.ingredients:
                        self.import_processed_ingredient(recipe_id, ingredient, cursor)
                else:
                    await self.process_ingredients(recipe_id, recipe_data.ingredients, cursor)

                return recipe_id, None
        except Exception as e:
            print(f"Database insertion error: {e}")   
            raise e

    @staticmethod
    def process_keywords(recipe_id: int, keywords: list[str], cursor):
        try:
            for keyword in keywords:
                keyword = keyword.strip()
                if keyword == "":
                    continue
                # Insert keyword and get keyword_id
                cursor.execute("""
                    WITH ins AS (
                        INSERT INTO keywords (name) VALUES (%s)
                        ON CONFLICT (name) DO NOTHING
                        RETURNING id
                    )
                    SELECT id FROM ins
                    UNION ALL
                    SELECT id FROM keywords WHERE name = %s
                    LIMIT 1;
                """, (keyword, keyword))
                keyword_id = cursor.fetchone()[0]

                # Insert into recipe_keywords
                cursor.execute("""
                    INSERT INTO recipe_keywords (recipe_id, keyword_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;
                """, (recipe_id, keyword_id))
        except Exception as err:
            print(f"Error processing keywords: {err}")
            raise err

    @staticmethod
    def process_categories(recipe_id: int, categories: list[str], cursor):
        try:
            for category in categories:
                category = category.strip()
                if category == "":
                    continue
                # Insert category and get category_id
                cursor.execute("""
                    WITH ins AS (
                        INSERT INTO categories (name) VALUES (%s)
                        ON CONFLICT (name) DO NOTHING
                        RETURNING id
                    )
                    SELECT id FROM ins
                    UNION ALL
                    SELECT id FROM categories WHERE name = %s
                    LIMIT 1;
                """, (category,category))
                category_id = cursor.fetchone()[0]

                # Insert into recipe_categories
                cursor.execute("""
                    INSERT INTO recipe_categories (recipe_id, category_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;
                """, (recipe_id, category_id))
        except Exception as err:
            print(f"Error processing categories: {err}")
            raise err
    
    async def process_ingredients(self, recipe_id: int, ingredients: list[str], cursor):
        """
        Processes raw ingredient strings and imports them into the database.
        Batches in groups of 10 to optimize API calls.
        """
        batch_size = 10
        for i in range(0, len(ingredients), batch_size):
            batch = ingredients[i:i + batch_size]
            parsed = await self.parser.parse_ingredients(batch)
            for ingredient in parsed:
                self.import_processed_ingredient(recipe_id, ingredient, cursor)

    def import_processed_ingredient(self, recipe_id: int, ingredient: Ingredient, cursor):
        """
        Imports already processed ingredients into the database.
        """
        qty = ingredient.amount
        unit = ingredient.unit
        name = ingredient.food
        original = ingredient.original
        info = ingredient.info

        cursor.execute("""
                        WITH ins AS (
                            INSERT INTO ingredients (name) VALUES (%s)
                            ON CONFLICT (name) DO NOTHING
                            RETURNING id
                        )
                        SELECT id FROM ins
                        UNION ALL
                        SELECT id FROM ingredients WHERE name = %s
                        LIMIT 1;
                    """, (name, name))
        
        ingredient_id = cursor.fetchone()[0]

        cursor.execute("""
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, original, info) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING;
        """, (recipe_id, ingredient_id, qty, unit, original, info))

    def set_error_job_status(self, job_id: int):
        """
        Sets the job status to 'error' in the database.
        """
        with self.conn.cursor() as cursor:
            cursor.execute("UPDATE jobs SET status = 'error' WHERE id = %s;", (job_id,))
            self.conn.commit()

    def set_running_job_status(self, job_id: int):
        """
        Sets the job status to 'processing' in the database.
        """
        with self.conn.cursor() as cursor:
            cursor.execute("UPDATE jobs SET status = 'processing' WHERE id = %s;", (job_id,))
            self.conn.commit()
    
    def set_done_job_status(self, job_id: int):
        """
        Sets the job status to 'success' in the database.
        """
        with self.conn.cursor() as cursor:
            cursor.execute("UPDATE jobs SET status = 'success' WHERE id = %s;", (job_id,))
            self.conn.commit()

    ############################################################################
    # ETL Pipeline for REWE Recipes done only once
    ############################################################################
    # ... existing imports ...

    # Helper method to update progress
    def update_job_progress(self, job_id: int, processed: int, total: int):
        try:
            with self.conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE jobs 
                    SET processed_items = %s, total_items = %s, updated_at = NOW() 
                    WHERE id = %s;
                """, (processed, total, job_id))
                self.conn.commit()
        except Exception as e:
            logging.error(f"Failed to update progress for job {job_id}: {e}")

    async def run_etl(self, job_id: int):
        try:
            logging.info(f"Starting ETL Job {job_id}...")
            self.set_running_job_status(job_id)

            # 1. Estimate total (e.g., counting lines in file)
            # For efficiency, you can hardcode this or run a quick line count
            total_recipes = 0
            with open("data/recipes_enriched.jsonl", 'rb') as f:
                total_recipes = sum(1 for _ in f)
            
            processed_count = 0
            self.update_job_progress(job_id, 0, total_recipes)

            # 2. Process Batch
            for batch in self.get_rewe_recipes_batch("data/recipes_enriched.jsonl"):
                processed_recipes = await self.process_recipe_batch(batch)
                self.create_recipe_embeddings_batch(processed_recipes)
                
                # 3. Update Progress
                processed_count += len(batch)
                self.update_job_progress(job_id, processed_count, total_recipes)

            self.set_done_job_status(job_id)
            logging.info(f"Finished ETL Job {job_id}...")
        except Exception as e:
            logging.error(f"ETL Job {job_id} failed: {e}")
            self.set_error_job_status(job_id)
            raise e

    def create_recipe_embeddings_batch(self, recipe_data: list[dict]):
        # recipe_data is the list returned from step 1
        
        ids = [item['id'] for item in recipe_data]
        texts = [item['text'] for item in recipe_data]

        try:
            # base embeddings
            base_embeddings = self.embedder.embed_recipes(texts)

            # Convert numpy -> torch tensor
            with torch.no_grad():
                x_tensor = torch.tensor(base_embeddings, dtype=torch.float32, device=self.device)
                
                # Pass through the MLP model
                mlp_output = self.mlp_model(x_tensor)
                
                # Convert back to list for database insertion
                mlp_embeddings = mlp_output.detach().cpu().tolist()

            # Format: [(id, [base_vector], [mlp_vector]), ...]
            insert_data = [
                (id, mlp) 
                for id, mlp in zip(ids, mlp_embeddings)
            ]

            with self.conn.cursor() as cursor:
                # Update query to include embedding_mlp
                query = """
                    INSERT INTO recipe_embeddings (recipe_id, embedding) 
                    VALUES (%s, %s::vector, %s::vector) 
                    ON CONFLICT (recipe_id) DO NOTHING
                """
                # Note: Changed 'DO NOTHING' to 'DO UPDATE' so re-running this updates old values.
                # If you prefer keeping old values, switch back to DO NOTHING.
                
                cursor.executemany(query, insert_data)
                self.conn.commit()
            
        except Exception as e:
            logging.error(f"Failed to insert embedding batch: {e}")
            self.conn.rollback() # Good practice to rollback on error
            raise e

    async def process_recipe_batch(self, batch: list[str]) -> list[dict]:
        processed_recipes = []
        for line in batch:
            try:
                recipe_data = ProcessedRecipe.model_validate_json(line)
            except Exception as e:
                logging.error(f"Error processing recipe: {e}")
                continue
            recipe_id, err = await self.process_recipe(recipe_data)
            if err is not None:
                raise err
            if recipe_id == -1:
                continue
            processed_recipes.append({
                'id': recipe_id,
                'text': line
                })
        return processed_recipes
    
    def get_rewe_recipes_batch(self, path_to_recipes: str) -> Generator[list[str], None, None]:
        """
        Generator that yields batches of recipe data from MinIO.
        """
        # This does NOT download the whole file; it opens a connection.
        batch_size = 1000
        with open(path_to_recipes, 'rb') as f:
            batch = []
            for line in f:
                batch.append(line.decode('utf-8'))
                if len(batch) >= batch_size:
                    yield batch
                    batch = []
            if batch:
                yield batch