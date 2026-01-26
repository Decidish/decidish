# Chen Jia
# begin: 2026/1/21 0:31
import os
import time
from dataclasses import dataclass
from typing import Dict, Optional, Any, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


class ResidualAdapter(nn.Module):
    def __init__(self, dim: int, hidden: int, dropout: float = 0.0):
        super().__init__()
        self.ln = nn.LayerNorm(dim)
        self.fc1 = nn.Linear(dim, hidden)
        self.fc2 = nn.Linear(hidden, dim)
        self.drop = nn.Dropout(dropout)

        nn.init.normal_(self.fc1.weight, std=0.02)
        nn.init.zeros_(self.fc1.bias)
        nn.init.normal_(self.fc2.weight, std=0.02)
        nn.init.zeros_(self.fc2.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.ln(x)
        h = self.fc1(h)
        h = F.gelu(h)
        h = self.drop(h)
        h = self.fc2(h)
        return x + h


class UserAdapterOnly(nn.Module):
    def __init__(self, dim: int = 384, hidden: int = 384, dropout: float = 0.0, temperature: float = 0.07):
        super().__init__()
        self.dim = dim
        self.hidden = hidden
        self.dropout = dropout
        self.temperature = temperature
        self.user_adapter = ResidualAdapter(dim, hidden, dropout)

    @torch.no_grad()
    def transform_user(self, user_emb: torch.Tensor) -> torch.Tensor:
        u = self.user_adapter(user_emb)
        return F.normalize(u, dim=-1)


def online_bce_tune_user_embedding(
        user_emb: torch.Tensor,  # [B,D]
        recipe_emb: torch.Tensor,  # [B,D]
        like: torch.Tensor,  # [B] 0/1
        steps: int = 5,
        lr: float = 5e-2,
        temperature: float = 0.07,
        l2_anchor: float = 1e-2,
        clip_grad_norm: float = 5.0,
        pos_weight: Optional[float] = None,
) -> Dict[str, torch.Tensor]:
    device = user_emb.device
    y = like.float().to(device)

    u0 = user_emb.detach()
    r = recipe_emb.detach()

    u = nn.Parameter(u0.clone())
    opt = torch.optim.AdamW([u], lr=lr, weight_decay=0.0)

    if pos_weight is not None:
        pw = torch.tensor([pos_weight], device=device, dtype=torch.float32)
        bce = nn.BCEWithLogitsLoss(pos_weight=pw)
    else:
        bce = nn.BCEWithLogitsLoss()

    loss_main = torch.tensor(0.0, device=device)
    loss_reg = torch.tensor(0.0, device=device)

    for _ in range(steps):
        opt.zero_grad(set_to_none=True)
        uu = F.normalize(u, dim=-1)
        rr = F.normalize(r, dim=-1)
        logits = (uu * rr).sum(dim=-1) / max(temperature, 1e-8)

        loss_main = bce(logits, y)
        loss_reg = l2_anchor * (u - u0).pow(2).mean()
        loss = loss_main + loss_reg

        loss.backward()
        if clip_grad_norm and clip_grad_norm > 0:
            torch.nn.utils.clip_grad_norm_([u], clip_grad_norm)
        opt.step()

    u_new = F.normalize(u.detach(), dim=-1)

    with torch.no_grad():
        rr = F.normalize(r, dim=-1)
        cos_new = (u_new * rr).sum(dim=-1)
        m = like.bool()
        cos_like = cos_new[m].mean() if m.any() else torch.tensor(float("nan"), device=device)
        cos_dislike = cos_new[~m].mean() if (~m).any() else torch.tensor(float("nan"), device=device)

    return {
        "updated_user_emb": u_new,
        "loss_main": loss_main.detach(),
        "loss_reg": loss_reg.detach(),
        "loss_total": (loss_main + loss_reg).detach(),
        "cos_like_mean": cos_like.detach(),
        "cos_dislike_mean": cos_dislike.detach(),
    }


def _latest_ckpt_path(ckpt_dir: str) -> Optional[str]:
    p = os.path.join(ckpt_dir, "last.pt")
    return p if os.path.exists(p) else None


@dataclass
class CoreCfg:
    dim: int = 384
    hidden: int = 384
    dropout: float = 0.0
    adapter_temperature: float = 0.07

    ckpt_dir: str = "./ckpts_weekly_user_adapter"
    device: str = "cuda" if torch.cuda.is_available() else "cpu"


class ModelCache:
    def __init__(self, cfg: CoreCfg):
        self.cfg = cfg
        self._model: Optional[UserAdapterOnly] = None
        self._ckpt_path: Optional[str] = None
        self._ckpt_mtime: Optional[float] = None
        self._loaded_at: float = 0.0

    def get(self, reload_if_changed: bool = True) -> Tuple[UserAdapterOnly, Dict[str, Any]]:
        latest = _latest_ckpt_path(self.cfg.ckpt_dir)

        latest_mtime: Optional[float] = None
        if latest is not None:
            try:
                latest_mtime = os.path.getmtime(latest)
            except OSError:
                latest_mtime = None

        need_load = (self._model is None)
        if reload_if_changed:
            if (latest != self._ckpt_path) or (latest_mtime != self._ckpt_mtime):
                need_load = True

        if need_load:
            m = UserAdapterOnly(
                dim=self.cfg.dim,
                hidden=self.cfg.hidden,
                dropout=self.cfg.dropout,
                temperature=self.cfg.adapter_temperature,
            ).to(self.cfg.device).eval()

            if latest is not None:
                ckpt = torch.load(latest, map_location=self.cfg.device)
                state = ckpt.get("model_state", ckpt)
                m.load_state_dict(state, strict=False)

            self._model = m
            self._ckpt_path = latest
            self._ckpt_mtime = latest_mtime
            self._loaded_at = time.time()

        info = {
            "device": self.cfg.device,
            "ckpt_dir": self.cfg.ckpt_dir,
            "ckpt_used": self._ckpt_path,  # None means random init
            "ckpt_mtime": self._ckpt_mtime,
            "loaded_at": self._loaded_at,
        }

        if self._model is None:
            raise RuntimeError("ModelCache internal error: model is None after loading")
        
        return self._model, info


@torch.no_grad()
def _to_tensor(batch: Dict[str, Any], device: str) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    user = torch.tensor(batch["user_emb"], dtype=torch.float32, device=device)
    recipe = torch.tensor(batch["recipe_emb"], dtype=torch.float32, device=device)
    like = torch.tensor(batch["like"], dtype=torch.int64, device=device)
    return user, recipe, like


def compute_updated_user_embeddings(
        batch: Dict[str, Any],
        model_cache: ModelCache,
        *,
        use_weekly_user_adapter: bool = True,
        do_online_bce: bool = True,
        bce_steps: int = 5,
        bce_lr: float = 5e-2,
        bce_temperature: float = 0.07,
        bce_l2_anchor: float = 1e-2,
        bce_clip_grad_norm: float = 5.0,
        bce_pos_weight: Optional[float] = None,
) -> Dict[str, Any]:
    """
    inpur batch:
      {
        "user_emb":   [[...384...], ...],
        use_weekly_user_adapter: bool
        do_online_bce: bool
      }
    return:
      {
        "updated_user_emb": [[...384...], ...],
        "metrics": {...},
        "model_info": {...}
      }
    """
    model, model_info = model_cache.get(reload_if_changed=True)

    user, recipe, like = _to_tensor(batch, model_cache.cfg.device)

    if user.ndim != 2 or recipe.ndim != 2:
        raise ValueError("user_emb and recipe_emb must be 2D [B,D]")
    if user.shape != recipe.shape:
        raise ValueError(f"shape mismatch: user {tuple(user.shape)} vs recipe {tuple(recipe.shape)}")
    if user.shape[1] != model_cache.cfg.dim:
        raise ValueError(f"dim mismatch: got {user.shape[1]}, expected {model_cache.cfg.dim}")
    if like.ndim != 1 or like.shape[0] != user.shape[0]:
        raise ValueError("like must be 1D with length B")

    if use_weekly_user_adapter:
        with torch.no_grad():
            user = model.transform_user(user)

    if do_online_bce:
        res = online_bce_tune_user_embedding(
            user_emb=user,
            recipe_emb=recipe,
            like=like,
            steps=bce_steps,
            lr=bce_lr,
            temperature=bce_temperature,
            l2_anchor=bce_l2_anchor,
            clip_grad_norm=bce_clip_grad_norm,
            pos_weight=bce_pos_weight,
        )
        updated_user = res["updated_user_emb"]
        metrics = {
            "loss_total": float(res["loss_total"].detach().cpu()),
            "loss_main": float(res["loss_main"].detach().cpu()),
            "loss_reg": float(res["loss_reg"].detach().cpu()),
            "cos_like_mean": float(res["cos_like_mean"].detach().cpu()),
            "cos_dislike_mean": float(res["cos_dislike_mean"].detach().cpu()),
        }
    else:
        updated_user = user
        with torch.no_grad():
            rr = F.normalize(recipe, dim=-1)
            cos = (updated_user * rr).sum(dim=-1)
            m = like.bool()
            metrics = {
                "cos_like_mean": float(cos[m].mean().cpu()) if m.any() else float("nan"),
                "cos_dislike_mean": float(cos[~m].mean().cpu()) if (~m).any() else float("nan"),
            }

    return {
        "updated_user_emb": updated_user.detach().cpu().tolist(),
        "metrics": metrics,
        "model_info": {
            **model_info,
            "use_weekly_user_adapter": use_weekly_user_adapter,
            "do_online_bce": do_online_bce,
        },
    }


if __name__ == "__main__":
    import argparse
    import random


    def make_dummy_batch(B: int, D: int, like_prob: float = 0.5, seed: int = 0):
        torch.manual_seed(seed)
        random.seed(seed)
        user = F.normalize(torch.randn(B, D), dim=-1)
        recipe = F.normalize(torch.randn(B, D), dim=-1)
        like = (torch.rand(B) < like_prob).long()
        return {
            "user_emb": user.cpu().tolist(),
            "recipe_emb": recipe.cpu().tolist(),
            "like": like.cpu().tolist(),
        }


    def check_norm(x_list, eps=1e-2):
        x = torch.tensor(x_list, dtype=torch.float32)
        norms = x.norm(dim=-1)
        return float(norms.mean()), float((norms - 1.0).abs().max())


    parser = argparse.ArgumentParser()
    parser.add_argument("--ckpt_dir", type=str, default="./ckpts_weekly_user_adapter")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--B", type=int, default=16)
    parser.add_argument("--dim", type=int, default=384)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    cfg = CoreCfg(
        dim=args.dim,
        hidden=args.dim,
        dropout=0.0,
        adapter_temperature=0.07,
        ckpt_dir=args.ckpt_dir,
        device=args.device,
    )
    cache = ModelCache(cfg)

    batch = make_dummy_batch(B=args.B, D=args.dim, like_prob=0.5, seed=args.seed)

    print("\n=== Model cache info ===")
    _, info = cache.get(reload_if_changed=True)
    print(info)

    # weekly adapter only
    print("\n=== Case 1: weekly adapter only (no online BCE) ===")
    out1 = compute_updated_user_embeddings(
        batch=batch,
        model_cache=cache,
        use_weekly_user_adapter=True,
        do_online_bce=False,
    )
    mean_norm, max_dev = check_norm(out1["updated_user_emb"])
    print("metrics:", out1["metrics"])
    print("mean_norm:", mean_norm, "max|norm-1|:", max_dev)

    # online BCE only
    print("\n=== Case 2: online BCE only (no weekly adapter) ===")
    out2 = compute_updated_user_embeddings(
        batch=batch,
        model_cache=cache,
        use_weekly_user_adapter=False,
        do_online_bce=True,
        bce_steps=5,
        bce_lr=5e-2,
        bce_temperature=0.07,
        bce_l2_anchor=1e-2,
        bce_clip_grad_norm=5.0,
        bce_pos_weight=None,
    )
    mean_norm, max_dev = check_norm(out2["updated_user_emb"])
    print("metrics:", out2["metrics"])
    print("mean_norm:", mean_norm, "max|norm-1|:", max_dev)
    # online + offline
    print("\n=== Case 3: weekly adapter + online BCE ===")
    out3 = compute_updated_user_embeddings(
        batch=batch,
        model_cache=cache,
        use_weekly_user_adapter=True,
        do_online_bce=True,
        bce_steps=5,
        bce_lr=5e-2,
        bce_temperature=0.07,
        bce_l2_anchor=1e-2,
        bce_clip_grad_norm=5.0,
        bce_pos_weight=None,
    )
    mean_norm, max_dev = check_norm(out3["updated_user_emb"])
    print("metrics:", out3["metrics"])
    print("mean_norm:", mean_norm, "max|norm-1|:", max_dev)

    assert len(out3["updated_user_emb"]) == args.B
    assert len(out3["updated_user_emb"][0]) == args.dim
    print("\n All sanity checks passed.")
