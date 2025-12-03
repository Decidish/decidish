# Chen Jia
# begin: 2025/12/2 23:16

import torch
from torch import nn
import torch.nn.functional as F
from typing import Optional, Tuple, List
from dataclasses import dataclass


def mean_pool_embeddings(
        embeddings: torch.Tensor,  # [B,L,D]
        mask: torch.Tensor,  # [B,L]
) -> torch.Tensor:
    mask = mask.unsqueeze(-1).float()
    lengths = mask.sum(dim=1).clamp(min=0.1)
    summed = (embeddings * mask).sum(dim=1)
    return summed / lengths


@dataclass
class UserEncoderConfig:
    user_input_dim: int
    hidden_dim: int = 128
    output_dim = 64
    num_layers: int = 2
    dropout: float = 0.1


@dataclass
class RecipeEncoderConfig:
    vocab_size: int
    pad_idx: int = 0
    emb_dim: int = 128
    hidden_dim: int = 256
    num_layers: int = 2
    n_heads: int = 4
    max_len: int = 256
    output_dim: int = 64
    dropout: float = 0.1


class UserEncoder(nn.Module):
    def __init__(self, cfg: UserEncoderConfig):
        super().__init__()
        layers = []
        in_dim = cfg.user_input_dim

        for i in range(cfg.num_layers - 1):
            layers.append(nn.Linear(in_dim, cfg.hidden_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(cfg.dropout))
            in_dim = cfg.hidden_dim

        layers.append(nn.Linear(in_dim, cfg.output_dim))
        self.mlp = nn.Sequential(*layers)

    def forward(self, x_user: torch.Tensor):
        x_feat = self.mlp(x_user)
        z = F.normalize(x_feat, dim=-1)
        return z


class RecipeEncoder(nn.Module):
    def __init__(self, cfg: RecipeEncoderConfig):
        super().__init__()
        self.cfg = cfg

        self.token_embedding = nn.Embedding(
            num_embeddings=cfg.vocab_size,
            embedding_dim=cfg.emb_dim,
            padding_idx=cfg.pad_idx,
        )

        self.pos_embedding = nn.Embedding(
            num_embeddings=cfg.max_len,
            embedding_dim=cfg.emb_dim,
        )

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=cfg.emb_dim,
            nhead=cfg.n_heads,
            dim_feedforward=cfg.hidden_dim,
            dropout=cfg.dropout,
            batch_first=True,
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=cfg.num_layers,
        )

        self.proj = nn.Linear(cfg.emb_dim, cfg.output_dim)

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        B, L = token_ids.shape
        device = token_ids.device

        token_emb = self.token_embedding(token_ids)
        pos_ids = torch.arange(L, device=device).unsqueeze(0).expand(B, L)
        pos_emb = self.pos_embedding(pos_ids)

        x = token_emb + pos_emb

        pad_mask = (token_ids == self.cfg.pad_idx)
        feat = self.transformer(x, src_key_padding_mask=pad_mask)

        valid_mask = (token_ids != self.cfg.pad_idx).long()
        pooled = mean_pool_embeddings(feat, valid_mask)

        out = self.proj(pooled)
        z = F.normalize(out, dim=-1)
        return z


class UserRecipeModel(nn.Module):
    def __init__(self, user_cfg: UserEncoderConfig, recipe_cfg: RecipeEncoderConfig):
        super().__init__()
        assert user_cfg.output_dim == recipe_cfg.output_dim, "the dimensions of users and recipes must be the same!"
        self.user_encoder = UserEncoder(user_cfg)
        self.recipe_encoder = RecipeEncoder(recipe_cfg)

    def encode_user(self, x_user: torch.Tensor) -> torch.Tensor:
        return self.user_encoder(x_user)

    def encode_recipe(self, x_recipe: torch.Tensor) -> torch.Tensor:
        return self.recipe_encoder(x_recipe)

    def forward(
            self,
            x_user: torch.Tensor,
            x_recipe: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        emb_user = self.encode_user(x_user)
        emb_recipe = self.encode_recipe(x_recipe)
        return emb_user, emb_recipe


# regarding the loss, maybe we should consider using BCElogit loss
def loss(
        emb_user: torch.Tensor,
        emb_recipe: torch.Tensor,
        target: List,
        temperature: float = 0.07,
) -> torch.Tensor:
    logits = emb_user @ emb_recipe.T / temperature

    B = emb_user.size(0)
    device = emb_user.device
    target = torch.tensor(target)

    loss_u2r = F.cross_entropy(logits, target)
    loss_r2u = F.cross_entropy(logits.T, target)

    return (loss_u2r + loss_r2u) / 2.0

# TODO: add dataloaser and loss design
