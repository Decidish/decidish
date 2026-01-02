# Chen Jia
# begin: 2026/1/1 21:49

from __future__ import annotations
from model import UserRecipeModel, UserEncoderConfig, RecipeEncoderConfig, loss as clip_loss
import os
import math
import argparse
from dataclasses import asdict
from tqdm.auto import tqdm

import torch
import torch.nn.functional as F
from torch.optim import AdamW

from dataloader import train_loader, val_loader


@torch.no_grad()
def retrieval_metrics(emb_user: torch.Tensor, emb_recipe: torch.Tensor, ks=(1, 5, 10), temperature=0.07):
    logits = (emb_user @ emb_recipe.T) / temperature  # [B,B]
    target = torch.arange(logits.size(1), device=logits.device)  # [B]
    ranks = torch.argsort(torch.argsort(-logits, dim=1), dim=1)  # 2 times argsort: rank->idx & idx->rank
    gt_rank = ranks[torch.arange(logits.size(0), device=logits.device), target]  # gt_rank[i] = ranks[i, i]

    out = {}
    for k in ks:
        out[f"R@{k}"] = (gt_rank < k).float().mean().item()
    out["acc@1"] = out["R@1"]
    return out


def set_seed(seed: int):
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)


def train_one_epoch(model, loader, optimizer, device, temperature, epoch):
    model.train()
    total_loss = 0.0
    n_steps = 0

    pbar = tqdm(loader, desc=f"Train {epoch}", leave=False)
    for x_user, x_recipe in loader:
        x_user = x_user.to(device)
        emb_user, emb_recipe = model(x_user, x_recipe)

        l = clip_loss(emb_user, emb_recipe, temperature=temperature)

        optimizer.zero_grad(set_to_none=True)
        l.backward()
        optimizer.step()

        total_loss += l.item()
        n_steps += 1

        pbar.set_postfix(loss=f"{(total_loss / n_steps):.4f}")

    return total_loss / max(n_steps, 1)


@torch.no_grad()
def eval_one_epoch(model, loader, device, temperature: float, epoch=1):
    model.eval()
    total_loss = 0.0
    n_steps = 0

    metric_sum = {"R@1": 0.0, "R@5": 0.0, "R@10": 0.0, "acc@1": 0.0}
    metric_n = 0

    pbar = tqdm(loader, desc=f"Val {epoch}", leave=False)
    for x_user, x_recipe in loader:
        x_user = x_user.to(device)
        emb_user, emb_recipe = model(x_user, x_recipe)

        l = clip_loss(emb_user, emb_recipe, temperature=temperature)
        total_loss += l.item()

        n_steps += 1

        pbar.set_postfix(loss=f"{(total_loss / n_steps):.4f}")

        m = retrieval_metrics(emb_user, emb_recipe, ks=(1, 5, 10), temperature=temperature)
        for k in metric_sum:
            metric_sum[k] += m[k]
        metric_n += 1

    avg_loss = total_loss / max(n_steps, 1)
    avg_metrics = {k: metric_sum[k] / max(metric_n, 1) for k in metric_sum}
    return avg_loss, avg_metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=1864)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--lr", type=float, default=1e-5)
    parser.add_argument("--weight_decay", type=float, default=1e-6)
    parser.add_argument("--temperature", type=int, default=0.07)
    parser.add_argument("--ckpt_dir", type=str, default="checkpoints")

    parser.add_argument("--st_model_name", type=str, default="sentence-transformers/all-MiniLM-L6-v2")
    parser.add_argument("--freeze_base", action="store_true", help="freeze sentence-transformers base model")
    parser.add_argument("--user_hidden_dim", type=int, default=512)
    parser.add_argument("--user_num_layers", type=int, default=2)
    parser.add_argument("--out_dim", type=int, default=384)
    parser.add_argument("--recipe_hidden_dim", type=int, default=512)
    parser.add_argument("--recipe_num_layers", type=int, default=3)
    parser.add_argument("--dropout", type=float, default=0.1)

    args = parser.parse_args()
    set_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    user_cfg = UserEncoderConfig()
    recipe_cfg = RecipeEncoderConfig()

    model = UserRecipeModel(user_cfg, recipe_cfg).to(device)

    optim_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = AdamW(optim_params, lr=args.lr, weight_decay=args.weight_decay)

    os.makedirs(args.ckpt_dir, exist_ok=True)
    best_val = float("inf")
    best_path = os.path.join(args.ckpt_dir, "best.pt")
    last_path = os.path.join(args.ckpt_dir, "last.pt")

    print("Device", device)
    print(f"Train steps/epochs: {len(train_loader)}, Val steps/epoch: {len(val_loader)}")

    for e in range(1, args.epochs + 1):
        tr_loss = train_one_epoch(model, train_loader, optimizer, device, args.temperature, epoch=e)
        va_loss, va_metrics = eval_one_epoch(model, val_loader, device, args.temperature, epoch=e)

        print(f"[Epoch {e:03d}] train_loss={tr_loss:.4f} val_loss={va_loss:.4f}"
              f"R@1={va_metrics['R@1']:.3f} R@5={va_metrics['R@5']:.3f} R@10={va_metrics['R@10']:.3f}")

        torch.save({"epoch": e, "model": model.state_dict(), "args": vars(args)}, last_path)

        if va_loss < best_val:
            best_val = va_loss
            torch.save({"epoch": e, "model": model.state_dict(), "args": vars(args)}, best_path)
            print(f"  -> saved best to {best_path} (val_loss={best_val:.4f})")


if __name__ == "__main__":
    main()
