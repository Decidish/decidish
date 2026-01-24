import asyncio
from typing import Optional, cast, List

from ollama import AsyncClient

from mlpipeline.etl.models import Ingredient
from mlpipeline.ingredient_parser.unit_graph import UnitGraph
from mlpipeline.ingredient_parser.advanced_parser import IngredientParsed, parse_single_ingredient

class IngredientParser:
    def __init__(self, client: AsyncClient, unit_graph: UnitGraph, semaphore: asyncio.Semaphore):
        self.client = client
        self.graph = unit_graph
        self.semaphore = semaphore

    async def parse_ingredients(self, raw_ingredients: List[str]) -> List[Ingredient]:
        """Parse multiple ingredients in parallel with semaphore-controlled concurrency."""
        if not raw_ingredients:
            return []
        
        async def parse_one(raw: str) -> Ingredient:
            response: Optional[IngredientParsed] = await parse_single_ingredient(self.client, raw, self.semaphore)
            if response:
                normalized = self.process_product_data(
                    response.amount if response.amount else 1.0, 
                    response.unit if response.unit else "stk", 
                    response.food if response.food else "unknown"
                )
                
                if normalized["normalized"] is None:
                    return Ingredient(
                        original=raw,
                        amount=response.amount,
                        unit=clean_unit_label(response.unit),
                        food=response.food,
                        info=response.additional_info
                    )
                else:
                    return Ingredient(
                        original=raw,
                        amount=normalized["normalized"],
                        unit="g",
                        food=response.food,
                        info=response.additional_info
                    )
            else:
                return Ingredient(
                    original=raw,
                    amount=None,
                    unit="",
                    food=raw,
                    info="FAILED_TO_PARSE"
                )

        results = asyncio.gather(*[parse_one(raw) for raw in raw_ingredients])
        return list(results)

    async def parse_ingredient(self, raw_ingredient: str) -> Ingredient:
        """Parse a single ingredient (convenience wrapper)."""
        return (await self.parse_ingredients([raw_ingredient]))[0]
    
    async def process_recipe_text(self, raw_text: str):
        """
        Full Pipeline: NLP Extraction -> Normalization
        """

        # Extract (Heavy Compute)
        extracted: Ingredient = await self.parse_ingredient(raw_text)
        
        # Normalize (Fast Database Lookup)
        normalized = self.graph.normalize(
            extracted.amount if extracted.amount else 1.0, 
            extracted.unit if extracted.unit else "stk", 
            extracted.food if extracted.food else "unknown"
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


def clean_unit_label(raw: str | None):
        if not raw: return "piece"
        text = raw.lower().replace(".", "").strip()
        mapping = {
            "stk": "stück", "stueck": "stück", "stück": "stück", "piece": "stück",
            "kilogramm": "kg", "kg": "kg",
            "gramm": "g", "g": "g",
            "liter": "l", "l": "l",
            "ml": "ml", "milliliter": "ml",
            "el": "tbsp", "esslöffel": "tbsp", "tablespoon": "tbsp",
            "tl": "tsp", "teelöffel": "tsp", "teaspoon": "tsp",
            "prise": "pinch", "pinch": "pinch",
            "cup": "cup", "cups" : "cup", "tasse": "cup"
        }
        return mapping.get(text, text)