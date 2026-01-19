from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException

from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig, UserEncoderConfig
from .tasks import run_add_recipe_background_task, run_etl_background_task, run_user_embedding_task
from .schemas import AddRecipeRequest, AddReweRecipesRequest, EncodeBatchRequest, EncodeBatchResponse, UserEmbeddingItem
import torch
import numpy as np
from pathlib import Path

router = APIRouter()

_MODEL: Optional[UserEncoder] = None
_INPUT_DIM: Optional[int] = None


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
async def add_recipe(background_tasks: BackgroundTasks, request: AddRecipeRequest):
    """
    Endpoint to add a single recipe. Triggers a background task for scraping and processing.
    """
    background_tasks.add_task(run_add_recipe_background_task, request.recipe_url, request.job_id)
    return {"status": "Recipe addition started"}

# Route to add REWE recipes (background task)
@router.post("/recipes/add/rewe")
async def add_rewe_recipes(background_tasks: BackgroundTasks, request: AddReweRecipesRequest):
    """
    Endpoint to add REWE recipes. Triggers a background ETL task.
    """
    background_tasks.add_task(run_etl_background_task, request.job_id)
    return {"status": "Import started"}

# Route to encode a batch of users
@router.post("/encode_users_batch", response_model=EncodeBatchResponse)
def encode_users_batch(req: EncodeBatchRequest):
    """
    Endpoint to encode a batch of user vectors using the UserEncoder model.
    """
    global _MODEL, _INPUT_DIM

    if not req.users:
        raise HTTPException(400, "user is empty")

    d = len(req.users[0].user_vector)
    if d == 0:
        raise HTTPException(400, "user vector must be non-empty")

    for u in req.users:
        if len(u.user_vector) != d:
            raise HTTPException(400, "all user_vector must have same length")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    HERE = Path(__file__).resolve().parent
    ROOT = HERE.parent
    ckpt_path = ROOT / "pretrain" / "checkpoints" / "user_encoder.pt"

    if _MODEL is None or _INPUT_DIM != d:
        if not ckpt_path.exists():
            raise HTTPException(500, f"checkpoint not found: {ckpt_path}")
        try:
            _MODEL = _load_model(str(ckpt_path), input_dim=d, device=device)
        except Exception as e:
            raise HTTPException(500, f"failed to load model: {e}")
        _INPUT_DIM = d

    try:
        run_user_embedding_task(req.users, device, _MODEL)
    except Exception as e:
        raise HTTPException(500, f"failed to encode users: {e}")

    return {
        "status": "User encoding completed successfully",
    }
