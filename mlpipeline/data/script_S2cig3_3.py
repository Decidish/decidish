import re
from fractions import Fraction

import pandas as pd
import numpy as np
from imblearn.over_sampling import RandomOverSampler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import balanced_accuracy_score
from sklearn.model_selection import train_test_split

seed = 2024

# pandas, statsmodels, matplotlib and y_data_profiling rely on numpy's random generator, and thus, we need to set the seed in numpy
np.random.seed(seed)

# Preprocess diet.csv
diet_df = pd.read_csv('diet.csv')
diet_df = diet_df.dropna(subset=['Diet'])
# Use one hot encoding to convert categorical data to numerical
diet_df = pd.get_dummies(diet_df, columns=['Diet'], dtype=int)

# Preprocess recipes.csv
# Create static arrays for the ingredients
def classify_diet(products):
    meat_keywords = ["beef", "pork", "chicken", "lamb", "veal", "venison", "duck", "turkey",
                     "bacon", "sausage", "ham", "salami", "pepperoni", "bison", "rabbit", "quail",
                     "goose", "partridge", "pheasant", "kangaroo", "elk", "buffalo", "boar", "horse"]

    fish_keywords = ["salmon", "tuna", "cod", "trout", "mackerel", "bass", "catfish", "halibut",
                     "tilapia", "snapper", "sardine", "anchovy", "haddock", "sole", "flounder", "swordfish",
                     "shrimp", "lobster", "crab", "clam", "mussel", "oyster", "scallop", "squid"]

    animal_product_keywords = ["egg", "milk", "butter", "cheese", "yogurt", "cream", "honey", "gelatin", "ghee"]

    veg_check = ["vegan", "vegetarian"]

    for product in products:
        product_lower = product.lower()

        # Check for explicit non-vegetarian ingredients
        if any(keyword in product_lower for keyword in meat_keywords):
            if not (any(keyword1 in product_lower for keyword1 in veg_check)):
                return "Omnivore"
        elif any(keyword in product_lower for keyword in fish_keywords):
            if not (any(keyword1 in product_lower for keyword1 in veg_check)):
                return "Omnivore"

    # If no non-vegetarian ingredients found, check for vegetarian/vegan status
    for product in products:
        product_lower = product.lower()
        if any(keyword in product_lower for keyword in animal_product_keywords):
            return "Vegetarian"

    return "Vegan"


def extract_ingredients(s):
    # Use regular expression to find all occurrences of quoted strings
    matches = re.findall(r'\"\\"(.*?)\\"\"', s)
    # Return the list of matched string
    return matches


def sum_of_fractions(arr):
    total = 0
    for s in arr:
        if '-' in s:  # It's a range
            min_val, max_val = s.split('-')
            # Convert to fractions and calculate the average
            avg_val = (convert_to_fraction(min_val.strip()) + convert_to_fraction(max_val.strip())) / 2
            total += avg_val
        else:  # It's a single value
            total += convert_to_fraction(s)
    return total


def convert_to_fraction(s):
    """Convert a string to a Fraction. Handles mixed numbers."""
    if ' ' in s:  # It's a mixed number
        whole, frac = s.split()
        return Fraction(whole) + Fraction(frac)
    else:  # It's a whole number or fraction
        return Fraction(s)


recipes_df = pd.read_csv('recipes.csv')

# Get number of ingredients using quantities
recipes_df['Ingredients'] = recipes_df['RecipeIngredientParts'].apply(extract_ingredients)
recipes_df['RecipeDiet'] = recipes_df['Ingredients'].apply(classify_diet)
# Use one hot encoding to convert categorical data to numerical
recipes_df = pd.get_dummies(recipes_df, columns=['RecipeDiet'], dtype=int)

recipes_df['Quantities'] = recipes_df['RecipeIngredientQuantities'].apply(extract_ingredients)
recipes_df['Quantities'] = recipes_df['Quantities'].apply(sum_of_fractions).astype(float)

# Fill recipe servings with mean
recipes_df['RecipeServings'] = (recipes_df['RecipeServings'].fillna(recipes_df['RecipeServings'].mean()))
recipes_df['RecipeCategory'] = recipes_df['RecipeCategory']
# Use one hot encoding to convert categorical data to numerical
recipes_df = pd.get_dummies(recipes_df, columns=['RecipeCategory'], dtype=int)
recipes_df.drop(['RecipeIngredientParts', 'RecipeIngredientQuantities', 'RecipeYield', 'Ingredients', 'Name'], axis=1,
                inplace=True)

# Preprocess reviews.csv
reviews_df = pd.read_csv('reviews.csv')

# fill rating with mean
reviews_df['Rating'] = reviews_df['Rating'].fillna(reviews_df['Rating'].mean())

# Preprocess requests.csv
requests_df = pd.read_csv('requests.csv')
requests_df['HighProtein'] = requests_df['HighProtein'].map({'Indifferent': 0.5, 'Yes': 1})
requests_df['LowSugar'] = requests_df['LowSugar'].map({'Indifferent': 0.5, '0': 0})


# Merge Requests and Reviews
requests_reviews_df = pd.merge(requests_df, reviews_df, on=['AuthorId', 'RecipeId'], how='inner')

# Merge Requests_Reviews and Recipes
requests_reviews_recipes_df = pd.merge(requests_reviews_df, recipes_df, on='RecipeId', how='inner')

# Merge Requests_Reviews_Recipes and Diet
final_df = pd.merge(requests_reviews_recipes_df, diet_df, on='AuthorId', how='inner')

test_df = final_df[final_df['Like'].isna()]

final_df = final_df.dropna(subset=['Like'])
final_df['Like'] = final_df['Like'].astype(int)

# Get recipe popularity order by number of likes
recipe_popularity = final_df.groupby(['RecipeId']).sum()['Like']

final_df['RecipePopularity'] = final_df['RecipeId'].map(recipe_popularity)

train_df = final_df
test_df['RecipePopularity'] = test_df['RecipeId'].map(recipe_popularity)
test_df['RecipePopularity'] = test_df['RecipePopularity'].fillna(0)

# order test_df by TestSetId
test_df = test_df.sort_values(by=['TestSetId'])
check_df = test_df
test_df = test_df.drop(['Like', 'AuthorId', 'RecipeId', 'TestSetId'], axis=1)

# Use random forest to predict Like
X = train_df.drop(['Like', 'AuthorId', 'RecipeId', 'TestSetId'], axis=1)
y = train_df['Like']

over_sampler = RandomOverSampler(sampling_strategy="minority")

X, y = over_sampler.fit_resample(X, y)

rf = GradientBoostingClassifier(n_estimators=500)

rf.fit(X, y)

y_pred = rf.predict(test_df)

# Write to csv with according TestSetId
check_df['Like'] = y_pred

# Get predictions from check_df
predictions_df = check_df[['TestSetId', 'Like']]
# Rename TestSetId to id and Like to prediction
predictions_df = predictions_df.rename(columns={'TestSetId': 'id', 'Like': 'prediction'})
predictions_df['id'] = predictions_df['id'].astype(int)
# Save to csv
predictions_df.to_csv('predictions_S2cig3_3.csv', index=False)

