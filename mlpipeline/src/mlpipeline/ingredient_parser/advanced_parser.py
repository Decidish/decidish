import json
import time
import asyncio
from ollama import AsyncClient
from pydantic import BaseModel, Field
from typing import Optional, Any, List

# --- CONFIGURATION ---
INPUT_FILE = "data/recipes.jsonl"
OUTPUT_FILE = "data/recipes_enriched.jsonl"
OLLAMA_HOST = "http://localhost:11434" # Ensure this points to your GPU instance
MODEL = "llama3.1:8b" # GPU recommended: 8B is smarter and fast on GPU.

# GPU TUNING
# We process more recipes at once because the GPU eats them for breakfast.
RECIPE_BATCH_SIZE = 1
# We allow many more in-flight requests to saturate the OLLAMA_NUM_PARALLEL slots
MAX_CONCURRENT_REQUESTS = 10

# --- SCHEMA (Bilingual Support) ---
class IngredientParsed(BaseModel):
    amount: Optional[float] = Field(description="Amount of detected unit. Decimal value. Example: '1/2' -> 0.5. Null if no number.")
    unit: str = Field(description="The unit detected. Standardize slightly (e.g. 'tbsp.' -> 'tbsp', 'Pck.' -> 'Pck').")
    food: str = Field(description="Main ingredient name (English or German).")
    additional_info: str = Field(description="Adjectives/Prep (e.g. 'diced', 'gewürfelt').")
    allergies: str = Field(description="List of possible allergenics of ingredient")

# --- SINGLE INGREDIENT PROCESSOR (Bilingual) ---
async def parse_single_ingredient(client, text: str, semaphore: asyncio.Semaphore) -> Optional[IngredientParsed]:
    async with semaphore: 
        try:
            # We provide a bilingual lookup list to the model
            unit_context = (
                "KNOWN UNITS (DE / EN):\n"
                "- Mass: g, kg, mg, lb (pound), oz (ounce)\n"
                "- Vol: ml, l, dl, cl, fl oz, pt (pint), qt (quart), gal\n"
                "- Spoons: EL/tbsp, TL/tsp, Msp (pinch)\n"
                "- Containers: Pck/pkg, Dose/can, Glas/jar, Becher/tub, Tasse/cup\n"
                "- Produce: Bund/bunch, Zehe/clove, Stange/stalk, Blatt/leaf, Scheibe/slice\n"
                "- Vague: Prise/pinch, Schuss/dash, Spritzer/splash"
            )

            few_shot_examples = [
                # 1. German Decimal Case (Your original issue)
                {'role': 'user', 'content': 'Extract from: 175.0 g Frischkäse Natur'},
                {'role': 'assistant', 'content': json.dumps({"amount": 175.0, "unit": "g", "food": "Frischkäse", "additional_info": "Natur"})},
                
                # 2. English Imperial (Cup)
                {'role': 'user', 'content': 'Extract from: 1 1/2 cup all-purpose flour'},
                {'role': 'assistant', 'content': json.dumps({"amount": 1.5, "unit": "cup", "food": "flour", "additional_info": "all-purpose"})},
                
                # 3. German Abbreviation (EL)
                {'role': 'user', 'content': 'Extract from: 3 EL Olivenöl'},
                {'role': 'assistant', 'content': json.dumps({"amount": 3.0, "unit": "EL", "food": "Olivenöl", "additional_info": ""})},

                # 4. English Count (No unit)
                {'role': 'user', 'content': 'Extract from: 2 large eggs, beaten'},
                {'role': 'assistant', 'content': json.dumps({"amount": 2.0, "unit": "", "food": "eggs", "additional_info": "large, beaten"})}
            ]

            response = await client.chat(
                model=MODEL,
                messages=[
                    {'role': 'system', 'content': (
                        'You are a smart bilingual ingredient parser (German & English). '
                        'Analyze the text and extract structured data.\n'
                        f'{unit_context}\n'
                        'RULES:\n'
                        '1. **Language**: Detect the language automatically. Preserve the original language for the "food" field.\n'
                        '2. **Unit**: Extract the unit if present. Remove dots (e.g. "oz." -> "oz"). If it is a count (e.g. "3 Apples"), unit is "".\n'
                        '3. **Amount**: Convert fractions to decimals. Handle ranges by averaging (e.g., "1-2" -> 1.5).'
                    )}
                ] + few_shot_examples + [
                    {'role': 'user', 'content': f"Extract from: {text}"}
                ],
                format=IngredientParsed.model_json_schema(),
                options={
                    'temperature': 0, 
                    'num_ctx': 1024,
                    'num_predict': 128
                }
            )
            return IngredientParsed.model_validate_json(response.message.content)
        except Exception as e:
            return None

