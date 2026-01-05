from fractions import Fraction
import re
import time
import spacy
from spacy import displacy
import timeit

nlp = spacy.load('mlpipeline/ingredient_parser/model-best/model')

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
    return re.sub(
        r'\b-?\d+\.\d+\b',
        lambda match: fraction_to_mixed_number(
            Fraction(float(match.group())).limit_denominator()), text
    )


def process_text(text):
    """
    A wrapper function to pre-process text and run it through our pipeline.
    """
    return nlp(convert_floats_to_fractions(text))


ingredients = ['1 Stuck Puten (4 kg)']

doc = process_text(ingredients[0])  # Get the first doc from the list

print(f"Full Text: {doc.text}")

# Loop through the detected entities
for ent in doc.ents:
    print(f"Text: {ent.text}  ->  Label: {ent.label_}")

# docs = [process_text(line) for line in ingredients]
