import json
import time
import asyncio
from ollama import AsyncClient
from pydantic import BaseModel, Field
from typing import Optional, List

# --- CONFIGURATION ---
INPUT_FILE = "data/recipes.jsonl"
OUTPUT_FILE = "data/recipes_enriched.jsonl"
OLLAMA_HOST = "http://localhost:11434"

# MODEL CHOICE
# We switch to Qwen 2.5 3B. It is 3x faster than Llama 8B and smarter at JSON.
MODEL = "qwen2.5:3b"

# PERFORMANCE TUNING
# We process recipes in batches to keep the disk I/O smooth
RECIPE_BATCH_SIZE = 50
# We keep 20 requests "in flight". 
# 4 will execute on GPU instantly (due to OLLAMA_NUM_PARALLEL=4), 
# the rest wait in the queue for a slot.
MAX_CONCURRENT_REQUESTS = 16

# --- SCHEMA (With "Thinking" Field) ---
class IngredientParsed(BaseModel):
    # The 'reasoning' field is the secret sauce. 
    # It forces the model to "think" before it extracts, preventing confusion.
    reasoning: str = Field(description="Brief logic: Identify the specific ingredient and quantity, ignoring context noise.")
    amount: Optional[float] = Field(description="Decimal value. Example: '1/2' -> 0.5. Null if no number.")
    unit: str = Field(description="The unit detected. Standardize (e.g. 'tbsp.' -> 'tbsp').")
    food: str = Field(description="Main ingredient name (English or German).")
    additional_info: str = Field(description="Adjectives/Prep (e.g. 'diced', 'gewürfelt').")
    allergies: str = Field(description="Comma-separated allergens (e.g. 'Gluten, Dairy') or 'None'.")

# --- SINGLE INGREDIENT PROCESSOR ---
async def parse_single_ingredient(client, text: str, semaphore: asyncio.Semaphore) -> Optional[IngredientParsed]:
    async with semaphore: 
        try:
            # We provide a concise context to save tokens (speed up)
            system_prompt = (
                "You are a strict bilingual ingredient parser (DE/EN). "
                "Analyze the text. Extract structured data. "
                "Detect allergies (Gluten, Dairy, Nuts, Soy, Eggs, etc)."
            )

            # Minimal few-shot to show the format and the "reasoning" style
            # This teaches the model to fix the "confusion" issues you saw.
            few_shot_examples = [
                {'role': 'user', 'content': 'Extract from: 175g Frischkäse'},
                {'role': 'assistant', 'content': json.dumps({
                    "reasoning": "Quantity is 175, unit is g. Main item is Frischkäse (Dairy).",
                    "amount": 175.0, "unit": "g", "food": "Frischkäse", 
                    "additional_info": "", "allergies": "Dairy"
                })},
                {'role': 'user', 'content': 'Extract from: Mix with the eggs'},
                {'role': 'assistant', 'content': json.dumps({
                    "reasoning": "No quantity provided. Main item is eggs. 'Mix with' is instruction.",
                    "amount": None, "unit": "", "food": "eggs", 
                    "additional_info": "", "allergies": "Eggs"
                })},
                 {'role': 'user', 'content': 'Extract from: 2 large apples'},
                {'role': 'assistant', 'content': json.dumps({
                    "reasoning": "Count is 2. Item is apples.",
                    "amount": 2.0, "unit": "", "food": "apples", 
                    "additional_info": "large", "allergies": "None"
                })},
            ]

            response = await client.chat(
                model=MODEL,
                messages=[
                    {'role': 'system', 'content': system_prompt}
                ] + few_shot_examples + [
                    {'role': 'user', 'content': f"Extract from: {text}"}
                ],
                format=IngredientParsed.model_json_schema(),
                options={
                    'temperature': 0, 
                    'num_ctx': 512, # Smaller context = Faster processing
                    'num_predict': 128
                }
            )
            return IngredientParsed.model_validate_json(response.message.content)
        except Exception as e:
            # print(f"Error parsing '{text}': {e}") # Uncomment to debug
            return None

# --- BATCH MANAGER ---
async def process_recipe_batch(client, recipes: List[dict], semaphore: asyncio.Semaphore):
    tasks = []
    map_indices = [] # Keeps track of where to put the result back

    # Flatten the batch: Get all ingredients from all 50 recipes into one list
    for r_idx, recipe in enumerate(recipes):
        raw_ings = recipe.get("ingredients", [])
        if not isinstance(raw_ings, list): continue

        for i_idx, ing_text in enumerate(raw_ings):
            if isinstance(ing_text, str) and ing_text.strip():
                tasks.append(parse_single_ingredient(client, ing_text, semaphore))
                map_indices.append((r_idx, i_idx))

    if not tasks:
        return recipes

    # Run them all concurrently
    results = await asyncio.gather(*tasks)

    # Reassemble
    for result, (r_idx, i_idx) in zip(results, map_indices):
        original_text = recipes[r_idx]["ingredients"][i_idx]
        
        if result:
            recipes[r_idx]["ingredients"][i_idx] = result.model_dump(mode='json')
            recipes[r_idx]["ingredients"][i_idx]['original'] = original_text
        else:
            # Fallback for errors
            recipes[r_idx]["ingredients"][i_idx] = {
                "original": original_text,
                "food": original_text,
                "error": "PARSE_FAILED"
            }

    return recipes

async def main():
    print(f"🚀 Connecting to Ollama ({MODEL})...")
    client = AsyncClient(host=OLLAMA_HOST, timeout=60.0) 
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

    # Resume Logic
    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            done_count = sum(1 for _ in f)
    except FileNotFoundError:
        done_count = 0

    print(f"⏩ Resuming from recipe #{done_count}...")

    with open(INPUT_FILE, 'r', encoding='utf-8') as f_in, \
         open(OUTPUT_FILE, 'a', encoding='utf-8') as f_out:
        
        # Fast-forward
        for _ in range(done_count):
            next(f_in)
        
        batch_buffer = []
        
        for line in f_in:
            if not line.strip(): continue
            try:
                batch_buffer.append(json.loads(line))
            except json.JSONDecodeError:
                continue
            
            # When buffer hits batch size, process!
            if len(batch_buffer) >= RECIPE_BATCH_SIZE:
                start_t = time.time()
                
                enriched_recipes = await process_recipe_batch(client, batch_buffer, semaphore)
                
                # Write to disk
                for recipe in enriched_recipes:
                    f_out.write(json.dumps(recipe, ensure_ascii=False) + "\n")
                f_out.flush()
                
                dt = time.time() - start_t
                
                # Stats
                total_ings = sum(len(r.get("ingredients", [])) for r in batch_buffer)
                speed = total_ings / dt if dt > 0 else 0
                print(f"📦 Batch Saved. Speed: {speed:.1f} ingredients/sec")
                
                batch_buffer = []

        # Cleanup final batch
        if batch_buffer:
            enriched_recipes = await process_recipe_batch(client, batch_buffer, semaphore)
            for recipe in enriched_recipes:
                f_out.write(json.dumps(recipe, ensure_ascii=False) + "\n")
            print("✅ Job Complete.")

if __name__ == "__main__":
    asyncio.run(main())