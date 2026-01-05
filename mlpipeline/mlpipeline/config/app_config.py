class AppConfig:
    # TOOD: Implement the necessary configurations to access the database
    def __init__(self, db_uri: str, debug_mode: bool, max_connections: int):
        self.db_uri = db_uri
        self.debug_mode = debug_mode
        self.max_connections = max_connections

    def __repr__(self):
        return (f"AppConfig(db_uri={self.db_uri}, "
                f"debug_mode={self.debug_mode}, "
                f"max_connections={self.max_connections})")