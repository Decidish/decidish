# Chen Jia
# begin: 2026/1/24 16:03
import os
import json
import time
import math
from pathlib import Path
import argparse
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, random_split

from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig, RecipeEncoder, RecipeEncoderConfig, \
    loss as info_nce_loss
from mlpipeline.finetune.BCE_model import BCEConfig, EmbeddingAdapterModel, atomic_save, \
    ensure_dir  # reuse atomic save util
from mlpipeline.pretrain.dataloader import PairDataset

USER_INPUT_DIM = 35  # MUST be fixed as you required


def load_state_dict_from_pt(pt_path: str) -> Dict[str, torch.Tensor]:
    ckpt = torch.load(pt_path, map_location="cpu")
    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        return ckpt["state_dict"]
    if isinstance(ckpt, dict) and "model_state" in ckpt:
        return ckpt["model_state"]
    if isinstance(ckpt, dict):
        return ckpt
    raise ValueError(f"Unsupported checkpoint format: {pt_path}")


def normalize_recipe_text(x) -> str:
    # dataloader may return str or list
    if isinstance(x, list):
        return " ".join(map(str, x))
    return str(x)


def collate_fn(batch: List[Tuple[torch.Tensor, object]]):
    # batch item: (recipe_embed_as_tensor, recipe_text_or_list)
    # we will treat recipe_embed as user_vector_small (dim=35)
    user_vec = torch.stack([b[0] for b in batch], dim=0)  # [B,35]
    recipes = [normalize_recipe_text(b[1]) for b in batch]
    return user_vec, recipes


def build_payload(
        model: EmbeddingAdapterModel,
        optimizer: torch.optim.Optimizer,
        meta: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "meta": meta,
        "cfg": {
            # keep it readable and compatible with your finetune format
            "dim": int(model.cfg.dim),
            "hidden": int(model.cfg.hidden),
            "temperature": float(model.cfg.temperature),
            "dropout": float(model.cfg.dropout),
            "keep_recipe_embedding": bool(model.cfg.keep_recipe_embedding),
            "lr_user": float(model.cfg.lr_user),
            "lr_recipe": float(model.cfg.lr_recipe),
            "weight_decay": float(model.cfg.weight_decay),
            "clip_grad_norm": float(model.cfg.clip_grad_norm),
            "pos_weight": model.cfg.pos_weight,
            "epochs": int(model.cfg.epochs),
            "log_every": int(model.cfg.log_every),
            "device": str(model.cfg.device),
        },
        "model_state": model.state_dict(),  # IMPORTANT: keys like "user_adapter.*"
        "optim_state": optimizer.state_dict(),
        "saved_at": time.time(),
    }


def save_best_and_last_only(ckpt_dir: str, payload: dict, is_best: bool):
    ensure_dir(ckpt_dir)
    best_path = os.path.join(ckpt_dir, "best.pt")
    last_path = os.path.join(ckpt_dir, "last.pt")

    # best improved -> overwrite best
    if is_best:
        atomic_save(payload, best_path)

    if os.path.exists(best_path):
        # load best and write to last (so ModelCache always uses best)
        best_payload = torch.load(best_path, map_location="cpu")
        atomic_save(best_payload, last_path)
    else:
        atomic_save(payload, last_path)

@torch.no_grad()
def evaluate(
        user_encoder: UserEncoder,
        recipe_encoder: RecipeEncoder,
        adapter_model: EmbeddingAdapterModel,
        loader: DataLoader,
        device: torch.device,
) -> float:
    user_encoder.eval()
    recipe_encoder.eval()
    adapter_model.eval()

    total = 0.0
    n = 0

    for user_vec_small, recipe_texts in loader:
        user_vec_small = user_vec_small.to(device, non_blocking=True)

        # frozen encoders
        u0 = user_encoder(user_vec_small)  # [B,384]
        r = recipe_encoder(recipe_texts)  # [B,384]

        # trainable adapter (user side only)
        u = adapter_model.user_adapter(u0)
        u = F.normalize(u, dim=-1)
        r = F.normalize(r, dim=-1)

        logits = (u @ r.t()) / max(float(adapter_model.cfg.temperature), 1e-8)
        B = u.size(0)
        target = torch.arange(B, device=device)

        loss = 0.5 * (F.cross_entropy(logits, target) + F.cross_entropy(logits.t(), target))

        total += float(loss.detach().cpu())
        n += 1

    return total / max(n, 1)


