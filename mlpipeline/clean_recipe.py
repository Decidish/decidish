# Chen Jia
# begin: 2025/12/5 18:20

import json
from typing import Dict, Any, List, Set
from preference import preferences, keyword_preference_map


def load_recipe(json_path: str = "recipes_db.json"):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data


def get_key_words_set(data: Dict) -> Set:
    keywords_list = []
    for _, item in data.items():
        # print(f"the keys has: {item.keys()}")
        keywords = item.get("keywords")
        if keywords is not None:
            keywords_list.extend(keywords)
    result = set(keywords_list)
    return result


def verify_preference_list(our_list: Dict, json_set: Set):
    mark = []
    for item in our_list.keys():
        if item in json_set:
            mark.append("True")
        else:
            mark.append("False")
    positive = mark.count("True")
    negative = mark.count("False")
    return positive, negative


def generate_new_json(data: Dict) -> Dict:
    result = {}
    for k, v in data.items():
        result[k] = {}
        ingridients = ", ".join(v["ingredients"])
        category = v.get("category") or ''
        description = v.get("description") or ''
        recipes = category + "\n" + description + "\n" + ingridients
        result[k]["recipes"] = recipes
        for i in preferences:
            result[k][i] = 0
        keywords = v.get("keywords")
        if keywords is not None:
            for key in keywords:
                label = keyword_preference_map.get(key)
                if label is not None:
                    result[k][label] = 1
    return result


def write_json(json_path, data):
    with open(json_path, 'w', encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


if __name__ == "__main__":
    OUT_PATH = "recipe.json"
    data = load_recipe()
    keywords = get_key_words_set(data)
    positive, negative = verify_preference_list(keyword_preference_map, keywords)
    print(f"keywords length is: {len(keywords)}\nthe keywords set is: {keywords}")
    print(f"the positive number is: {positive}, and negative number is: {negative}")
    new_dict = generate_new_json(data)
    write_json(OUT_PATH, new_dict)
