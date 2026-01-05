import json
import logging
from fractions import Fraction
from typing import AsyncGenerator, Optional

import psycopg2
from minio import Minio, S3Error

from mlpipeline.config.app_config import AppConfig
from mlpipeline.etl.models import Recipe
from mlpipeline.ingredient_parser.parser import IngredientParser, convert_to_float, fraction_to_mixed_number


class Pipeline:
    def __init__(self, conn: psycopg2.extensions.connection, parser: IngredientParser, config: AppConfig):
        self.conn = conn
        self.parser = parser
        self.config = config
        self.minioClient = Minio(
            config.minio_endpoint,
            access_key=config.minio_access_key,
            secret_key=config.minio_secret_key,
            secure=config.minio_use_ssl
        )


    async def get_minio_batch(self) -> AsyncGenerator[list[str], None]:

        response = None
        try:
            # This does NOT download the whole file; it opens a connection.
            response = self.minioClient.get_object(self.config.minio_recipes_bucket, self.config.minio_recipes_object_name)

            # The response object acts like an open file handle.
            for line in response:
                if line.strip():
                    try:
                        data = json.loads(line.decode('utf-8'))

                        yield data
                    except json.JSONDecodeError as e:
                        print(f"Skipping invalid JSON line: {e}")

        except S3Error as err:
            print(f"Minio Error: {err}")
        finally:
            if response:
                response.close()
                response.release_conn()

    def process_recipe(self, line: str) -> Optional[Exception]:
        try:
            recipe_data = Recipe.model_validate_json(line)
        except Exception as e:
            print(f"Error processing recipe: {e}")
            return e

        try:
            with self.conn.cursor() as cursor:
                insert_query = """
                INSERT INTO recipes (title, description, instructions, cook_time, prep_time, total_time, image, rating, serving_size, calories, yields)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
                    return None
                
                recipe_id = recipe_id[0]

                # Insert keywords
                self.process_keywords(recipe_id, recipe_data.keywords, cursor)

                # Insert categories
                self.process_categories(recipe_id, [recipe_data.category], cursor)

                # Insert ingredients
                self.process_ingredients(recipe_id, recipe_data.ingredients, cursor)

        except Exception as e:
            print(f"Database insertion error: {e}")   
            raise e

    @staticmethod
    def process_keywords(recipe_id: int, keywords: list[str], cursor):
        for keyword in keywords:
            keyword = keyword.strip()
            if keyword == "":
                continue
            # Insert keyword and get keyword_id
            cursor.execute("""
                WITH ins AS (
                    INSERT INTO keywords (name) VALUES ($1)
                    ON CONFLICT (name) DO NOTHING
                    RETURNING id
                )
                SELECT id FROM ins
                UNION ALL
                SELECT id FROM keywords WHERE name = $1
                LIMIT 1;
            """, (keyword,))
            keyword_id = cursor.fetchone()[0]

            # Insert into recipe_keywords
            cursor.execute("""
                INSERT INTO recipe_keywords (recipe_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;
            """, (recipe_id, keyword_id))

    @staticmethod
    def process_categories(recipe_id: int, categories: list[str], cursor):
        for category in categories:
            category = category.strip()
            if category == "":
                continue
            # Insert category and get category_id
            cursor.execute("""
                WITH ins AS (
                    INSERT INTO categories (name) VALUES ($1)
                    ON CONFLICT (name) DO NOTHING
                    RETURNING id
                )
                SELECT id FROM ins
                UNION ALL
                SELECT id FROM categories WHERE name = $1
                LIMIT 1;
            """, (category,))
            category_id = cursor.fetchone()[0]

            # Insert into recipe_categories
            cursor.execute("""
                INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;
            """, (recipe_id, category_id))
    
    def process_ingredients(self, recipe_id: int, ingredients: list[str], cursor):
        docs = self.parser.process_texts(ingredients)

        for doc in docs:
            qty = None
            unit = None
            name = ""

            for ent in doc.ents:
                if ent.label_ == "QUANTITY":
                    qty = fraction_to_mixed_number(Fraction(ent.text)) 
                elif ent.label_ == "UNIT":
                    unit = ent.text.strip()
                elif ent.label_ == "FOOD":
                    name = ent.text
            
            if qty is None:
                qty = "1"
            if unit is None:
                unit = ""
            name = name.strip()

            cursor.execute("""
                WITH ins AS (
                    INSERT INTO ingredients (name) VALUES ($1)
                    ON CONFLICT (name) DO NOTHING
                    RETURNING id
                )
                SELECT id FROM ins
                UNION ALL
                SELECT id FROM ingredients WHERE name = $1
                LIMIT 1;
            """, (name,))
            ingredient_id = cursor.fetchone()[0]

            cursor.execute("""
                INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;
            """, (recipe_id, ingredient_id, convert_to_float(qty), unit))

    def process_recipe_batch(self, batch: list[str]):
        for line in batch:
            self.process_recipe(line)
        

    @staticmethod
    def update_job_status(job_id: str, progress: float, status: str):
        # TODO: Implement process bar for a job
        if progress is not None:
            print(f"Job {job_id} progress updated to {progress:.2f}%")
        if status is not None:
            print(f"Job {job_id} status updated to {status}")

    async def run_etl(self, job_id: str = "2"):
        processed = 0
        logging.log(logging.INFO, f"Starting ETL Job {job_id}...")

        async for batch in self.get_minio_batch():
            self.process_recipe_batch(batch)
            processed += len(batch)