def train(
        data_path: str,
        user_encoder_pt: str,
        recipe_encoder_pt: str,
        ckpt_dir: str,
        *,
        dim: int = 384,
        hidden: int = 384,
        dropout: float = 0.0,
        temperature: float = 0.07,
        lr: float = 1e-3,
        weight_decay: float = 0.0,
        clip_grad_norm: float = 5.0,
        batch_size: int = 64,
        epochs: int = 5,
        val_ratio: float = 0.1,
        num_workers: int = 2,
        seed: int = 0,
        device: str = "cuda",
        st_model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
):
    torch.manual_seed(seed)
    dev = torch.device(device)
    pin = (dev.type == "cuda")

    # dataset (original PairDataset):
    # returns (recipe_embed, recipe_text) but we treat recipe_embed as user_vec_small
    ds = PairDataset(data_path)

    # hard check user dim == 35
    u_test, _ = ds[0]
    if int(u_test.numel()) != USER_INPUT_DIM:
        raise ValueError(
            f"USER_INPUT_DIM is fixed to {USER_INPUT_DIM}, "
            f"but dataset vector dim is {int(u_test.numel())}. "
            f"Your PairDataset embed must be 35-dim."
        )

    n_total = len(ds)
    if n_total < 2:
        raise ValueError(f"Dataset too small: n={n_total}")

    n_val = max(1, int(round(n_total * float(val_ratio))))
    n_val = min(n_val, n_total - 1)
    n_train = n_total - n_val

    g = torch.Generator().manual_seed(seed)
    train_set, val_set = random_split(ds, [n_train, n_val], generator=g)

    train_loader = DataLoader(
        train_set,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin,
        collate_fn=collate_fn,
        drop_last=True,  # in-batch negatives prefer stable batch size
    )
    val_loader = DataLoader(
        val_set,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin,
        collate_fn=collate_fn,
        drop_last=False,
    )

    # ---- load frozen encoders from extracted checkpoints ----
    # user_encoder.pt contains {"state_dict": keys like "mlp.*"}
    user_cfg = UserEncoderConfig(user_input_dim=USER_INPUT_DIM)
    user_encoder = UserEncoder(user_cfg)
    user_sd = load_state_dict_from_pt(user_encoder_pt)
    user_encoder.load_state_dict(user_sd, strict=True)
    user_encoder.eval().to(dev)
    for p in user_encoder.parameters():
        p.requires_grad = False

    # recipe_encoder.pt contains ONLY recipe_encoder.mlp extracted => saved as {"state_dict": "mlp.*"}
    recipe_cfg = RecipeEncoderConfig(st_model_name=st_model_name)
    recipe_encoder = RecipeEncoder(recipe_cfg)
    recipe_sd_raw = load_state_dict_from_pt(recipe_encoder_pt)

    if any(k.startswith("mlp.") for k in recipe_sd_raw.keys()):
        recipe_sd = {k[len("mlp."):]: v for k, v in recipe_sd_raw.items() if k.startswith("mlp.")}
    else:
        recipe_sd = recipe_sd_raw

    recipe_encoder.mlp.load_state_dict(recipe_sd, strict=True)
    recipe_encoder.eval().to(dev)
    for p in recipe_encoder.parameters():
        p.requires_grad = False

    # ---- adapter model (exactly same structure as online finetune uses) ----
    bce_cfg = BCEConfig(
        dim=dim,
        hidden=hidden,
        temperature=temperature,
        dropout=dropout,
        keep_recipe_embedding=True,  # user_adapter only
        lr_user=lr,
        lr_recipe=0.0,
        weight_decay=weight_decay,
        clip_grad_norm=clip_grad_norm,
        pos_weight=None,
        epochs=epochs,
        log_every=0,
        device=str(dev),
    )
    adapter_model = EmbeddingAdapterModel(bce_cfg).to(dev)

    optimizer = torch.optim.AdamW(
        [{"params": adapter_model.user_adapter.parameters(), "lr": lr}],
        weight_decay=weight_decay,
    )

    ensure_dir(ckpt_dir)
    best_val = float("inf")
    best_tag: Optional[str] = None

    # sanity: forward one batch for dim check
    with torch.no_grad():
        xb, txt = next(iter(train_loader))
        xb = xb.to(dev)
        u0 = user_encoder(xb)
        r0 = recipe_encoder(txt)
        if u0.shape[1] != dim or r0.shape[1] != dim:
            raise ValueError(f"Dim mismatch: user={u0.shape}, recipe={r0.shape}, expected D={dim}")

    for ep in range(1, epochs + 1):
        adapter_model.train()
        running = 0.0
        steps = 0

        for user_vec_small, recipe_texts in train_loader:
            user_vec_small = user_vec_small.to(dev, non_blocking=True)

            with torch.no_grad():
                u0 = user_encoder(user_vec_small)  # [B,384]
                r = recipe_encoder(recipe_texts)  # [B,384]

            u = adapter_model.user_adapter(u0)
            u = F.normalize(u, dim=-1)
            r = F.normalize(r, dim=-1)

            logits = (u @ r.t()) / max(float(adapter_model.cfg.temperature), 1e-8)
            B = u.size(0)
            target = torch.arange(B, device=dev)

            loss = 0.5 * (F.cross_entropy(logits, target) + F.cross_entropy(logits.t(), target))

            optimizer.zero_grad(set_to_none=True)
            loss.backward()

            if clip_grad_norm and clip_grad_norm > 0:
                torch.nn.utils.clip_grad_norm_(adapter_model.user_adapter.parameters(), clip_grad_norm)

            optimizer.step()

            running += float(loss.detach().cpu())
            steps += 1

        train_loss = running / max(steps, 1)
        val_loss = evaluate(user_encoder, recipe_encoder, adapter_model, val_loader, dev)

        tag = f"pre_ep{ep:02d}_ts{int(time.time())}"
        meta = {
            "tag": tag,
            "type": "pretrain_user_adapter_inbatch",
            "epoch": int(ep),
            "train_loss": float(train_loss),
            "val_loss": float(val_loss),
            "data_path": str(data_path),
            "user_encoder_pt": str(user_encoder_pt),
            "recipe_encoder_pt": str(recipe_encoder_pt),
            "user_input_dim_fixed": USER_INPUT_DIM,
        }

        payload = build_payload(adapter_model, optimizer, meta)

        improved = val_loss < best_val
        if improved:
            best_val = float(val_loss)
            best_tag = tag
            payload["meta"] = {**payload["meta"], "is_best": True, "best_val": best_val}

        is_best = val_loss < best_val
        if is_best:
            best_val = float(val_loss)
            payload["meta"] = {**payload["meta"], "is_best": True, "best_val": best_val}

        save_best_and_last_only(ckpt_dir, payload, is_best=is_best)

        print(f"[ep {ep}/{epochs}] train_loss={train_loss:.4f} val_loss={val_loss:.4f} best_val={best_val:.4f}")

    print(f"Done. best_tag={best_tag}, best_val={best_val:.4f}")
    print(f"Checkpoints saved in: {ckpt_dir}")
    print("ModelCache will pick up ckpt_dir/last.pt immediately.")


