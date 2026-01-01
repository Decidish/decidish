from fastembed import TextEmbedding

class TextEmbedder:
    def __init__(self, model=None):
        if model:
            self.model = model
        else:
            self.model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

    def embed_recipes(self, recipes: list[str]):
        return self.model.embed(recipes)