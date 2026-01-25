from sentence_transformers import SentenceTransformer
import numpy as np

class TextEmbedder:
    def __init__(self):
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def embed_recipes(self, recipes: list[str]) -> np.ndarray:
        return self.model.encode(recipes)