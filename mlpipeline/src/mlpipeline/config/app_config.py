import os

class AppConfig:
    def __init__(self):
        self.test_mode = os.getenv("TEST_MODE", "false").lower() == "true"

        self.model_path = os.getenv("MODEL_PATH", "src/mlpipeline/ingredient_parser/model-best/model")

        if self.test_mode:
            print("WARNING: Running in TEST MODE! No data will be persisted.")
            return

        if not os.path.exists(self.model_path):
            raise ValueError(f"MODEL_PATH does not exist: {self.model_path}")

        self.debug_mode = os.getenv("DEBUG_MODE", "false").lower() == "true"
        self.max_connections = os.getenv("MAX_CONNECTIONS", "10")

        self.db_name = os.getenv("POSTGRES_DB", "")
        self.db_user = os.getenv("POSTGRES_USER", "")
        self.db_password = os.getenv("POSTGRES_PASSWORD", "")
        self.db_host = os.getenv("POSTGRES_HOST", "localhost")
        self.db_port = os.getenv("POSTGRES_PORT", "5432")
        self.db_ssl_mode = os.getenv("POSTGRES_SSL_MODE", "disable")

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