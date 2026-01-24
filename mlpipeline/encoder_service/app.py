# Chen Jia
# begin: 2026/1/6 23:34

import os
import time
import threading
from typing import List, Optional, Dict, Any, Tuple
from collections import defaultdict

import numpy as np
import torch
import torch.nn.functional as F
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, conlist
from pathlib import Path

from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig
from mlpipeline.finetune.tune_user_embedding import CoreCfg, ModelCache, compute_updated_user_embeddings
from mlpipeline.finetune.BCE_model import (
    BCEConfig,
    EmbeddingAdapterModel,
    make_bce_loss,
    load_or_init,
    ensure_dir,
    atomic_save,
    batch_stats,
)


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
    device="cuda" if (os.getenv("FORCE_CPU", "0") != "1" and torch.cuda.is_available()) else "cpu",
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

    for v in req.like:
        if v not in (0, 1):
            raise HTTPException(400, "like must be 0/1")

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


# Avoid concurrent writes to the same ckpt_dir
_ADAPTER_TRAIN_LOCK = threading.Lock()


def _split_indices(n: int, val_split: float, device: str) -> Tuple[torch.Tensor, torch.Tensor]:
    # return：train_idx, val_idx
    if n <= 1:
        idx = torch.arange(n, device=device)
        return idx, idx

    val_split = float(val_split)
    if val_split <= 0:
        idx = torch.randperm(n, device=device)
        return idx, idx  # no val => use train as val
    val_split = min(val_split, 0.5)
    n_val = max(1, int(round(n * val_split)))
    n_val = min(n_val, n - 1)
    idx = torch.randperm(n, device=device)
    val_idx = idx[:n_val]
    tr_idx = idx[n_val:]
    return tr_idx, val_idx


def _tensorize_interactions(interactions: List[InteractionItem], device: str):
    U = torch.tensor([it.user_emb for it in interactions], dtype=torch.float32, device=device)
    R = torch.tensor([it.recipe_emb for it in interactions], dtype=torch.float32, device=device)
    y = torch.tensor([it.like for it in interactions], dtype=torch.float32, device=device)
    return U, R, y


@torch.no_grad()
def _recompute_users_with_adapter(
        adapter_model: EmbeddingAdapterModel,
        interactions: List[InteractionItem],
        device: str
) -> List[UserEmbeddingItem]:
    adapter_model.eval()

    per_user = defaultdict(list)
    for it in interactions:
        u = torch.tensor(it.user_emb, dtype=torch.float32, device=device).unsqueeze(0)  # [1,D]
        u2 = adapter_model.user_adapter(u)
        u2 = F.normalize(u2, dim=-1).squeeze(0).detach().cpu()
        per_user[it.user_id].append(u2)

    out: List[UserEmbeddingItem] = []
    for uid, vecs in per_user.items():
        m = torch.stack(vecs, dim=0).mean(dim=0)
        m = F.normalize(m, dim=-1)
        out.append(UserEmbeddingItem(user_id=uid, user_embedding=m.tolist()))
    return out


