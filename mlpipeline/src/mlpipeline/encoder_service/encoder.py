# Chen Jia
# begin: 2026/1/6 23:34

import torch
import numpy as np
from typing import List, Optional
from pathlib import Path
from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig

class UserEncoderProcessor:
    def __init__(self, checkpoint_path: Optional[Path] = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[UserEncoder] = None
        self.input_dim: Optional[int] = None

        # Default pathing logic
        if checkpoint_path is None:
            self.checkpoint_path = Path(__file__).resolve().parents[2] / "pretrain" / "checkpoints" / "user_encoder.pt"
        else:
            self.checkpoint_path = checkpoint_path

    def _load_model(self, input_dim: int):
        cfg = UserEncoderConfig()
        if input_dim != cfg.user_input_dim:
            raise ValueError(f"Pretrained in_dim is {cfg.user_input_dim}, but got {input_dim}")

        model = UserEncoder(cfg)

        if not self.checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint not found at {self.checkpoint_path}")

        ckpt = torch.load(self.checkpoint_path, map_location="cpu")
        state_dict = ckpt["state_dict"] if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt

        model.load_state_dict(state_dict, strict=True)
        model.eval().to(self.device)

        self.model = model
        self.input_dim = input_dim

    def encode_batch(self, user_ids: List[str], vectors: List[List[float]]):
        if not vectors:
            raise ValueError("User list is empty")

        # Validate dimensions
        dim = len(vectors[0])
        if dim == 0:
            raise ValueError("User vector must be non-empty")

        # Lazy load or reload if dimension changes
        if self.model is None or self.input_dim != dim:
            self._load_model(dim)

        # Process with Torch
        x = np.asarray(vectors, dtype=np.float32)
        x_tensor = torch.from_numpy(x).to(self.device)

        with torch.inference_mode():
            z = self.model(x_tensor)
            z_np = z.detach().cpu().numpy()

        return z_np, z_np.shape[1]
