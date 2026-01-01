# # tests/conftest.py
# import pytest
# from testcontainers.postgres import PostgresContainer
# from fastapi.testclient import TestClient
# from mlpipeline.app import app, get_config # Import your app and config dependency
# from mlpipeline.config.app_config import AppConfig
#
# @pytest.fixture(scope="session")
# def postgres_container():
#     # Uses the official postgres image
#     with PostgresContainer("postgres:15") as postgres:
#         yield postgres
#         # The container is automatically destroyed when tests finish
#
# @pytest.fixture(scope="session")
# def (postgres_container):
#     return AppConfig(
#         db_user=postgres_container.POSTGRES_USER,
#         db_password=postgres_container.POSTGRES_PASSWORD,
#         db_name=postgres_container.POSTGRES_DB,
#         # IMPORTANT: Testcontainers maps the internal port 5432 to a random host port
#         # We must ask the container for the mapped port:
#         db_host=postgres_container.get_container_host_ip(),
#         db_port=postgres_container.get_exposed_port(5432)
#     )

# @pytest.fixture
# def client(test_config):
#     # Override the get_config dependency in the app
#     # This forces the app to talk to the Docker container, not your local DB
#     app.dependency_overrides[get_config] = lambda: test_config
#
#     with TestClient(app) as client:
#         yield client
#
#     # Clean up overrides
#     app.dependency_overrides = {}