# --- BATCH MANAGER ---
async def process_recipe_batch(client, recipes: List[dict], semaphore: asyncio.Semaphore):
    tasks = []
    map_indices = [] 

    for r_idx, recipe in enumerate(recipes):
        raw_ings = recipe.get("ingredients", [])
        
        # Safety check: Ensure raw_ings is actually a list
        if not isinstance(raw_ings, list): continue

        for i_idx, ing_text in enumerate(raw_ings):
            if not isinstance(ing_text, str): continue
            
            tasks.append(parse_single_ingredient(client, ing_text, semaphore))
            map_indices.append((r_idx, i_idx))

    if not tasks:
        return recipes

    # Run in parallel
    results = await asyncio.gather(*tasks)

    # Inject results
    for result, (r_idx, i_idx) in zip(results, map_indices):
        original_text = recipes[r_idx]["ingredients"][i_idx]
        
        if result:
            recipes[r_idx]["ingredients"][i_idx] = {
                "original": original_text,
                "amount": result.amount,
                "unit": result.unit,
                "food": result.food,
                "info": result.additional_info,
                "allergies": result.allergies
            }
        else:
            recipes[r_idx]["ingredients"][i_idx] = {
                "original": original_text,
                "amount": None,
                "unit": "",
                "food": original_text,
                "info": "FAILED_TO_PARSE",
                "allergies": ""
            }

    return recipes

async def main():
    print(f"Connecting to GPU Ollama at {OLLAMA_HOST}...")
    client = AsyncClient(host=OLLAMA_HOST, timeout=30.0) # Faster timeout for GPU
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

    # Load & Resume Logic
    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            done_count = sum(1 for _ in f)
    except FileNotFoundError:
        done_count = 0

    print(f"Resuming from recipe #{done_count}...")

    with open(INPUT_FILE, 'r', encoding='utf-8') as f_in, \
         open(OUTPUT_FILE, 'a', encoding='utf-8') as f_out:
        
        for _ in range(done_count):
            next(f_in)
        
        batch_buffer = []
        
        for line in f_in:
            if not line.strip(): continue
            try:
                batch_buffer.append(json.loads(line))
            except json.JSONDecodeError:
                continue
            
            if len(batch_buffer) >= RECIPE_BATCH_SIZE:
                start_t = time.time()
                
                enriched_recipes = await process_recipe_batch(client, batch_buffer, semaphore)
                
                for recipe in enriched_recipes:
                    f_out.write(json.dumps(recipe, ensure_ascii=False) + "\n")
                f_out.flush()
                
                dt = time.time() - start_t
                
                # Calculate throughput stats
                total_ings = sum(len(r.get("ingredients", [])) for r in batch_buffer)
                ings_per_sec = total_ings / dt if dt > 0 else 0
                
                print(f"🚀 Batch Saved. Speed: {ings_per_sec:.1f} ingredients/sec")
                
                batch_buffer = []

        if batch_buffer:
            enriched_recipes = await process_recipe_batch(client, batch_buffer, semaphore)
            for recipe in enriched_recipes:
                f_out.write(json.dumps(recipe, ensure_ascii=False) + "\n")
            print("Job Complete.")

if __name__ == "__main__":
    asyncio.run(main())