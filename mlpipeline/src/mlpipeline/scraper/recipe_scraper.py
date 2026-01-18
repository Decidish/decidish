import json
import os
import time
import xml.etree.ElementTree as ET

from recipe_scrapers import scrape_me

def scrape_recipe(recipe_url: str) -> str:
    """
    Scrapes the recipe from the given URL using recipe-scrapers.
    """
    print(f"Scraping recipe from URL: {recipe_url}")

    # Use recipe-scrapers to parse the HTML
    scraper = scrape_me(recipe_url)

    if not scraper:
        raise Exception("Failed to scrape recipe data")

    return json.dumps(scraper.to_json(), ensure_ascii=False)