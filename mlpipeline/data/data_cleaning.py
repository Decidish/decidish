# Chen Jia
# begin: 2025/11/26 11:26

import pandas as pd
import os
import ast
import re

df_request = pd.read_csv("requests.csv")
df_recipes = pd.read_csv("recipes.csv")
df_reviews = pd.read_csv("reviews.csv")

# =========CLEAN REQUESTS===========
map_req = {
    "Indifferent": 0,
    "Yes": 1,
}

# rec_small = df_recipes[["RecipeId", "SugarContent"]]
# merged = df_request.merge(rec_small, on="RecipeId", how="left")
#
# print(merged["LowSugar"].value_counts())
# print(merged.groupby("LowSugar")["SugarContent"].mean())

df_request["Time"] = df_request["Time"].astype(int)
cols_keep_req = ["AuthorId", "RecipeId", "Time", "HighCalories", "LowFat", "HighFiber"]
req_subset = df_request[cols_keep_req]
req_subset = req_subset.replace(map_req)

os.makedirs("cleaned", exist_ok=True)
req_subset.to_csv("cleaned/requests.csv", index=False)
# =========END REQUESTS===========

# =========CLEAN RECIPES===========
df_recipes = df_recipes[df_recipes["CookTime"] != 0]


def parse_c_list(s):
    s = s.strip()
    s = re.sub(r'^c\(|\)$', '', s)
    if not s:
        return []
    s = s.replace('\\"', '')
    items = [item.strip().strip('"') for item in s.split(",")]
    return items


# # test = 'c("\"6\"", "\"2\"", "\"1 1/2\"", "\"1/4\"", "\"1/2\"", "\"4\"", "\"1 1/2\"", "\"1 1/2\"", "\"5\"", "\"12\"")'
# # print(parse_c_list(test))
# df_recipes["Q_list"] = df_recipes["RecipeIngredientQuantities"].apply(parse_c_list)
# df_recipes["P_list"] = df_recipes["RecipeIngredientParts"].apply(parse_c_list)
#
# df_rec = df_recipes[df_recipes["Q_list"].str.len() == df_recipes["P_list"].str.len()]
# df_bad = df_recipes[df_recipes["Q_list"].str.len() != df_recipes["P_list"].str.len()]
# # print(df_bad[["RecipeId"]])

cols_not_keep_rec = ["RecipeIngredientQuantities", "RecipeYield"]
rec_subset = df_recipes.drop(columns=cols_not_keep_rec)
rec_subset.to_csv("cleaned/recipes.csv")

# =========END RECIPES===========

# =========CLEAN REVIEWS===========
df_reviews = df_reviews[df_reviews["Like"].notna()]
df_reviews = df_reviews.drop(columns=["TestSetId", "Rating"])
df_reviews["Like"] = df_reviews["Like"].astype(int)

df_reviews.to_csv("cleaned/reviews.csv", index=False)
# =========END REVIEWS===========
