# Chen Jia
# begin: 2026/1/19 9:59
import torch
import torch.nn as nn
import torch.nn.functional as F
import os
import glob
import time
from dataclasses import dataclass, asdict
from typing import Dict, Optional, Tuple, Iterable


@dataclass
class BCEConfig:
    dim: int = 384
    hidden: int = 768
    temperature: float = 0.07
    dropout: float = 0.0
    keep_recipe_embedding: bool = True
    lr_user: float = 1e-3
    lr_recipe: float = 5e-4
    weight_decay: float = 0.0
    clip_grad_norm: float = 5.0
    pos_weight: Optional[float] = None
    epochs: int = 10
    log_every: int = 200
    device: str = "cuda" if torch.cuda.is_available() else "cpu"


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


class EmbeddingAdapterModel(nn.Module):
    def __init__(self, cfg: BCEConfig):
        super().__init__()
        self.cfg = cfg
        self.user_adapter = ResidualAdapter(cfg.dim, cfg.hidden, cfg.dropout)

        if cfg.keep_recipe_embedding:
            self.recipe_adapter = None
        else:
            self.recipe_adapter = ResidualAdapter(cfg.dim, cfg.hidden, cfg.dropout)

    def forward(self, user_emb: torch.Tensor, recipe_emb: torch.Tensor) -> Dict[str, torch.Tensor]:
        u = self.user_adapter(user_emb)
        r = recipe_emb if self.recipe_adapter is None else self.recipe_adapter(recipe_emb)

        u = F.normalize(u, dim=-1)
        r = F.normalize(r, dim=-1)

        cos = (u * r).sum(dim=-1)  # [B]
        logits = cos / max(self.cfg.temperature, 1e-8)

        return {"u": u, "r": r, "cos": cos, "logits": logits}


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def atomic_save(obj: dict, path: str) -> None:
    tmp = path + ".tmp"
    torch.save(obj, tmp)
    os.replace(tmp, path)


def find_latest_ckpt(ckpt_dir: str) -> Optional[str]:
    last_path = os.path.join(ckpt_dir, "last.pt")
    if os.path.exists(last_path):
        return last_path
    candidates = glob.glob(os.path.join(ckpt_dir, "ckpt_*.pt"))
    if not candidates:
        return None
    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def save_ckpt(
        ckpt_dir: str,
        model: nn.Module,
        optimizer: torch.optim.Optimizer,
        meta: Dict[str, object],
) -> str:
    ensure_dir(ckpt_dir)
    tag = meta.get("tag", f"ts_{int(time.time())}")
    path = os.path.join(ckpt_dir, f"ckpt_{tag}.pt")
    last_path = os.path.join(ckpt_dir, "last.pt")

    payload = {
        "meta": meta,
        "cfg": asdict(model.cfg),
        "model_state": model.state_dict(),
        "optim_state": optimizer.state_dict(),
        "saved_at": time.time(),
    }
    atomic_save(payload, path)
    atomic_save(payload, last_path)
    return path


def load_or_init(
        ckpt_dir: str,
        cfg: BCEConfig,
) -> Tuple[EmbeddingAdapterModel, torch.optim.Optimizer, Dict[str, object]]:
    model = EmbeddingAdapterModel(cfg).to(cfg.device)

    param_groups = [{"params": model.user_adapter.parameters(), "lr": cfg.lr_user}]
    if (not cfg.keep_recipe_embedding) and (model.recipe_adapter is not None):
        param_groups.append({"params": model.recipe_adapter.parameters(), "lr": cfg.lr_recipe})

    optimizer = torch.optim.AdamW(param_groups, weight_decay=cfg.weight_decay)

    latest = find_latest_ckpt(ckpt_dir)
    if latest is None:
        return model, optimizer, {"loaded": False, "path": None}

    ckpt = torch.load(latest, map_location=cfg.device)

    try:
        model.load_state_dict(ckpt["model_state"], strict=True)
        strict_used = True
    except RuntimeError:
        model.load_state_dict(ckpt["model_state"], strict=False)
        strict_used = False

    try:
        optimizer.load_state_dict(ckpt["optim_state"])
    except Exception:
        pass

    return model, optimizer, {"loaded": True, "path": latest, "strict": strict_used, "meta": ckpt.get("meta", {})}


