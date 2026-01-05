from fractions import Fraction
import re
import unicodedata
import spacy

class IngredientParser:
    def __init__(self):
        self.nlp = spacy.load('mlpipeline/ingredient_parser/model-best/model')

    def process_text(self, text: str):
        """
        A wrapper function to pre-process text and run it through our pipeline.
        """
        return self.nlp(convert_floats_to_fractions(text))


def convert_to_float(fraction_str: str) -> float:
    unicode_fraction_pattern = r'(?<=\d)(?=[\u00bc-\u00be\u2150-\u215e])'

    spaced_text = re.sub(unicode_fraction_pattern, ' ', fraction_str)
    normalized = unicodedata.normalize('NFKC', spaced_text)
    
    normalized = normalized.replace('\u2044', '/')
    try:
        if normalized[0] == '-':
            return -float(sum(Fraction(part) for part in normalized[1:].split()))
        
        return float(sum(Fraction(part) for part in normalized.split()))
    except ValueError:
        raise ValueError(f"Cannot convert '{fraction_str}' to float.")

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


# ingredients = ['1 Stuck Puten (4 kg)']

# doc = process_text(ingredients[0])  # Get the first doc from the list

# print(f"Full Text: {doc.text}")

# # Loop through the detected entities
# for ent in doc.ents:
#     if ent.label_ in ['QUANTITY']:
#         print(fraction_to_mixed_number(Fraction(ent.text)))
#     print(f"Text: {ent.text}  ->  Label: {ent.label_}")

# # docs = [process_text(line) for line in ingredients]
