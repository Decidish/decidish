import os

from fastapi.testclient import TestClient
from unittest.mock import patch

os.environ["TEST_MODE"] = "true"

from mlpipeline.app import app

# TODO: Actual integration test
client = TestClient(app)

def test_add_rewe_recipes_endpoint():
    """
    Test that the endpoint returns 200 OK and triggers the background task.
    We MOCK the actual ETL function so we don't touch the real database.
    """

    with patch("mlpipeline.app.run_etl_background_task") as mock_etl_task:

        response = client.post("/recipes/add/rewe", json={"job_id": 123})

        assert response.status_code == 200
        assert response.json() == {"status": "Import started"}

        mock_etl_task.assert_called_once()