import os
from .normalization import UnitGraph

class PipelineProcessor:
    def __init__(self, db_url=None, enable_nlp=False):
        """
        Scalability Switch:
        - enable_nlp=True: Loads spaCy (High Memory). Use for Recipes.
        - enable_nlp=False: DB Only (Low Memory). Use for Products.
        """
        # Load Normalization
        if not db_url:
            db_url = os.getenv("CORE_DATABASE_URL", "postgresql://user:password@localhost:5433/decidish?sslmode=disable")
        self.graph = UnitGraph(db_url)
        
        # Load NLP (Only if requested)
        self.extractor = None
        if enable_nlp:
            from .extraction import IngredientExtractor
            self.extractor = IngredientExtractor()

    def process_recipe_text(self, raw_text: str):
        """
        Full Pipeline: NLP Extraction -> Normalization
        """
        if not self.extractor:
            raise RuntimeError("NLP not enabled. Initialize with enable_nlp=True")

        # Extract (Heavy Compute)
        extracted = self.extractor.extract(raw_text)
        
        # Normalize (Fast Database Lookup)
        normalized = self.graph.normalize(
            extracted['amount'], 
            extracted['unit'], 
            extracted['ingredient']
        )
        
        return {
            "source": "recipe",
            "extracted": extracted,
            "normalized": normalized
        }

    def process_product_data(self, amount, unit, name):
        """
        Fast Pipeline: Normalization Only (No NLP)
        """
        normalized = self.graph.normalize(float(amount), unit, name)
        
        return {
            "source": "product",
            "normalized": normalized
        }

# Example
if __name__ == "__main__":
    # SCENARIO A: The Product Worker (Fast, Low RAM)
    print("--- Starting Product Worker ---")
    product_worker = PipelineProcessor(enable_nlp=False) 
    
    prod_result = product_worker.process_product_data(1, "kg", "Mehl")
    print(f"Product: {prod_result}")

    # SCENARIO B: The Recipe Worker (Slow, High RAM)
    print("\n--- Starting Recipe Worker ---")
    recipe_worker = PipelineProcessor(enable_nlp=True)
    
    rec_result = recipe_worker.process_recipe_text("1 cup Mehl")
    print(f"Recipe: {rec_result}")