# Chen Jia
# begin: 2026/1/2 23:57

import torch

def extract_user_encoder(ckpt_path:str, out_path:str="user_encoder.pt"):
    ckpt = torch.load(ckpt_path, map_location="cpu")
    state = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt

    user_state = {k.replace("user_encoder.", "", 1): v
                  for k,v in state.items()
                  if k.startswith("user_encoder.")}

    if len(user_state) ==0:
        raise ValueError("No keys starting with \"user_encoder.\" found. Print state_dict keys to confirm prefix.")

    torch.save({"state_dict":user_state}, out_path)
    print(f"Saved {len(user_state)} tensors to {out_path}")

if __name__ == "__main__":
    extract_user_encoder("checkpoints/best.pt", "checkpoints/user_encoder.pt")