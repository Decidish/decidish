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


def convert_to_float(fraction_str: str) -> float:
    unicode_fraction_pattern = r'(?<=\d)(?=[\u00bc-\u00be\u2150-\u215e])'

    spaced_text = re.sub(unicode_fraction_pattern, ' ', fraction_str)
    normalized = unicodedata.normalize('NFKC', spaced_text)
    
    normalized = normalized.replace('\u2044', '/')
    try:
        if normalized[0] == '-':
            return -float(sum(Fraction(part) for part in normalized[1:].split()))
        
        return float(sum(Fraction(part) for part in normalized.split()))
    except ValueError as err:
        print("Error converting float to fraction in text:")
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

# ingredients = ['1 Stuck Puten (4 kg)']

# doc = process_text(ingredients[0])  # Get the first doc from the list

# print(f"Full Text: {doc.text}")

# # Loop through the detected entities
# for ent in doc.ents:
#     if ent.label_ in ['QUANTITY']:
#         print(fraction_to_mixed_number(Fraction(ent.text)))
#     print(f"Text: {ent.text}  ->  Label: {ent.label_}")

# # docs = [process_text(line) for line in ingredients]
