# Chen Jia
# begin: 2026/1/1 21:49

from __future__ import annotations
from model import UserRecipeModel, UserEncoderConfig, RecipeEncoderConfig, loss as clip_loss
import os
import math
import argparse
from dataclasses import asdict

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
        out[f"R@{k}"] = (gt_rank < k).float(). mean().item()
    out["acc@1"] = out["R@1"]
    return out
