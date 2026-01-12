import joblib
import sklearn_crfsuite
from pydantic import BaseModel

from mlpipeline.ingredient_parser.train_crf import sent2features, tokenize

# Load the model once when the server starts
model = joblib.load("ingredient_model.joblib")

class IngredientRequest(BaseModel):
    phrase: str

class ParsedIngredient(BaseModel):
    quantity: str = None
    unit: str = None
    name: str = None
    comment: str = None

def format_to_json(tokens: list, tags: list) -> dict:
    """
    Groups BIO tags into a structured JSON dictionary.
    tokens: ["2", "cups", "all", "purpose", "flour"]
    tags: ["B-QTY", "B-UNIT", "B-NAME", "I-NAME", "I-NAME"]
    """
    result = {
        "quantity": [],
        "unit": [],
        "name": [],
        "comment": []
    }

    field_map = {
        'QTY': 'quantity',
        'UNIT': 'unit',
        'NAME': 'name',
        'COMMENT': 'comment'
    }

    for token, tag in zip(tokens, tags):
        if tag == "O":
            continue

        # Extract the entity type from "B-NAME" or "I-NAME"
        prefix, entity_type = tag.split("-")
        field_key = field_map.get(entity_type)

        if field_key:
            result[field_key].append(token)

    # Join lists into clean strings and return
    return {k: (" ".join(v) if v else None) for k, v in result.items()}

def get_prediction(phrase):
    tokens = tokenize(phrase)
    features = sent2features(tokens)
    tags = model.predict([features])[0]
    return format_to_json(tokens, tags)

def get_model() -> sklearn_crfsuite.CRF:
    return model