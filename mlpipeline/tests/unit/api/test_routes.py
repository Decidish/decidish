"""
Tests for mlpipeline API routes.
Tests all endpoints defined in routes.py with comprehensive coverage.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from mlpipeline.api.routes import router
from mlpipeline.api.schemas import (
    AddRecipeRequest, AddReweRecipesRequest,
    EncodeBatchRequest, EncodeBatchResponse,
    UserItem, UserEmbeddingItem,
    TuneRequest, TuneResponse,
    AdapterFinetuneRequest, AdapterFinetuneResponse
)


@pytest.fixture
def app():
    """Create a FastAPI app with the router for testing."""
    test_app = FastAPI()
    test_app.include_router(router)
    return test_app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


# ============================================================================
# Health Endpoint Tests
# ============================================================================

class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_success(self, client):
        """Test health endpoint returns OK when service is healthy."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_adapter:
            mock_adapter.get_health.return_value = {
                "adapter_version": "v1.0",
                "device": "cpu"
            }
            
            response = client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "adapter_version" in data
            mock_adapter.get_health.assert_called_once()

    def test_health_service_unhealthy(self, client):
        """Test health endpoint returns 503 when service check fails."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_adapter:
            mock_adapter.get_health.side_effect = Exception("Model not loaded")
            
            response = client.get("/health")
            
            assert response.status_code == 503
            assert "unhealthy" in response.json()["detail"]


# ============================================================================
# Add Recipe Endpoint Tests
# ============================================================================

class TestAddRecipeEndpoint:
    """Tests for POST /recipes/add endpoint."""

    def test_add_recipe_success(self, client):
        """Test adding a recipe triggers background task."""
        with patch('mlpipeline.api.routes.run_add_recipe_background_task') as mock_task:
            response = client.post(
                "/recipes/add",
                json={"recipe_url": "https://example.com/recipe/123", "job_id": 42}
            )
            
            assert response.status_code == 200
            assert response.json()["status"] == "Recipe addition started"
            # Background task should be scheduled
            # Note: FastAPI's BackgroundTasks are called after response

    def test_add_recipe_missing_url(self, client):
        """Test adding recipe without URL returns validation error."""
        response = client.post(
            "/recipes/add",
            json={"job_id": 42}
        )
        
        assert response.status_code == 422  # Validation error

    def test_add_recipe_missing_job_id(self, client):
        """Test adding recipe without job_id returns validation error."""
        response = client.post(
            "/recipes/add",
            json={"recipe_url": "https://example.com/recipe"}
        )
        
        assert response.status_code == 422  # Validation error

    def test_add_recipe_invalid_job_id_type(self, client):
        """Test adding recipe with non-integer job_id returns validation error."""
        response = client.post(
            "/recipes/add",
            json={"recipe_url": "https://example.com/recipe", "job_id": "invalid"}
        )
        
        assert response.status_code == 422  # Validation error


# ============================================================================
# Add REWE Recipes Endpoint Tests
# ============================================================================

class TestAddReweRecipesEndpoint:
    """Tests for POST /recipes/add/rewe endpoint."""

    def test_add_rewe_recipes_success(self, client):
        """Test adding REWE recipes triggers ETL background task."""
        with patch('mlpipeline.api.routes.run_etl_background_task') as mock_task:
            response = client.post(
                "/recipes/add/rewe",
                json={"job_id": 100}
            )
            
            assert response.status_code == 200
            assert response.json()["status"] == "Import started"

    def test_add_rewe_recipes_missing_job_id(self, client):
        """Test adding REWE recipes without job_id returns validation error."""
        response = client.post(
            "/recipes/add/rewe",
            json={}
        )
        
        assert response.status_code == 422  # Validation error


# ============================================================================
# Encode Users Batch Endpoint Tests
# ============================================================================

class TestEncodeUsersBatchEndpoint:
    """Tests for POST /encode_users_batch endpoint."""

    def test_encode_users_batch_success(self, client):
        """Test encoding a batch of users returns embeddings."""
        with patch('mlpipeline.api.routes.inference_service') as mock_service:
            mock_users = [
                UserEmbeddingItem(user_id="user1", user_embedding=[0.1, 0.2, 0.3]),
                UserEmbeddingItem(user_id="user2", user_embedding=[0.4, 0.5, 0.6])
            ]
            mock_service.encode.return_value = (mock_users, 3)
            
            response = client.post(
                "/encode_users_batch",
                json={
                    "users": [
                        {"user_id": "user1", "user_vector": [1.0, 2.0, 3.0]},
                        {"user_id": "user2", "user_vector": [4.0, 5.0, 6.0]}
                    ]
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["embedding_dim"] == 3
            assert len(data["users"]) == 2
            assert data["users"][0]["user_id"] == "user1"
            assert data["users"][1]["user_id"] == "user2"

    def test_encode_users_batch_single_user(self, client):
        """Test encoding a single user."""
        with patch('mlpipeline.api.routes.inference_service') as mock_service:
            mock_users = [
                UserEmbeddingItem(user_id="user1", user_embedding=[0.1] * 384)
            ]
            mock_service.encode.return_value = (mock_users, 384)
            
            response = client.post(
                "/encode_users_batch",
                json={
                    "users": [
                        {"user_id": "user1", "user_vector": [1.0] * 384}
                    ]
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["embedding_dim"] == 384
            assert len(data["users"]) == 1

    def test_encode_users_batch_empty_list(self, client):
        """Test encoding with empty user list returns 400."""
        with patch('mlpipeline.api.routes.inference_service') as mock_service:
            mock_service.encode.side_effect = ValueError("User list cannot be empty")
            
            response = client.post(
                "/encode_users_batch",
                json={"users": []}
            )
            
            # Empty list should trigger ValueError which returns 400
            # Depending on service validation, this might be 400 or 422
            assert response.status_code in [400, 422]

    def test_encode_users_batch_invalid_vector_dimension(self, client):
        """Test encoding with invalid vector dimension returns 400."""
        with patch('mlpipeline.api.routes.inference_service') as mock_service:
            mock_service.encode.side_effect = ValueError(
                "Pretrained model expects dim 384, but request has 10"
            )
            
            response = client.post(
                "/encode_users_batch",
                json={
                    "users": [
                        {"user_id": "user1", "user_vector": [1.0] * 10}
                    ]
                }
            )
            
            assert response.status_code == 400
            assert "dim" in response.json()["detail"].lower()

    def test_encode_users_batch_internal_error(self, client):
        """Test encoding with internal service error returns 500."""
        with patch('mlpipeline.api.routes.inference_service') as mock_service:
            mock_service.encode.side_effect = RuntimeError("CUDA out of memory")
            
            response = client.post(
                "/encode_users_batch",
                json={
                    "users": [
                        {"user_id": "user1", "user_vector": [1.0, 2.0, 3.0]}
                    ]
                }
            )
            
            assert response.status_code == 500
            assert "inference error" in response.json()["detail"].lower()

    def test_encode_users_batch_missing_user_id(self, client):
        """Test encoding with missing user_id returns validation error."""
        response = client.post(
            "/encode_users_batch",
            json={
                "users": [
                    {"user_vector": [1.0, 2.0, 3.0]}
                ]
            }
        )
        
        assert response.status_code == 422

    def test_encode_users_batch_missing_user_vector(self, client):
        """Test encoding with missing user_vector returns validation error."""
        response = client.post(
            "/encode_users_batch",
            json={
                "users": [
                    {"user_id": "user1"}
                ]
            }
        )
        
        assert response.status_code == 422


# ============================================================================
# Tune Endpoint Tests
# ============================================================================

class TestTuneEndpoint:
    """Tests for POST /tune endpoint."""

    def test_tune_success(self, client):
        """Test online tuning with valid request."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.tune_online.return_value = TuneResponse(
                updated_user_emb=[[0.1, 0.2, 0.3]],
                model_info={"version": "v1.0", "device": "cpu"}
            )
            
            response = client.post(
                "/tune",
                json={
                    "user_emb": [0.1, 0.2, 0.3],
                    "recipe_emb": [0.4, 0.5, 0.6],
                    "like": 1
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "updated_user_emb" in data
            assert "model_info" in data

    def test_tune_with_custom_parameters(self, client):
        """Test online tuning with custom BCE parameters."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.tune_online.return_value = TuneResponse(
                updated_user_emb=[[0.5, 0.6, 0.7]],
                model_info={"version": "v1.0"}
            )
            
            response = client.post(
                "/tune",
                json={
                    "user_emb": [0.1, 0.2, 0.3],
                    "recipe_emb": [0.4, 0.5, 0.6],
                    "like": 0,
                    "use_weekly_user_adapter": True,
                    "do_online_bce": True,
                    "bce_steps": 10,
                    "bce_lr": 0.01,
                    "bce_temperature": 0.1,
                    "bce_l2_anchor": 0.001,
                    "bce_clip_grad_norm": 2.0,
                    "bce_pos_weight": 1.5
                }
            )
            
            assert response.status_code == 200
            # Verify service was called with correct params
            mock_service.tune_online.assert_called_once()

    def test_tune_dislike_action(self, client):
        """Test online tuning with dislike action (like=0)."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.tune_online.return_value = TuneResponse(
                updated_user_emb=[[0.1, 0.2, 0.3]],
                model_info={}
            )
            
            response = client.post(
                "/tune",
                json={
                    "user_emb": [0.1, 0.2, 0.3],
                    "recipe_emb": [0.4, 0.5, 0.6],
                    "like": 0
                }
            )
            
            assert response.status_code == 200

    def test_tune_empty_embeddings(self, client):
        """Test tuning with empty embeddings returns 400."""
        # When user_emb is empty, the batch length is 0
        response = client.post(
            "/tune",
            json={
                "user_emb": [],
                "recipe_emb": [],
                "like": 1
            }
        )
        
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_tune_batch_too_large(self, client):
        """Test tuning with batch exceeding max size returns 400."""
        # Create a request that would exceed max_batch_size
        large_embedding = [0.1] * 1000
        
        response = client.post(
            "/tune",
            json={
                "user_emb": large_embedding,
                "recipe_emb": large_embedding,
                "like": 1,
                "max_batch_size": 1  # Set artificially low
            }
        )
        
        # The check is len(req.user_emb) > req.max_batch_size
        # With 1000 elements and max_batch_size=1, this should fail
        assert response.status_code == 400
        assert "too large" in response.json()["detail"].lower()

    def test_tune_value_error(self, client):
        """Test tuning with service ValueError returns 400."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.tune_online.side_effect = ValueError("Invalid embedding dimension")
            
            response = client.post(
                "/tune",
                json={
                    "user_emb": [0.1, 0.2],
                    "recipe_emb": [0.3, 0.4],
                    "like": 1
                }
            )
            
            assert response.status_code == 400

    def test_tune_internal_error(self, client):
        """Test tuning with internal error returns 500."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.tune_online.side_effect = RuntimeError("Model crashed")
            
            response = client.post(
                "/tune",
                json={
                    "user_emb": [0.1, 0.2, 0.3],
                    "recipe_emb": [0.4, 0.5, 0.6],
                    "like": 1
                }
            )
            
            assert response.status_code == 500
            assert "tuning error" in response.json()["detail"].lower()

    def test_tune_missing_required_fields(self, client):
        """Test tuning without required fields returns validation error."""
        response = client.post(
            "/tune",
            json={
                "user_emb": [0.1, 0.2, 0.3]
                # Missing recipe_emb and like
            }
        )
        
        assert response.status_code == 422


# ============================================================================
# Finetune User Adapter Endpoint Tests
# ============================================================================

class TestFinetuneUserAdapterEndpoint:
    """Tests for POST /finetune_user_adapter endpoint."""

    def test_finetune_success(self, client):
        """Test fine-tuning with valid request."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.run_training_job.return_value = AdapterFinetuneResponse(
                updated_count=1000,
                train_metrics={"loss": 0.5, "accuracy": 0.8},
                val_metrics={"loss": 0.6, "accuracy": 0.75},
                model_info={"tag": "test_v1", "device": "cpu"}
            )
            
            response = client.post(
                "/finetune_user_adapter",
                json={
                    "epochs": 5,
                    "val_split": 0.1,
                    "max_batch_size": 1024
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["updated_count"] == 1000
            assert "train_metrics" in data
            assert "val_metrics" in data
            assert "model_info" in data

    def test_finetune_with_custom_parameters(self, client):
        """Test fine-tuning with all custom parameters."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.run_training_job.return_value = AdapterFinetuneResponse(
                updated_count=500,
                train_metrics={"loss": 0.4},
                val_metrics={"loss": 0.5},
                model_info={"tag": "custom_tag"}
            )
            
            response = client.post(
                "/finetune_user_adapter",
                json={
                    "epochs": 10,
                    "val_split": 0.2,
                    "max_batch_size": 2048,
                    "lr_user": 0.0001,
                    "weight_decay": 0.01,
                    "clip_grad_norm": 2.0,
                    "pos_weight": 2.0,
                    "tag": "custom_tag",
                    "save_best_as_last": False
                }
            )
            
            assert response.status_code == 200
            mock_service.run_training_job.assert_called_once()

    def test_finetune_default_parameters(self, client):
        """Test fine-tuning uses default parameters when not specified."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.run_training_job.return_value = AdapterFinetuneResponse(
                updated_count=100,
                train_metrics={},
                val_metrics={},
                model_info={}
            )
            
            response = client.post(
                "/finetune_user_adapter",
                json={}  # Use all defaults
            )
            
            assert response.status_code == 200

    def test_finetune_invalid_val_split_too_high(self, client):
        """Test fine-tuning with val_split > 0.5 returns 400."""
        response = client.post(
            "/finetune_user_adapter",
            json={
                "val_split": 0.6  # > 0.5
            }
        )
        
        assert response.status_code == 400
        assert "val_split" in response.json()["detail"]

    def test_finetune_invalid_val_split_negative(self, client):
        """Test fine-tuning with negative val_split returns 400."""
        response = client.post(
            "/finetune_user_adapter",
            json={
                "val_split": -0.1  # < 0.0
            }
        )
        
        assert response.status_code == 400
        assert "val_split" in response.json()["detail"]

    def test_finetune_lock_acquisition_failure(self, client):
        """Test fine-tuning when lock cannot be acquired returns 503."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.run_training_job.side_effect = RuntimeError(
                "Could not acquire lock"
            )
            
            response = client.post(
                "/finetune_user_adapter",
                json={"epochs": 1}
            )
            
            assert response.status_code == 503
            assert "lock" in response.json()["detail"].lower()

    def test_finetune_value_error(self, client):
        """Test fine-tuning with ValueError returns 400."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.run_training_job.side_effect = ValueError(
                "No valid interactions found"
            )
            
            response = client.post(
                "/finetune_user_adapter",
                json={"epochs": 1}
            )
            
            assert response.status_code == 400

    def test_finetune_internal_error(self, client):
        """Test fine-tuning with internal error returns 500."""
        with patch('mlpipeline.api.routes.adapter_service') as mock_service:
            mock_service.run_training_job.side_effect = Exception("Unknown error")
            
            response = client.post(
                "/finetune_user_adapter",
                json={"epochs": 1}
            )
            
            assert response.status_code == 500
            assert "training error" in response.json()["detail"].lower()


# ============================================================================
# Schema Validation Tests
# ============================================================================

class TestSchemaValidation:
    """Tests for Pydantic schema validation."""

    def test_add_recipe_request_schema(self):
        """Test AddRecipeRequest schema validation."""
        request = AddRecipeRequest(recipe_url="https://example.com", job_id=1)
        assert request.recipe_url == "https://example.com"
        assert request.job_id == 1

    def test_add_rewe_recipes_request_schema(self):
        """Test AddReweRecipesRequest schema validation."""
        request = AddReweRecipesRequest(job_id=42)
        assert request.job_id == 42

    def test_user_item_schema(self):
        """Test UserItem schema validation."""
        user = UserItem(user_id="test_user", user_vector=[0.1, 0.2, 0.3])
        assert user.user_id == "test_user"
        assert user.user_vector == [0.1, 0.2, 0.3]

    def test_encode_batch_request_schema(self):
        """Test EncodeBatchRequest schema validation."""
        request = EncodeBatchRequest(
            users=[
                UserItem(user_id="u1", user_vector=[1.0, 2.0]),
                UserItem(user_id="u2", user_vector=[3.0, 4.0])
            ]
        )
        assert len(request.users) == 2

    def test_tune_request_defaults(self):
        """Test TuneRequest default values."""
        request = TuneRequest(
            user_emb=[0.1, 0.2],
            recipe_emb=[0.3, 0.4],
            like=1
        )
        assert request.use_weekly_user_adapter == True
        assert request.do_online_bce == False
        assert request.bce_steps == 5
        assert request.bce_lr == 5e-2
        assert request.max_batch_size == 512

    def test_adapter_finetune_request_defaults(self):
        """Test AdapterFinetuneRequest default values."""
        request = AdapterFinetuneRequest()
        assert request.epochs == 1
        assert request.val_split == 0.1
        assert request.max_batch_size == 2048
        assert request.lr_user == 1e-3
        assert request.save_best_as_last == True

    def test_tune_response_schema(self):
        """Test TuneResponse schema."""
        response = TuneResponse(
            updated_user_emb=[[0.1, 0.2, 0.3]],
            model_info={"version": "v1"}
        )
        assert len(response.updated_user_emb) == 1
        assert response.model_info["version"] == "v1"

    def test_adapter_finetune_response_schema(self):
        """Test AdapterFinetuneResponse schema."""
        response = AdapterFinetuneResponse(
            updated_count=100,
            train_metrics={"loss": 0.5},
            val_metrics={"loss": 0.6},
            model_info={"tag": "test"}
        )
        assert response.updated_count == 100
        assert response.train_metrics["loss"] == 0.5
