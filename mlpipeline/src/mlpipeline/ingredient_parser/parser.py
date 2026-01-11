import re
import unicodedata
from fractions import Fraction
from typing import Iterator

import spacy
from spacy.tokens import Doc


class IngredientParser:
    def __init__(self, nlp: spacy.Language):
        # Try to use GPU if available
        # spacy.require_gpu()
        self.nlp = nlp

    def process_text(self, text: str):
        """
        A wrapper function to pre-process text and run it through our pipeline.
        """
        return self.nlp(convert_floats_to_fractions(text))

    def process_texts(self, texts: list[str]) -> Iterator[Doc]:
        """
        Process a list of texts and return their parsed representations.
        """
        clean_texts = (convert_floats_to_fractions(t) for t in texts)

        # Return a generator instead of a list for memory efficiency
        return self.nlp.pipe(clean_texts)

    def extract(self, text: str) -> dict:
        """
        Input: "1 1/2 cups Flour"
        Output: { "amount": 1.5, "unit": "cup", "ingredient": "Flour" }
        """
        # Pre-process text (fractions -> mixed numbers if needed for model stability)
        doc = self.process_text(text)

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
            "amount": convert_to_float(amount_raw) if amount_raw else 1.0,
            "unit": clean_unit_label(unit_raw),
            "ingredient": ingredient_name,
            "raw_text": text
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

def convert_to_float(fraction_str: str) -> float:
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
        except ValueError as err:
            raise err

def fraction_to_mixed_number(fraction: Fraction) -> str:
    if fraction.numerator >= fraction.denominator:
        whole, remainder = divmod(fraction.numerator, fraction.denominator)
        if remainder == 0:
            return str(whole)
        else:
            return f"{whole} {Fraction(remainder, fraction.denominator)}"
    else:
        return str(fraction)


def convert_floats_to_fractions(text: str) -> str:
    try:
        return re.sub(
            r'\b-?\d+\.\d+\b',
            lambda match: fraction_to_mixed_number(
                Fraction(float(match.group())).limit_denominator()), text
        )
    except ValueError as err:
        print("Error converting float to fraction in text:", text)
        raise err