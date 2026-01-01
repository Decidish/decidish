import logging
from typing import AsyncGenerator, Optional

from mlpipeline.embedding.embedder import TextEmbedder
import psycopg2
from minio import Minio, S3Error

from mlpipeline.config.app_config import AppConfig
from mlpipeline.etl.models import Recipe
from mlpipeline.ingredient_parser.parser import IngredientParser, convert_to_float, clean_unit_label


class Pipeline:
    def __init__(self, conn: psycopg2.extensions.connection, parser: IngredientParser, embedder: TextEmbedder, config: AppConfig):
        self.conn = conn
        self.parser = parser
        self.embedder = embedder
        self.config = config
        self.minioClient = Minio(
            config.minio_endpoint,
            access_key=config.minio_access_key,
            secret_key=config.minio_secret_key,
            secure=config.minio_use_ssl
        )


    async def get_minio_batch(self) -> AsyncGenerator[list[str], None]:
        try:
            # This does NOT download the whole file; it opens a connection.
            batch_size = 200
            response = self.minioClient.get_object(self.config.minio_recipes_bucket, self.config.minio_recipes_object_name)

            # The response object acts like an open file handle.
            current_batch = []
            for line in response:
                if line.strip():
                    data_string = line.decode('utf-8')
                    current_batch.append(data_string)
                    if len(current_batch) >= batch_size:
                        yield current_batch
                        current_batch = []

            if current_batch:
                yield current_batch

        except S3Error as err:
            print(f"Minio Error: {err}")
        finally:
            if response:
                response.close()
                response.release_conn()

    def process_recipe(self, line: str) -> tuple[int, Optional[Exception]]:
        try:
            recipe_data = Recipe.model_validate_json(line)
        except Exception as e:
            print(f"Error processing recipe: {e}")
            return -1, e

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
                    self.process_categories(recipe_id, recipe_data.category.split(" "), cursor)

                # Insert ingredients
                self.process_ingredients(recipe_id, recipe_data.ingredients, cursor)
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
    
    def process_ingredients(self, recipe_id: int, ingredients: list[str], cursor):
        try:
            docs = self.parser.process_texts(ingredients)

            for doc in docs:
                qty = None
                unit = None
                name = ""

                for ent in doc.ents:
                    if ent.label_ == "QUANTITY":
                        try:
                            qty = convert_to_float(ent.text)
                        except:
                            # print(ValueError("Could not convert quantity to float", ent.text))
                            continue
                    elif ent.label_ == "UNIT":
                        unit = clean_unit_label(ent.text.strip())
                    elif ent.label_ == "FOOD":
                        name = ent.text

                if qty is None:
                    qty = "1"
                if unit is None:
                    unit = ""

                if name == "":
                    name = doc.text
                name = name.strip()

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
                    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING;
                """, (recipe_id, ingredient_id, qty, unit))
        except Exception as err:
            print(f"Error processing ingredients: {err}")
            raise err

    def process_recipe_batch(self, batch: list[str]) -> list[dict]:
        processed_recipes = []
        for line in batch:
            recipe_id, err = self.process_recipe(line)
            if err is not None:
                raise err
            if recipe_id == -1:
                continue
            processed_recipes.append({
                'id': recipe_id,
                'text': line
                })
        return processed_recipes
        
    def create_recipe_embeddings_batch(self, recipe_data: list[dict]):
        # recipe_data is the list returned from step 1
        
        ids = [item['id'] for item in recipe_data]
        texts = [item['text'] for item in recipe_data]

        try:
            # fastembed returns a generator, convert to list to trigger the batch
            embeddings = list(self.embedder.embed_recipes(texts))
            
            # 3. Zip IDs and Vectors together for the SQL query
            # Format: [(id, vector), (id, vector), ...]
            insert_data = list(zip(ids, embeddings))

            with self.conn.cursor() as cursor:
                # 4. Use executemany for massive speed boost
                # Note: Syntax varies by DB. For Postgres/pgvector it is usually:
                query = "INSERT INTO recipe_embeddings (recipe_id, embedding) VALUES (%s, %s)"
                
                # If using pgvector, you might need to cast to vector: VALUES (%s, %s::vector)
                cursor.executemany(query, insert_data)
            
        except Exception as e:
            logging.error(f"Failed to insert embedding batch: {e}")
            raise e

    async def run_etl(self, job_id: str = "2"):
        processed = 0
        logging.log(logging.INFO, f"Starting ETL Job {job_id}...")

        async for batch in self.get_minio_batch():
            processed_recipes = self.process_recipe_batch(batch)
            self.create_recipe_embeddings_batch(processed_recipes)
            processed += len(batch)
            self.conn.commit()