# Chen Jia
# begin: 2025/12/2 23:16

import torch
from torch import nn
import torch.nn.functional as F
from typing import Optional, Tuple, List
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer


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
    output_dim = 384
    num_layers: int = 2
    dropout: float = 0.1


@dataclass
class RecipeEncoderConfig:
    st_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    hidden_dim: int = 512
    num_layers: int = 3
    output_dim: int = 384
    dropout: float = 0.1
    freeze_base: bool = True


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


class RecipeMLPBlock(nn.Module):
    def __init__(self, out_dim: int = 384, hidden_dim: int = 512, dropout: float = 0.1):
        super().__init__()
        self.mapping = nn.Sequential(
            nn.LayerNorm(out_dim),
            nn.Linear(in_features=out_dim, out_features=hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(in_features=hidden_dim, out_features=out_dim)
        )
        # self.ln = nn.LayerNorm(out_dim)
        # self.linear1 = nn.Linear(in_features=out_dim, out_features=hidden_dim)
        # self.act = nn.ReLU()
        # self.dropout = nn.Dropout(dropout)
        # self.linear = nn.Linear(in_features=hidden_dim, out_features=out_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.mapping(x) + x


class RecipeEncoder(nn.Module):
    def __init__(self, cfg: RecipeEncoderConfig):
        super().__init__()
        self.cfg = cfg
        self.base_model = SentenceTransformer(cfg.st_model_name)
        base_dim = self.base_model.get_sentence_embedding_dimension()

        if base_dim != cfg.output_dim:
            print(f"Attention!!! the sentence transformer output dim is not equal to the out_dim")
            cfg.output_dim = base_dim

        if cfg.freeze_base:
            for p in self.base_model.parameters():
                p.requires_grad = False

        blocks = []
        for _ in range(cfg.num_layers):
            blocks.append(RecipeMLPBlock(
                out_dim=cfg.output_dim,
                hidden_dim=cfg.hidden_dim,
                dropout=cfg.dropout
            ))
        self.mlp = nn.Sequential(*blocks)

    def forward(self, x):
        with torch.no_grad():
            emb = self.base_model.encode(
                x,
                convert_to_tensor=True,
                show_progress_bar=False,
            )  # [B,D]

        device = next(self.mlp.parameters()).device
        emb = emb.to(device)
        out = self.mlp(emb)

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
