import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException

from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig, UserEncoderConfig
from mlpipeline.embedding.services import AdapterService, InferenceService
from .tasks import run_add_recipe_background_task, run_etl_background_task
from .schemas import AdapterFinetuneRequest, AdapterFinetuneResponse, AddRecipeRequest, AddReweRecipesRequest, EncodeBatchRequest, EncodeBatchResponse, TuneRequest, TuneResponse
import torch
import logging
import traceback

# Import our refactored modules
from .schemas import (
    EncodeBatchRequest, EncodeBatchResponse,
    TuneRequest, TuneResponse,
    AdapterFinetuneRequest, AdapterFinetuneResponse
)

router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mlpipeline.api")
inference_service = InferenceService()
adapter_service = AdapterService()

def _load_model(ckpt_path: str, input_dim: int, device: torch.device) -> UserEncoder:
    cfg = UserEncoderConfig()
    if input_dim != cfg.user_input_dim:
        raise ValueError(f"the pretrained in_dim is {cfg.user_input_dim}, but we get {input_dim}")
    model = UserEncoder(cfg)

    ckpt = torch.load(ckpt_path, map_location="cpu")
    state_dict = ckpt["state_dict"] if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt
    missing, unexpected = model.load_state_dict(state_dict, strict=True)
    if missing or unexpected:
        raise RuntimeError(f"state_dict mismatch, missing = {missing}, unexpected = {unexpected}")

    model.eval().to(device)

    return model

# Route to add a single recipe (background task)
@router.post("/recipes/add")
def add_recipe(background_tasks: BackgroundTasks, request: AddRecipeRequest):
    """
    Endpoint to add a single recipe. Triggers a background task for scraping and processing.
    """
    background_tasks.add_task(run_add_recipe_background_task, request.recipe_url, request.job_id)
    return {"status": "Recipe addition started"}

# Route to add REWE recipes (background task)
@router.post("/recipes/add/rewe")
def add_rewe_recipes(background_tasks: BackgroundTasks, request: AddReweRecipesRequest):
    """
    Endpoint to add REWE recipes. Triggers a background ETL task.
    """
    background_tasks.add_task(run_etl_background_task, request.job_id)
    return {"status": "Import started"}

# --- Endpoints: Inference ---

@router.post("/encode_users_batch", response_model=EncodeBatchResponse, tags=["Inference"])
async def encode_users_batch(req: EncodeBatchRequest):
    """
    Encodes a batch of raw user vectors using the pre-trained UserEncoder.
    This is a stateless, read-only operation.
    """
    try:
        users, dim = inference_service.encode(req.users)
        return EncodeBatchResponse(users=users, embedding_dim=dim)
    except ValueError as e:
        logger.warning(f"Bad Request in encode_users_batch: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Inference Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal inference error")


# --- Endpoints: Fine-Tuning ---

@router.get("/health", tags=["System"])
async def health():
    """
    Returns the status of the ML service and the currently loaded adapter version.
    Used by Docker Healthchecks and Load Balancers.
    """
    try:
        info = adapter_service.get_health()
        return {"status": "ok", **info}
    except Exception as e:
        logger.error(f"Health Check Failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


@router.post("/tune", response_model=TuneResponse, tags=["Training"])
async def tune(req: TuneRequest):
    """
    Online Tuning: Updates user embeddings based on a small batch of recent interactions.
    Does NOT permanently retrain the global adapter model weights, 
    but calculates specific adjustments for the users in the batch.
    """
    B = len(req.user_emb)
    if B == 0:
        raise HTTPException(status_code=400, detail="Empty batch")
    if B > req.max_batch_size:
        raise HTTPException(status_code=400, detail=f"Batch too large: {B} > {req.max_batch_size}")
    if len(req.recipe_emb) != B or len(req.like) != B:
        raise HTTPException(status_code=400, detail="Mismatched lengths for user_emb, recipe_emb, and like")

    batch = {
        "user_emb": req.user_emb,
        "recipe_emb": req.recipe_emb,
        "like": req.like,
    }

    try:
        # We pass specific params explicitly to avoid coupling API req object to logic
        result = adapter_service.tune_online(
            batch=batch,
            use_weekly_user_adapter=req.use_weekly_user_adapter,
            do_online_bce=req.do_online_bce,
            bce_steps=req.bce_steps,
            bce_lr=req.bce_lr,
            bce_temperature=req.bce_temperature,
            bce_l2_anchor=req.bce_l2_anchor,
            bce_clip_grad_norm=req.bce_clip_grad_norm,
            bce_pos_weight=req.bce_pos_weight,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Tune Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal tuning error")


@router.post("/finetune_user_adapter", response_model=AdapterFinetuneResponse, tags=["Training"])
async def finetune_user_adapter(req: AdapterFinetuneRequest):
    """
    Global Fine-Tuning: Runs a full training loop to update the Adapter Model.
    
    CRITICAL: This endpoint uses a Distributed Postgres Lock. 
    If another replica is currently training, this request will BLOCK until 
    the lock is released or timeout occurs.
    """
    if not req.interactions:
        raise HTTPException(status_code=400, detail="Interactions list is empty")
    
    if len(req.interactions) > req.max_batch_size:
        raise HTTPException(status_code=400, detail=f"Batch too large: {len(req.interactions)} > {req.max_batch_size}")

    if not (0.0 <= req.val_split <= 0.5):
        raise HTTPException(status_code=400, detail="val_split must be between 0.0 and 0.5")

    try:
        return adapter_service.run_training_job(req)
    except RuntimeError as e:
        # Likely a lock acquisition failure or database connection issue
        logger.error(f"Locking Error: {e}")
        raise HTTPException(status_code=503, detail="Could not acquire lock or connect to DB. System busy.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Fine-Tuning Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal training error")
