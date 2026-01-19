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
        self.db_connection_string = os.getenv("DATABASE_BACKEND_CONNECTION_STRING", "")

        if not self.db_connection_string:
            raise ValueError("DATABASE_BACKEND_CONNECTION_STRING environment variable is not set.")

        if not all([self.db_name, self.db_user, self.db_password]):
            raise ValueError("Database configuration is incomplete. Please set POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD environment variables.")