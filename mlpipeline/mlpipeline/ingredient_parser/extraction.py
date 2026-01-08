import os  
import re
import unicodedata
import spacy
from fractions import Fraction

class IngredientExtractor:
    def __init__(self):
        # Only loads the heavy model.
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "model-best", "model")
        
        print(f"Loading spaCy model from: {model_path}")
        self.nlp = spacy.load(model_path)

    def extract(self, text: str) -> dict:
        """
        Input: "1 1/2 cups Flour"
        Output: { "amount": 1.5, "unit": "cup", "ingredient": "Flour" }
        """
        # Pre-process text (fractions -> mixed numbers if needed for model stability)
        clean_text = self._convert_floats_to_fractions(text)
        
        doc = self.nlp(clean_text)
        
        amount_raw = None
        unit_raw = None
        ingredient_name = None

        # Extract Entities
        for ent in doc.ents:
            if ent.label_ == "QUANTITY":
                amount_raw = ent.text
            elif ent.label_ == "UNIT":
                unit_raw = ent.text
            elif ent.label_ in ["FOOD", "INGREDIENT"]: 
                ingredient_name = ent.text

        # Convert and Clean
        return {
            "amount": self._convert_to_float(amount_raw) if amount_raw else 1.0,
            "unit": self._clean_unit_label(unit_raw),
            "ingredient": ingredient_name,
            "raw_text": text
        }

    # --- Internal Helper Methods ---

    def _clean_unit_label(self, raw):
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

    def _convert_to_float(self, fraction_str: str) -> float:
        """Converts '1 1/2', '¾', or '1,5' to float"""
        if not fraction_str: return 0.0
        
        # Handle unicode fractions (¼, ½, etc.)
        unicode_fraction_pattern = r'(?<=\d)(?=[\u00bc-\u00be\u2150-\u215e])'
        spaced_text = re.sub(unicode_fraction_pattern, ' ', fraction_str)
        normalized = unicodedata.normalize('NFKC', spaced_text)
        normalized = normalized.replace('\u2044', '/')
        normalized = normalized.replace(',', '.') # Handle German decimal '1,5'
        
        try:
            if normalized.strip() == "": return 0.0
            if normalized[0] == '-':
                return -float(sum(Fraction(part) for part in normalized[1:].split()))
            return float(sum(Fraction(part) for part in normalized.split()))
        except ValueError:
            return 0.0

    def _fraction_to_mixed_number(self, fraction: Fraction) -> str:
        if fraction.numerator >= fraction.denominator:
            whole, remainder = divmod(fraction.numerator, fraction.denominator)
            if remainder == 0:
                return str(whole)
            else:
                return f"{whole} {Fraction(remainder, fraction.denominator)}"
        else:
            return str(fraction)

    def _convert_floats_to_fractions(self, text: str) -> str:
        """
        Converts decimal strings in text to fractions if the model prefers them.
        e.g. "1.5 kg" -> "1 1/2 kg"
        """
        return re.sub(
            r'\b-?\d+\.\d+\b',
            lambda match: self._fraction_to_mixed_number(
                Fraction(float(match.group())).limit_denominator()), text
        )