def main():
    script_dir = Path(__file__).resolve().parent  # .../mlpipeline/finetune
    mlpipeline_dir = script_dir.parent  # .../mlpipeline

    default_ckpt_dir = mlpipeline_dir / "ckpts_weekly_user_adapter"
    default_pretrain_dir = mlpipeline_dir / "pretrain" / "checkpoints"

    ap = argparse.ArgumentParser()

    # data: your original json (dict) consumed by PairDataset
    ap.add_argument("--data", type=str, default=str(mlpipeline_dir / "pretrain" / "recipe.json"))

    # extracted encoders (by get_user_encoder.py / get_recipe_encoder.py)
    ap.add_argument("--user_encoder_pt", type=str, default=str(default_pretrain_dir / "user_encoder.pt"))
    ap.add_argument("--recipe_encoder_pt", type=str, default=str(default_pretrain_dir / "recipe_encoder.pt"))

    # EXACT same env var as your finetune API uses
    ap.add_argument("--ckpt_dir", type=str, default=os.getenv("ADAPTER_CKPT_DIR", str(default_ckpt_dir)))

    ap.add_argument("--dim", type=int, default=384)
    ap.add_argument("--hidden", type=int, default=384)
    ap.add_argument("--dropout", type=float, default=0.0)
    ap.add_argument("--temperature", type=float, default=0.07)

    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--weight_decay", type=float, default=0.0)
    ap.add_argument("--clip_grad_norm", type=float, default=5.0)

    ap.add_argument("--batch_size", type=int, default=64)
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--val_ratio", type=float, default=0.1)
    ap.add_argument("--num_workers", type=int, default=2)

    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    ap.add_argument("--st_model_name", type=str, default="sentence-transformers/all-MiniLM-L6-v2")

    args = ap.parse_args()

    train(
        data_path=args.data,
        user_encoder_pt=args.user_encoder_pt,
        recipe_encoder_pt=args.recipe_encoder_pt,
        ckpt_dir=args.ckpt_dir,
        dim=args.dim,
        hidden=args.hidden,
        dropout=args.dropout,
        temperature=args.temperature,
        lr=args.lr,
        weight_decay=args.weight_decay,
        clip_grad_norm=args.clip_grad_norm,
        batch_size=args.batch_size,
        epochs=args.epochs,
        val_ratio=args.val_ratio,
        num_workers=args.num_workers,
        seed=args.seed,
        device=args.device,
        st_model_name=args.st_model_name,
    )


if __name__ == "__main__":
    main()
