from logging import config
from typing import Optional, cast, List

from pydantic import BaseModel, Field
from google import genai

from mlpipeline.etl.models import Ingredient
from mlpipeline.ingredient_parser.unit_graph import UnitGraph

class IngredientModel(BaseModel):
    name: str = Field(description="The cleaned name of the ingredient, e.g., 'Mehl'")
    quantity: Optional[float] = Field(description="The numeric quantity. Convert fractions to decimals. If none, return null.")
    unit: Optional[str] = Field(description="The unit, e.g., 'grams', 'ml', 'Prise'. Normalized to singular if possible.")
    info: Optional[str] = Field(description="Extra prep info, e.g., 'gehackt', 'in Würfeln'.")

class IngredientListModel(BaseModel):
    ingredients: List[IngredientModel]

class IngredientParser:
    def __init__(self, client: genai.Client, unit_graph: UnitGraph):
        self.client = client
        self.graph = unit_graph

    def parse_ingredients(self, raw_ingredients: List[str]) -> List[Ingredient]:
        """Parse multiple ingredients in a single API call."""
        if not raw_ingredients:
            return []
        
        numbered_list = "\n".join(f"{i+1}. {ing}" for i, ing in enumerate(raw_ingredients))
        
        prompt = f"""
        You are a precise German/English recipe parser. 
        Split each of the following raw ingredient strings into structured data.
        Return the ingredients in the SAME ORDER as provided.
        
        Ingredients:
        {numbered_list}
        
        Rules:
        1. Extract quantity as a float (e.g., '1/2' -> 0.5).
        2. Extract unit (e.g., 'EL', 'g', 'kg'). 
        3. Keep the 'name' clean (e.g. remove 'kalt', 'gewürfelt' and move to info).
        4. If no quantity exists (e.g., "Salz und Pfeffer"), set quantity to null.
        """

        response = self.client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": IngredientListModel,
            },
        )

        parsed_list: IngredientListModel = cast(IngredientListModel, response.parsed)
        
        results = []
        for raw, ingredient in zip(raw_ingredients, parsed_list.ingredients):
            normalized = self.process_product_data(
                ingredient.quantity if ingredient.quantity else 1.0, 
                ingredient.unit if ingredient.unit else "stk", 
                ingredient.name if ingredient.name else "unknown"
            )
            
            if normalized["normalized"] is None:
                results.append(Ingredient(
                    original=raw,
                    amount=ingredient.quantity,
                    unit=clean_unit_label(ingredient.unit),
                    food=ingredient.name,
                    info=ingredient.info
                ))
            else:
                results.append(Ingredient(
                    original=raw,
                    amount=normalized["normalized"],
                    unit=clean_unit_label(ingredient.unit),
                    food=ingredient.name,
                    info=ingredient.info
                ))
        
        return results

    def parse_ingredient(self, raw_ingredient: str) -> Ingredient:
        """Parse a single ingredient (convenience wrapper)."""
        return self.parse_ingredients([raw_ingredient])[0]
    
    def process_recipe_text(self, raw_text: str):
        """
        Full Pipeline: NLP Extraction -> Normalization
        """

        # Extract (Heavy Compute)
        extracted: Ingredient = self.parse_ingredient(raw_text)
        
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