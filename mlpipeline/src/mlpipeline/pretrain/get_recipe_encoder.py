# Chen Jia
# begin: 2026/1/11 21:36

import torch

def extract_recipe_head(ckpt_path: str, out_path: str = "recipe_encoder.pt"):
    ckpt = torch.load(ckpt_path, map_location="cpu")
    state = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt

    recipe_state = {
        k.replace("recipe_encoder.mlp.", "mlp.", 1): v
        for k, v in state.items()
        if k.startswith("recipe_encoder.mlp.")
    }

    if len(recipe_state) == 0:
        example_keys = list(state.keys())[:50]
        raise ValueError(
            'No keys starting with "recipe_encoder.mlp." found. '
            f"Example keys: {example_keys}"
        )

    torch.save({"state_dict": recipe_state}, out_path)
    print(f"Saved {len(recipe_state)} tensors to {out_path}")

if __name__ == "__main__":
    extract_recipe_head("checkpoints/best.pt", "checkpoints/recipe_encoder.pt")