@app.post("/finetune_user_adapter", response_model=AdapterFinetuneResponse)
def finetune_user_adapter(req: AdapterFinetuneRequest):
    if not req.interactions:
        raise HTTPException(400, "interactions is empty")

    B = len(req.interactions)
    if B > req.max_batch_size:
        raise HTTPException(400, f"Batch too large: {B} > {req.max_batch_size}")

    if req.epochs <= 0 or req.epochs > 20:
        raise HTTPException(400, "epochs must be in [1, 20]")
    if not (0.0 <= req.val_split <= 0.5):
        raise HTTPException(400, "val_split must be in [0, 0.5]")

    for it in req.interactions:
        if it.like not in (0, 1):
            raise HTTPException(400, "like must be 0/1")

    device = core_cfg.device
    ckpt_dir = core_cfg.ckpt_dir
    ensure_dir(ckpt_dir)

    bce_cfg = BCEConfig(
        dim=core_cfg.dim,
        hidden=core_cfg.hidden,
        temperature=core_cfg.adapter_temperature,
        dropout=core_cfg.dropout,
        keep_recipe_embedding=True,  # train user_adapter only
        lr_user=float(req.lr_user),
        lr_recipe=0.0,
        weight_decay=float(req.weight_decay),
        clip_grad_norm=float(req.clip_grad_norm),
        pos_weight=req.pos_weight,
        epochs=int(req.epochs),
        log_every=0,
        device=device,
    )

    tag = req.tag or f"api_{int(time.time())}"

    with _ADAPTER_TRAIN_LOCK:
        try:
            model, optimizer, load_info = load_or_init(ckpt_dir, bce_cfg)
            bce = make_bce_loss(bce_cfg)

            U, R, y = _tensorize_interactions(req.interactions, device=device)
            tr_idx, val_idx = _split_indices(B, req.val_split, device=device)

            best_val = float("inf")
            best_state: Optional[Dict[str, torch.Tensor]] = None

            last_train_loss = float("nan")
            last_val_loss = float("nan")
            last_train_stats: Dict[str, float] = {}
            last_val_stats: Dict[str, float] = {}

            for ep in range(req.epochs):
                model.train()

                # one-shot batch
                out_tr = model(U[tr_idx], R[tr_idx])
                loss_tr = bce(out_tr["logits"], y[tr_idx])

                optimizer.zero_grad(set_to_none=True)
                loss_tr.backward()
                if bce_cfg.clip_grad_norm and bce_cfg.clip_grad_norm > 0:
                    torch.nn.utils.clip_grad_norm_(model.parameters(), bce_cfg.clip_grad_norm)
                optimizer.step()

                last_train_loss = float(loss_tr.detach().cpu())
                last_train_stats = batch_stats(out_tr["cos"].detach(), y[tr_idx].detach())

                model.eval()
                with torch.no_grad():
                    out_v = model(U[val_idx], R[val_idx])
                    loss_v = bce(out_v["logits"], y[val_idx]).item()
                    last_val_loss = float(loss_v)
                    last_val_stats = batch_stats(out_v["cos"].detach(), y[val_idx].detach())

                if loss_v < best_val:
                    best_val = float(loss_v)
                    best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

            if best_state is None:
                best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
                best_val = last_val_loss

            # Save BEST
            meta = {
                "tag": tag,
                "type": "api_finetune_user_adapter",
                "epochs": int(req.epochs),
                "val_split": float(req.val_split),
                "B": int(B),
                "load_info": load_info,
                "best_val_loss": float(best_val),
                "train_loss_last": float(last_train_loss),
                "val_loss_last": float(last_val_loss),
                "train_stats_last": last_train_stats,
                "val_stats_last": last_val_stats,
            }

            payload = {
                "meta": meta,
                "cfg": {
                    "dim": bce_cfg.dim,
                    "hidden": bce_cfg.hidden,
                    "temperature": bce_cfg.temperature,
                    "dropout": bce_cfg.dropout,
                    "keep_recipe_embedding": bce_cfg.keep_recipe_embedding,
                },
                "model_state": best_state,
                # optimizer is not necessary for inference, but keep for continuity
                "optim_state": optimizer.state_dict(),
                "saved_at": time.time(),
            }

            best_path = os.path.join(ckpt_dir, "best.pt")
            ckpt_path = os.path.join(ckpt_dir, f"ckpt_{tag}.pt")
            last_path = os.path.join(ckpt_dir, "last.pt")

            atomic_save(payload, best_path)
            atomic_save(payload, ckpt_path)
            if req.save_best_as_last:
                atomic_save(payload, last_path)
                model_cache.get(reload_if_changed=True)

            # Re-load best into model for recompute
            model.load_state_dict(best_state, strict=False)
            model.to(device).eval()

            # recompute per-user embeddings
            users = _recompute_users_with_adapter(model, req.interactions, device=device)

            return AdapterFinetuneResponse(
                users=users,
                train_metrics={
                    "loss_last": float(last_train_loss),
                    **{f"train_{k}": float(v) for k, v in last_train_stats.items()},
                },
                val_metrics={
                    "loss_best": float(best_val),
                    "loss_last": float(last_val_loss),
                    **{f"val_{k}": float(v) for k, v in last_val_stats.items()},
                },
                model_info={
                    "device": device,
                    "ckpt_dir": ckpt_dir,
                    "saved_best": best_path,
                    "saved_ckpt": ckpt_path,
                    "overwrote_last": bool(req.save_best_as_last),
                    "tag": tag,
                    "load_info": load_info,
                },
            )

        except ValueError as e:
            raise HTTPException(400, str(e))
        except Exception as e:
            raise HTTPException(500, f"Internal error: {e}")
