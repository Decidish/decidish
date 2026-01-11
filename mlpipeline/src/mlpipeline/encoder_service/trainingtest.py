# Chen Jia
# begin: 2026/1/11 17:43

import os
import torch
from pathlib import Path

def main():
    from mlpipeline.pretrain.model import UserEncoder, UserEncoderConfig
    print("[OK] import model.py")

    HERE = Path(__file__).resolve().parent
    ROOT = HERE.parent
    ckpt_path = ROOT / "pretrain" / "checkpoints" / "user_encoder.pt"
    print("[INFO] ckpt_path =", ckpt_path)
    print("[DEBUG] ckpt_path = C:\\Users\\texfyx\\Desktop\\Decidish\\food-tinder\\mlpipeline\\pretrain\\checkpoints\\user_encoder.pt")
    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"checkpoint not found: {ckpt_path}")
    print("[OK] checkpoint exists")

    ckpt = torch.load(ckpt_path, map_location="cpu")
    state_dict = ckpt["state_dict"] if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt
    print("[OK] loaded checkpoint")
    print("[INFO] num params:", len(state_dict))
    print("[INFO] first 5 keys:", list(state_dict.keys())[:5])

    first_w = state_dict.get("mlp.0.weight", None)
    if first_w is None:
        raise KeyError("Cannot find 'mlp.0.weight' in state_dict. Please check printed keys above.")
    input_dim = first_w.shape[1]
    print("[INFO] inferred input_dim =", input_dim)

    cfg = UserEncoderConfig(user_input_dim=input_dim)
    model = UserEncoder(cfg)
    missing, unexpected = model.load_state_dict(state_dict, strict=True)
    print("[OK] load_state_dict strict=True")
    print("[INFO] missing:", missing)
    print("[INFO] unexpected:", unexpected)

    print("✅ SMOKE TEST PASSED")

if __name__ == "__main__":
    main()
