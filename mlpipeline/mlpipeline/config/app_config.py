import os

class AppConfig:
    def __init__(self):
        self.debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        self.max_connections = os.getenv("MAX_CONNECTIONS", "10")

        self.db_uri = os.getenv("DB_URI", "")

        if self.db_uri == "":
            raise ValueError("DB_URI environment variable is required")

        self.minio_endpoint = os.getenv("MINIO_ENDPOINT", "")

        if self.minio_endpoint == "":
            raise ValueError("MINIO_ENDPOINT environment variable is required")

        self.minio_access_key = os.getenv("MINIO_ACCESS_KEY", "")

        if self.minio_access_key == "":
            raise ValueError("MINIO_ACCESS_KEY environment variable is required")

        self.minio_secret_key = os.getenv("MINIO_SECRET_KEY", "")

        if self.minio_secret_key == "":
            raise ValueError("MINIO_SECRET_KEY environment variable is required")

        self.minio_recipes_bucket = os.getenv("MINIO_RECIPES_BUCKET", "")

        if self.minio_recipes_bucket == "":
            raise ValueError("MINIO_RECIPES_BUCKET environment variable is required")

        self.minio_recipes_object_name = os.getenv("MINIO_RECIPES_OBJECT", "")

        if self.minio_recipes_object_name == "":
            raise ValueError("MINIO_RECIPES_OBJECT environment variable is required")

        self.minio_use_ssl = os.getenv("MINIO_USE_SSL", "false").lower() == "true"