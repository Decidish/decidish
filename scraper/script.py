import json
import os
import time
import xml.etree.ElementTree as ET

from recipe_scrapers import scrape_html, AbstractScraper
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# --- CONFIGURATION ---
SITEMAP_URL = "https://www.rewe.de/sitemaps/sitemap-rezepte.xml"
DB_FILE = "recipes_db.json"
# Save every N recipes to disk (to prevent data loss)
SAVE_INTERVAL = 10
# Time to wait between requests to avoid getting IP banned (seconds)
SLEEP_TIME = 3


def get_all_recipe_urls():
    """
    Fetches the XML sitemap and extracts all recipe URLs.
    """
    print(f"Fetching sitemap from: {SITEMAP_URL}...")

    print("Parsing XML...")

    with open("urlset.xml", 'r', encoding='utf-8') as f:
        response = f.read()

    root = ET.fromstring(response)

    urls = []
    for url in root:
        for child in url:
            if "loc" in child.tag:
                urls.append(child.text)

    print(f"Found {len(urls)} recipes in sitemap.")
    return urls


def init_driver():
    """
    Initializes a Headless Chrome Driver.
    """
    chrome_options = Options()
    # Run in background (Headless)
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])

    # Optimization: Don't load images (speeds up scraping significantly)
    prefs = {"profile.managed_default_content_settings.images": 2}
    chrome_options.add_experimental_option("prefs", prefs)

    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)


def load_database():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_database(data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("Database saved.")

def get_rewe_recipe_selenium(url):
    print(f"Launching Browser to fetch: {url}...")

    # Setup Chrome Options
    chrome_options = Options()

    # --- STEALTH SETTINGS ---
    # These flags help hide the fact that this is an automated bot
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)

    # Uncomment the line below to run in background (headless) mode
    # chrome_options.add_argument("--headless")

    # Initialize the Driver
    # ChromeDriverManager automatically downloads the correct driver version
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        # Load the Page
        driver.get(url)

        # Wait for JavaScript to load content.
        # If you see a Cookie banner, you usually don't need to click it
        # for the scraper to work, as the recipe data is already in the HTML.
        time.sleep(5)

        # Get the HTML
        html_content = driver.page_source

        # Pass HTML to recipe-scrapers
        # We pass the raw HTML we got from Selenium into the library
        scraper = scrape_html(html=html_content, org_url=url, wild_mode=True)

        if not scraper:
            raise Exception("Couldn't scrape")

        return scraper.to_json(), scraper.title()

    except Exception as e:
        print(f"\n[!] Error: {e}")

    finally:
        # Always close the browser
        driver.quit()

def main():
    # Get List of all URLs
    all_urls = get_all_recipe_urls()

    # Load existing data (to resume if stopped)
    database = load_database()
    print(f"Loaded {len(database)} recipes from existing database.")

    # Filter out URLs we already scraped
    urls_to_scrape = [u for u in all_urls if u not in database]
    print(f"{len(urls_to_scrape)} new recipes to scrape.")

    if not urls_to_scrape:
        print("All recipes scraped!")
        return

    # Start Selenium
    driver = init_driver()

    try:
        for url in urls_to_scrape:
            result = get_rewe_recipe_selenium(url)

            # Check if the result is valid (not None and has 2 items)
            if result and len(result) == 2:
                entity, title = result
                print(f"Success: {title}")
                database[url] = entity
                print("Saved", title, "into database.")
            else:
                print(f"Skipping {url}: Data could not be retrieved.")
                # You can add 'continue' here if this is inside a loop

    except KeyboardInterrupt:
        print("\nStopping scraper...")

    finally:
        save_database(database)
        driver.quit()
        print("Done.")


if __name__ == "__main__":
    main()