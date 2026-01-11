import json
import re
import sklearn_crfsuite
from sklearn_crfsuite import metrics
from sklearn.model_selection import train_test_split

INPUT_FILE = "data/ingredient_parser_data/training_data.json"

def tokenize(text):
    """
    Custom tokenizer to handle decimals and German characters.
    Splits on whitespace but keeps punctuation separate.
    """
    return re.findall(r"\w+|[^\w\s]", text, re.UNICODE)

def get_bio_tags(tokens, annotation):
    """
    Converts JSON labels into a list of BIO tags matching the tokens.
    """
    tags = ['O'] * len(tokens)

    # Mapping JSON keys to BIO entities
    field_map = {
        'qty': 'QTY',
        'unit': 'UNIT',
        'name': 'NAME',
        'comment': 'COMMENT'
    }

    for json_key, bio_tag in field_map.items():
        value = annotation.get(json_key)
        if not value:
            continue

        value_tokens = tokenize(str(value))

        n = len(value_tokens)
        if n == 0: continue

        for i in range(len(tokens) - n + 1):
            if tokens[i:i+n] == value_tokens:
                tags[i] = f"B-{bio_tag}"
                for j in range(1, n):
                    tags[i+j] = f"I-{bio_tag}"
                break

    return tags

def word2features(sent, i):
    word = sent[i]

    features = {
        'bias': 1.0,
        'word.lower()': word.lower(),
        'word.isupper()': word.isupper(),
        'word.isdigit()': word.isdigit(),
        'word.is_decimal': bool(re.match(r"^\d+\.\d+$", word)),
        'word[-2:]': word[-2:],
    }

    # Previous word features
    if i > 0:
        word1 = sent[i-1]
        features.update({
            '-1:word.lower()': word1.lower(),
            '-1:word.isdigit()': word1.isdigit(),
        })
    else:
        features['BOS'] = True

    # Next word features
    if i < len(sent)-1:
        word1 = sent[i+1]
        features.update({
            '+1:word.lower()': word1.lower(),
        })
    else:
        features['EOS'] = True

    return features

def sent2features(sent):
    return [word2features(sent, i) for i in range(len(sent))]

print(f"Loading data from {INPUT_FILE}...")

try:
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
except FileNotFoundError:
    print(f"Error: Could not find {INPUT_FILE}. Please create it first.")
    exit()

print(f"Loaded {len(raw_data)} examples.")

X = []
y = []

skipped_count = 0

for item in raw_data:
    text = item['text']
    labels = item['labels']

    tokens = tokenize(text)
    tags = get_bio_tags(tokens, labels)

    if all(t == 'O' for t in tags) and len(labels) > 0:
        skipped_count += 1
        continue

    X.append(sent2features(tokens))
    y.append(tags)

print(f"Skipped {skipped_count} items due to alignment errors.")
print(f"Training on {len(X)} valid items.")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training CRF model...")
crf = sklearn_crfsuite.CRF(
    algorithm='lbfgs',
    c1=0.1,
    c2=0.1,
    max_iterations=100,
    all_possible_transitions=True
)
crf.fit(X_train, y_train)
labels = list(crf.classes_)
labels.remove('O')
y_pred = crf.predict(X_test)
score = metrics.flat_f1_score(y_test, y_pred, average='weighted', labels=labels)

print(f"\nModel F1 Score: {score:.4f}")
print("\nDetailed Report:\n")
print(metrics.flat_classification_report(y_test, y_pred, labels=labels))

import joblib

# Replace your current shutil export with this:
joblib.dump(crf, "ingredient_model.joblib")
print("Model saved as ingredient_model.joblib")