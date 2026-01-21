# Chen Jia
# begin: 2026/1/6 23:34

import os
from typing import List, Optional, Dict, Any

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, conlist
from pathlib import Path

from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig
from mlpipeline.finetune.tune_user_embedding import CoreCfg, ModelCache, compute_updated_user_embeddings


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


# === Finetuing Phase ===

app = FastAPI(title="User Encoder + Embedding Tuning API")

_MODEL: Optional[UserEncoder] = None
_INPUT_DIM: Optional[int] = None


def _load_model(ckpt_path: str, input_dim: int, device: torch.device) -> UserEncoder:
    cfg = UserEncoderConfig()
    if input_dim != cfg.user_input_dim:
        raise ValueError(f"the pretrained in_dim is {cfg.user_input_dim}, but we get {input_dim}")
    model = UserEncoder(cfg)

    ckpt = torch.load(ckpt_path, map_location="cpu")
    state_dict = ckpt["state_dict"] if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt
    model.load_state_dict(state_dict, strict=True)

    model.eval().to(device)

    return model


@app.post("/encode_users_batch", response_model=EncodeBatchResponse)
def encode_users_batch(req: EncodeBatchRequest):
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

    x = np.asarray([u.user_vector for u in req.users], dtype=np.float32)
    x = torch.from_numpy(x).to(device)

    with torch.inference_mode():
        z = _MODEL(x)
        z_np = z.detach().cpu().numpy()

    out = [
        UserEmbeddingItem(user_id=req.users[i].user_id, user_embedding=z_np[i].astype(float).tolist())
        for i in range(len(req.users))
    ]
    return EncodeBatchResponse(users=out, embedding_dim=z_np.shape[1])


DIM = int(os.getenv("EMB_DIM", "384"))

FloatVec384 = conlist(float, min_length=DIM, max_length=DIM)


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


core_cfg = CoreCfg(
    dim=DIM,
    hidden=int(os.getenv("ADAPTER_HIDDEN", str(DIM))),
    dropout=float(os.getenv("ADAPTER_DROPOUT", "0.0")),
    adapter_temperature=float(os.getenv("ADAPTER_TEMPERATURE", "0.07")),
    ckpt_dir=os.getenv("ADAPTER_CKPT_DIR", "./ckpts_weekly_user_adapter"),
    device="cuda" if (os.getenv("FORCE_CPU","0") != "1" and torch.cuda.is_available()) else "cpu",
)

model_cache = ModelCache(core_cfg)


@app.get("/health")
def health():
    model, info = model_cache.get(reload_if_changed=True)
    return {"status": "ok", **info}


@app.post("/tune", response_model=TuneResponse)
def tune(req: TuneRequest):
    B = len(req.user_emb)
    if B == 0:
        raise HTTPException(400, "Empty batch")
    if B > req.max_batch_size:
        raise HTTPException(400, f"Batch too large: {B} > {req.max_batch_size}")
    if len(req.recipe_emb) != B or len(req.like) != B:
        raise HTTPException(400, "user_emb, recipe_emb, like must have same batch size")

    batch = {
        "user_emb": req.user_emb,
        "recipe_emb": req.recipe_emb,
        "like": req.like,
    }

    try:
        out = compute_updated_user_embeddings(
            batch=batch,
            model_cache=model_cache,
            use_weekly_user_adapter=req.use_weekly_user_adapter,
            do_online_bce=req.do_online_bce,
            bce_steps=req.bce_steps,
            bce_lr=req.bce_lr,
            bce_temperature=req.bce_temperature,
            bce_l2_anchor=req.bce_l2_anchor,
            bce_clip_grad_norm=req.bce_clip_grad_norm,
            bce_pos_weight=req.bce_pos_weight,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Internal error: {e}")

    return out
