import uvicorn
from fastapi import FastAPI

from mlpipeline.ingredient_parser.parser import ParsedIngredient, IngredientRequest, get_prediction, format_to_json, \
    get_model
from mlpipeline.ingredient_parser.train_crf import tokenize, sent2features

app = FastAPI(title="Recipe Embedding Service")

@app.post("/parse", response_model=ParsedIngredient)
async def parse_ingredient(item: IngredientRequest):
    return get_prediction(item.phrase)

@app.post("/parse-bulk")
async def parse_bulk(phrases: list[str]):
    all_tokens = [tokenize(p) for p in phrases]
    all_features = [sent2features(t) for t in all_tokens]

    model = get_model()
    all_tags = model.predict(all_features)

    results = [format_to_json(tks, tgs) for tks, tgs in zip(all_tokens, all_tags)]
    return results

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)