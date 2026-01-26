import json
import os
import time
import random
import requests
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from recipe_scrapers import scrape_html
import urllib

# --- CONFIGURATION ---
INPUT_FILE = "urlset_rewe.xml"     # Your local sitemap file
DB_FILE = "recipes_db.jsonl"  # Output file (Crash-safe)
MAX_WORKERS = 5               # Parallel downloads
MIN_SLEEP = 1.0               # Min wait time per thread
MAX_SLEEP = 3.0               # Max wait time per thread

# Headers to prevent 403 Forbidden errors
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7"
}

def get_urls_from_local_file():
    """Reads the local XML file and extracts ONLY /recipe/ URLs."""
    print(f"Reading URLs from: {INPUT_FILE}...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"[!] Error: {INPUT_FILE} not found in the current directory.")
        return []

    try:
        # Parse XML directly from file
        tree = ET.parse(INPUT_FILE)
        root = tree.getroot()
        
        urls = []
        
        # Iterating over all elements is safer than XPath for namespaces
        for elem in root.iter():
            # Check if the tag ends with 'loc' (ignoring namespace prefix)
            if elem.tag.endswith('loc'):
                url = elem.text.strip() if elem.text else ""
                
                # --- FILTER APPLIED HERE ---
                # Only keep URLs that have '/recipe/' in the path
                # if "/recipe/" in url:
                #     urls.append(url)
                urls.append(url)
            
        print(f"Found {len(urls)} valid recipe URLs (filtered from total).")
        return urls
        
    except ET.ParseError as e:
        print(f"[!] XML Parse Error: {e}")
        return []
    except Exception as e:
        print(f"[!] Error reading file: {e}")
        return []

def get_existing_urls():
    """Reads the JSONL file to see what we already finished."""
    if not os.path.exists(DB_FILE):
        return set()
    
    existing = set()
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                url = data.get('canonical_url') or data.get('url')
                if url:
                    existing.add(url)
            except:
                continue
    return existing

def scrape_single_url(url, session):
    """Scrapes a single URL. Returns dict or None."""
    time.sleep(random.uniform(MIN_SLEEP, MAX_SLEEP))
    
    try:
        resp = session.get(url, headers=HEADERS, timeout=15)
        
        if resp.status_code != 200:
            print(f"[!] Failed {resp.status_code}: {url}")
            return None

        scraper = scrape_html(resp.text, org_url=url)
        data = scraper.to_json()
        data['canonical_url'] = url 
        
        return data

    except Exception as e:
        # Just print the first line of the error to keep logs clean
        print(f"[!] Error on {url}: {str(e).splitlines()[0][:50]}...")
        return None

def save_recipe(data):
    """Appends a single recipe to the JSONL file."""
    with open(DB_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(data, ensure_ascii=False) + "\n")

def main():
    # 1. Get filtered targets
    all_urls = get_urls_from_local_file()
    
    if not all_urls:
        print("No URLs found matching the '/recipe/' filter.")
        return

    # 2. Filter out already scraped
    existing_urls = get_existing_urls()
    print(f"Already scraped: {len(existing_urls)}")
    
    urls_to_scrape = [u for u in all_urls if u not in existing_urls]
    print(f"Remaining to scrape: {len(urls_to_scrape)}")
    
    if not urls_to_scrape:
        print("All matching URLs are already scraped!")
        return

    # 3. Setup Session
    session = requests.Session()

    # 4. Start Parallel Scraping
    print(f"Starting scraper with {MAX_WORKERS} workers...")
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_url = {executor.submit(scrape_single_url, url, session): url for url in urls_to_scrape}
        
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                data = future.result()
                if data:
                    save_recipe(data)
                    print(f"[+] Saved: {data.get('title', 'Unknown Title')}")
            except Exception as exc:
                print(f"[!] Unexpected thread error: {exc}")

    print("Done.")

if __name__ == "__main__":
    main()