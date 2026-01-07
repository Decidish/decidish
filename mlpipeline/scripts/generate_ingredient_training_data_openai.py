import argparse
import json
import os
import random
import re
from typing import Any, Dict, List, Optional

from openai import OpenAI

# Validación “real” usando lo mismo que el entrenamiento
from mlpipeline.ingredient_parser.train_crf import tokenize, get_bio_tags

client = OpenAI()

ALLOWED_KEYS = {"qty", "unit", "name", "comment"}

SYSTEM_INSTRUCTIONS = """You annotate recipe ingredient lines.
Return STRICT JSON ONLY (no markdown, no comments).
Schema:
{
  "text": string,
  "labels": {
    "qty": string,
    "unit": string,
    "name": string,
    "comment": string|null
  }
}

Rules:
- labels.qty / labels.unit / labels.name / labels.comment (if not null) MUST be exact substrings of text.
- If there is no comment, set comment to null.
- name must not be empty.
- Prefer qty as a decimal string like "250.0" when a number is present.
- Keep the language consistent with the example data (German is OK).
"""

def _to_floatish_qty(s: str) -> str:
    """Optional: normalize '250' -> '250.0' to match dataset style."""
    if s is None:
        return s
    s = s.strip()
    # If it's an integer number, make it x.0
    if re.fullmatch(r"\d+", s):
        return f"{s}.0"
    return s

def validate_item(item: Dict[str, Any]) -> Optional[str]:
    if not isinstance(item, dict) or "text" not in item or "labels" not in item:
        return "Item must have text and labels"

    text = item["text"]
    labels = item["labels"]

    if not isinstance(text, str) or not isinstance(labels, dict):
        return "text must be str and labels must be dict"

    if set(labels.keys()) != ALLOWED_KEYS:
        return f"Labels keys must be {ALLOWED_KEYS}, got {set(labels.keys())}"

    # Normalize qty format a bit
    if isinstance(labels.get("qty"), str):
        labels["qty"] = _to_floatish_qty(labels["qty"])

    # name required
    if not labels["name"] or not isinstance(labels["name"], str) or not labels["name"].strip():
        return "name is empty"

    # types
    for k in ["qty", "unit", "name"]:
        if labels[k] is None or not isinstance(labels[k], str):
            return f"{k} must be a string"

    if labels["comment"] is not None and not isinstance(labels["comment"], str):
        return "comment must be string or null"

    # substring checks
    for k in ["qty", "unit", "name"]:
        if labels[k] not in text:
            return f"{k}='{labels[k]}' not found in text"

    if labels["comment"] is not None and labels["comment"] not in text:
        return f"comment='{labels['comment']}' not found in text"

    # Validate against BIO tagging logic
    tokens = tokenize(text)
    tags = get_bio_tags(tokens, labels)
    if all(t == "O" for t in tags):
        return "BIO tags are all O (labels don't align with tokenize/get_bio_tags)"

    return None

def load_json_list(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json_list(path: str, data: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def generate_one() -> Dict[str, Any]:
    # Responses API (recommended). Endpoint is /v1/responses. :contentReference[oaicite:2]{index=2}
    resp = client.responses.create(
        model=os.environ.get("OPENAI_MODEL", "gpt-5.2"),
        instructions=SYSTEM_INSTRUCTIONS,
        input="Generate ONE new ingredient line and its labels."
    )
    raw = resp.output_text.strip()
    return json.loads(raw)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="mlpipeline/data/ingredient_parser_data/training_data.json")
    ap.add_argument("--out", dest="out_path", default="mlpipeline/data/ingredient_parser_data/training_data.json")
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--max-tries", type=int, default=5)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    random.seed(args.seed)

    data = load_json_list(args.in_path)
    existing_texts = set(x.get("text") for x in data if isinstance(x, dict))

    new_items: List[Dict[str, Any]] = []
    rejected = 0

    while len(new_items) < args.n:
        ok = False
        for _ in range(args.max_tries):
            try:
                item = generate_one()
            except Exception:
                rejected += 1
                continue

            # Dedup
            if item.get("text") in existing_texts:
                rejected += 1
                continue

            err = validate_item(item)
            if err:
                rejected += 1
                continue

            ok = True
            existing_texts.add(item["text"])
            new_items.append(item)
            break

        if not ok:
            # If we can't get a valid item after retries, stop rather than looping forever
            break

    print(f"Generated valid: {len(new_items)} | rejected: {rejected}")

    if args.dry_run:
        for x in new_items[:5]:
            print(json.dumps(x, ensure_ascii=False))
        return

    data.extend(new_items)
    save_json_list(args.out_path, data)
    print(f"Saved: {args.out_path} | total: {len(data)}")

if __name__ == "__main__":
    main()