def make_bce_loss(cfg: BCEConfig) -> nn.Module:
    if cfg.pos_weight is None:
        return nn.BCEWithLogitsLoss()
    pw = torch.tensor([cfg.pos_weight], device=cfg.device, dtype=torch.float32)
    return nn.BCEWithLogitsLoss(pos_weight=pw)


@torch.no_grad()
def batch_stats(cos: torch.Tensor, like: torch.Tensor) -> Dict[str, float]:
    m = like.bool()
    return {
        "cos_like_mean": float(cos[m].mean().cpu()) if m.any() else float("nan"),
        "cos_dislike_mean": float(cos[~m].mean().cpu()) if (~m).any() else float("nan"),
    }


def train_one_week(
        train_loader: Iterable[Dict[str, torch.Tensor]],
        ckpt_dir: str,
        cfg: BCEConfig,
        week_tag: str,
) -> Dict[str, object]:
    """
    batch dict:
      {
        "user_emb":   [B,384],
        "recipe_emb": [B,384],
        "like":       [B] (0/1)
      }
    """
    ensure_dir(ckpt_dir)
    model, optimizer, load_info = load_or_init(ckpt_dir, cfg)
    bce = make_bce_loss(cfg)

    global_step = 0
    model.train()

    for ep in range(cfg.epochs):
        for batch in train_loader:
            user_emb = batch["user_emb"].to(cfg.device)
            recipe_emb = batch["recipe_emb"].to(cfg.device)
            like = batch["like"].to(cfg.device).float()

            assert user_emb.shape == recipe_emb.shape
            assert user_emb.shape[1] == cfg.dim, f"dim mismatch: got {user_emb.shape[1]}, expected {cfg.dim}"

            out = model(user_emb, recipe_emb)
            loss = bce(out["logits"], like)

            optimizer.zero_grad(set_to_none=True)
            loss.backward()

            if cfg.clip_grad_norm and cfg.clip_grad_norm > 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), cfg.clip_grad_norm)

            optimizer.step()
            global_step += 1

            if cfg.log_every and (global_step % cfg.log_every == 0):
                st = batch_stats(out["cos"].detach(), like.detach())
                print(
                    f"[{week_tag} ep{ep + 1} step{global_step}] "
                    f"loss={float(loss.detach().cpu()):.4f} "
                    f"cos_like={st['cos_like_mean']:.3f} cos_dislike={st['cos_dislike_mean']:.3f}"
                )

    meta = {
        "tag": week_tag,
        "week_tag": week_tag,
        "keep_recipe_embedding": cfg.keep_recipe_embedding,
        "epochs": cfg.epochs,
        "finished_steps": global_step,
        "load_info": load_info,
    }
    ckpt_path = save_ckpt(ckpt_dir, model, optimizer, meta)
    print(f"Saved weekly checkpoint: {ckpt_path}")

    return {"ckpt_path": ckpt_path, "meta": meta}


if __name__ == "__main__":
    def dummy_loader(num_batches=1000, batch_size=128, dim=384):
        for _ in range(num_batches):
            yield {
                "user_emb": F.normalize(torch.randn(batch_size, dim), dim=-1),
                "recipe_emb": F.normalize(torch.randn(batch_size, dim), dim=-1),
                "like": torch.randint(0, 2, (batch_size,)),
            }


    cfg = BCEConfig(
        dim=384,
        hidden=384,
        temperature=0.07,
        keep_recipe_embedding=True,
        lr_user=1e-3,
        lr_recipe=5e-4,
        pos_weight=5.0,
        epochs=1,
        log_every=200,
    )

    res = train_one_week(
        train_loader=dummy_loader(),
        ckpt_dir=os.getenv("ADAPTER_CKPT_DIR", "./ckpts_weekly_user_adapter"),
        cfg=cfg,
        week_tag="2026W03",
    )
    print(res)
