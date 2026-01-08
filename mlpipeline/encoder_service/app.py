# Chen Jia
# begin: 2026/1/6 23:34

import os
from typing import List, Optional

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from mlpipeline.pretrian.model import UserEncoder, UserEncoderConfig


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


app = FastAPI(title="User Encoder Service")

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

@app.post("/encode_users_batch", response_model=EncodeBatchResponse)
def encode_users_batch(req:EncodeBatchRequest):
    global _MODEL, _DEVICE, _INPUT_DIM

    if not req.users:
        raise HTTPException(400, "user is empty")

    d = len(req.users[0].user_vector)
    if d == 0:
        raise HTTPException(400, "user vector must be non-empty")

    for u in req.users:
        if len(u.user_vector) != d:
            raise HTTPException(400, "all user_vector must have same length")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    ckpt_path = "mlpipeline/pretrain/user_encoder.pt"

    if _MODEL is None or _INPUT_DIM != d:
        if not os.path.exists(ckpt_path):
            raise HTTPException(500, f"checkpoint not found: {ckpt_path}")
        try:
            _MODEL = _load_model(ckpt_path, input_dim=d, device=device)
        except Exception as e:
            raise HTTPException(500, f"failed to load model: {e}")
        _INPUT_DIM = d

    x = np.asarray([u.user_vector for u in req.users], dtype = np.float32)
    x = torch.from_numpy(x).to(device)

    with torch.inference_mode():
        z = _MODEL(x)
        z_np = z.detach().cpu().numpy()

    out = [
        UserEmbeddingItem(user_id = req.users[i].user_id, user_embedding = z_np[i].astype(float).tolist())
        for i in range(len(req.users))
    ]
    return EncodeBatchResponse(user=out, embedding_dim = z_np.shape[1])
