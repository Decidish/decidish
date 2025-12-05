# Chen Jia
# begin: 2025/11/26 14:07

import pandas as pd
import numpy as np

diet = pd.read_csv("diet.csv")          # AuthorId, Diet, Age
reviews = pd.read_csv("cleaned/reviews.csv")    # AuthorId, RecipeId, Rating, Like
recipes = pd.read_csv("recipes.csv")    # RecipeId, Calories, SugarContent, ProteinContent 等
requests = pd.read_csv("requests.csv")  # AuthorId, RecipeId, Time, HighCalor, HighProte, LowFat, LowSugar, HighFiber

# ---------- User ----------
users = diet[["AuthorId"]].drop_duplicates().reset_index(drop=True)

users["user_idx"] = np.arange(len(users))

# ---------- Diet / Age ----------
user_static = diet[["AuthorId", "Diet", "Age"]].drop_duplicates("AuthorId")

# Diet encoding
user_static["Diet"] = user_static["Diet"].fillna("Unknown")
diet2idx = {d: i for i, d in enumerate(user_static["Diet"].unique())}
user_static["diet_idx"] = user_static["Diet"].map(diet2idx)

# Age bucketing
bins = [0, 20, 30, 40, 50, 120]
labels = [0, 1, 2, 3, 4]
user_static["age_bucket"] = pd.cut(
    user_static["Age"],
    bins=bins,
    labels=labels,
    include_lowest=True
).astype("Int64")

# ---------- Like / Rating ----------
rev_stats = (
    reviews
    .groupby("AuthorId")
    .agg(
        like_count=("Like", "sum"),
        total_count=("Like", "count"),
    )
    .reset_index()
)
rev_stats["like_ratio"] = rev_stats["like_count"] / rev_stats["total_count"]

# ---------- user preference ----------
rev_like = reviews[reviews["Like"] == 1][["AuthorId", "RecipeId"]]

# merge the ingredient information
rev_like_rec = rev_like.merge(
    recipes[["RecipeId", "Calories", "SugarContent", "ProteinContent"]],
    on="RecipeId",
    how="left",
)

nutr_stats = (
    rev_like_rec
    .groupby("AuthorId")
    .agg(
        liked_avg_calories=("Calories", "mean"),
        liked_avg_sugar=("SugarContent", "mean"),
        liked_avg_protein=("ProteinContent", "mean"),
    )
    .reset_index()
)


# ---------- concatenate the features ----------
user_feat = (
    users
    .merge(user_static, on="AuthorId", how="left")
    .merge(rev_stats, on="AuthorId", how="left")
    .merge(nutr_stats, on="AuthorId", how="left")
)

# add 0 to NA
for col in [
    "age_bucket",
    "like_count", "total_count", "avg_rating", "like_ratio",
    "liked_avg_calories", "liked_avg_sugar", "liked_avg_protein",
    "pref_low_sugar",
]:
    if col in user_feat.columns:
        user_feat[col] = user_feat[col].fillna(0)

cols_keep = [
    "AuthorId",
    "user_idx",
    "diet_idx",
    "age_bucket",
    "like_ratio",
    "liked_avg_calories",
    "liked_avg_protein",
]
user_feat = user_feat[cols_keep]

# store into csv
user_feat.to_csv("user_features.csv", index=False)

print("saved user_features.csv, num_users =", len(user_feat))
