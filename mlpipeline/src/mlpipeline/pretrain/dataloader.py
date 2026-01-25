# Chen Jia
# begin: 2025/12/7 23:35

from torch.utils.data import DataLoader, Dataset, random_split
import json
import torch


def load_from_json(json_path: str = "mlpipeline/pretrain/recipe.json"):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    recipes = []
    recipes_embed = []
    for _, v in data.items():
        recipes.append(v["recipes"])
        recipes_embed.append(v["embed"])
    return recipes_embed, recipes


class PairDataset(Dataset):
    def __init__(self, json_path: str = "mlpipeline/pretrain/recipe.json"):
        super().__init__()
        self.recipes_embed, self.recipes = load_from_json(json_path)

    def __len__(self):
        return len(self.recipes)

    def __getitem__(self, idx: int):
        recipe = self.recipes[idx]
        recipe_embed = torch.tensor(self.recipes_embed[idx], dtype=torch.float32)
        return recipe_embed, recipe


if __name__ == "__main__":
    dataset = PairDataset("recipe.json")
    train_ratio = 0.9
    train_size = int(train_ratio * len(dataset))
    val_size = len(dataset) - train_size
    train_set, val_set = random_split(dataset, [train_size, val_size])
    train_loader = DataLoader(train_set, batch_size=32, shuffle=True, pin_memory=True)
    val_loader = DataLoader(val_set, batch_size=32, shuffle=False, pin_memory=True)
    print(f"train set length: {len(train_set)}")
    print(f"val set length: {len(val_set)}")

    for batch in train_loader:
        print(batch)
        print(f"the size of the embed is: {batch[0].shape}")
        break
