from mlpipeline.ingredient_parser.parser import IngredientParser
from mlpipeline.ingredient_parser.normalization import UnitGraph

class PipelineProcessor:
    def __init__(self, ingredient_parser: IngredientParser, unit_graph: UnitGraph):
        # Load Normalization
        self.graph = unit_graph
        self.extractor = ingredient_parser

    def process_recipe_text(self, raw_text: str):
        """
        Full Pipeline: NLP Extraction -> Normalization
        """

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