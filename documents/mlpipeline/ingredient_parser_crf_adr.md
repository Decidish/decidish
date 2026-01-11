# Parsing of Ingredients to get units and amount

## Context and Problem Statement

The problem is that, in almost all the recipes, that we have. The ingredients are in text format. 
We need to be able to retrieve the amount of needed products by mapping these ingredients to actual items.
This is a classical NLP problem, where the ingredients may have arbitrary forms, which is not always captured by a regex.
One of those cases is "fresh Lemons", which indicates an adjective rather than the food itself. 
Or types of "200.0 g of REWE Yoghurt", where we need to accurately understand whether something is a brand name or an adjective etc and get the 200 g as unit amount.

## Considered Options

* Regex
* DistillBERT
* Conditional Random Field (CRF)

## Decision Outcome

_We chose to proceed with the **CRF**_, as it is the best option for us. While not working with new recipes out of the gate.
After creating a training data set using Gemini 3 Pro, we trained our own CRF on roughly 2000 different ingredients, covering most of the test cases.

Regex was the fastest option, but as mentioned was not able to handle some german words or some adjectives which looked like food names, was not accurate enough for us. Although fastest with <0.1ms time for an ingredient.

DistillBERT was the most complex one out of the options. Therefore it was also slow, which didn't make that much sense for us, since we have over 40.000 ingredients out of the gate for a mere 12000 recipes that we scraped. 
For future scope, when we want to scale and add more recipes, it will take too long, where each recipe takes around 150-500 ms per ingredient.

**CRF** was a good balance between the two. Although it had a worse accuracy `F1 Score: 0.9719` compared to DistillBERT, but much faster around 1-5ms per ingredient, 
which makes it a more viable option.
