import os
from pydantic import BaseModel, Field, conlist
from typing import Annotated, Any, Dict, List, Optional

DIM = int(os.getenv("EMB_DIM", "384"))
FloatVec384 = Annotated[List[float], Field(min_length=DIM, max_length=DIM)]

class AddRecipeRequest(BaseModel):
    recipe_url: str
    job_id: int

class AddReweRecipesRequest(BaseModel):
    job_id: int

class UserItem(BaseModel):
    user_id: str
    user_vector: List[float]

class EncodeBatchRequest(BaseModel):
    users: List[UserItem]

class UserEmbeddingItem(BaseModel):
    user_id: str
    user_embedding: List[float]

class EncodeBatchResponse(BaseModel):
    users: List[UserEmbeddingItem]
    embedding_dim: int

class TuneRequest(BaseModel):
    user_emb: List[FloatVec384]
    recipe_emb: List[FloatVec384]
    like: List[int]

    # pipeline switches
    use_weekly_user_adapter: bool = True
    do_online_bce: bool = True

    # online BCE knobs (optional)
    bce_steps: int = 5
    bce_lr: float = 5e-2
    bce_temperature: float = 0.07
    bce_l2_anchor: float = 1e-2
    bce_clip_grad_norm: float = 5.0
    bce_pos_weight: Optional[float] = None

    max_batch_size: int = 512


class TuneResponse(BaseModel):
    updated_user_emb: List[List[float]]
    metrics: Dict[str, float]
    model_info: Dict[str, Any]


class InteractionItem(BaseModel):
    user_id: str
    user_emb: FloatVec384
    recipe_emb: FloatVec384
    like: int  # 0/1


class AdapterFinetuneRequest(BaseModel):
    interactions: List[InteractionItem]

    epochs: int = 1  # can be set to whatever int, depends on how long you want to pretrain the model
    val_split: float = 0.1  # 0~0.5 for small batches
    max_batch_size: int = 2048

    # optional overrides for adapter training
    lr_user: float = 1e-3
    weight_decay: float = 0.0
    clip_grad_norm: float = 5.0
    pos_weight: Optional[float] = None

    # naming / checkpointing
    tag: Optional[str] = None  # if None, will auto timestamp
    save_best_as_last: bool = True  # IMPORTANT: keep ModelCache working immediately


class AdapterFinetuneResponse(BaseModel):
    users: List[UserEmbeddingItem]
    train_metrics: Dict[str, float]
    val_metrics: Dict[str, float]
    model_info: Dict[str, Any]