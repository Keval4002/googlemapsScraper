const { chromium } = require('playwright');
const config = require('./config');

class GoogleMapsBusinessScraper {
  constructor(options = {}) {
    this.options = options;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    this.page = await this.context.newPage();
    // Stealth: Remove webdriver
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete navigator.__proto__.webdriver;
    });
  }

  getRandomUserAgent() {
    // TODO: Implement user agent rotation
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async scrape(searchTerm, location, maxResults = 9999, progressCb = () => {}) {
    console.log(`[Scraper] Starting scrape for: ${searchTerm} in ${location}`);
    // Build Google Maps search URL
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}+${encodeURIComponent(location)}`;
    await this.page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForTimeout(2000 + Math.random() * 2000);
    await this.page.waitForSelector('div[role="feed"], div[aria-label*="Results for"]', { timeout: 20000 });
    // Wait for the main results list to load
    await this.page.waitForSelector('.XltNde.tTVLSc', { timeout: 20000 });

    // Find the scrollable container
    const allFeeds = await this.page.$$('div[role="feed"]');
    console.log('Number of div[role="feed"] found:', allFeeds.length);
    if (allFeeds.length > 0) {
      const classNames = await Promise.all(allFeeds.map(el => el.getAttribute('class')));
      console.log('Classes of feed divs:', classNames);
    }
    const scrollable = await this.page.$('div[role="feed"]');
    if (!scrollable) {
      console.log('Scrollable element not found.');
      return [];
    }

    // Find business cards
    let cards = await this.page.$$('a.hfpxzc');
    let scrollTries = 0;
    let endOfList = false;
    let lastCardCount = cards.length;
    let lastNewCardTime = Date.now();
    console.time('Scroll to end of list');
    while (!endOfList && scrollTries < 50) {
      await scrollable.evaluate(node => { node.scrollBy(0, 1500); });
      await this.page.waitForTimeout(1000);
      cards = await this.page.$$('a.hfpxzc');
      if (cards.length > lastCardCount) {
        lastCardCount = cards.length;
        lastNewCardTime = Date.now();
      }
      if (Date.now() - lastNewCardTime > 10000) {
        console.log('No new cards loaded for 10 seconds, finishing scroll.');
        break;
      }
      endOfList = await this.page.evaluate(() => document.body.innerText.includes("You've reached the end of the list."));
      scrollTries++;
    }
    console.timeEnd('Scroll to end of list');
    if (endOfList) {
      console.log("We're at the end of the list");
      // Scrape the entire page for urls that start with https://www.google.com/maps/place/
      const placeUrls = await this.page.$$eval('a', links => links.map(link => link.href).filter(href => href.startsWith('https://www.google.com/maps/place/')));
      console.log(`Found ${placeUrls.length} urls that start with https://www.google.com/maps/place/`);
    }
    console.log(`[Scraper] Found ${cards.length} business cards.`);
    cards = cards.slice(0, maxResults);

    // Extract name and url from each card
    const results = [];
    for (let i = 0; i < cards.length; i++) {
      try {
        // Check if this card is sponsored
        const isSponsored = await cards[i].evaluate(card => {
          let el = card;
          for (let j = 0; j < 3; j++) {
            if (!el) break;
            if (el.innerText && el.innerText.includes('Sponsored')) return true;
            el = el.parentElement;
          }
          if (card.parentElement) {
            const sponsored = card.parentElement.querySelector('span, h1');
            if (sponsored && sponsored.innerText && sponsored.innerText.includes('Sponsored')) return true;
          }
          return false;
        });
        if (isSponsored) {
          console.log(`[Scraper] Skipping sponsored card ${i + 1}`);
          continue;
        }
        const url = await cards[i].getAttribute('href');
        results.push({ url });
        progressCb(Math.round(((i + 1) / cards.length) * 100), [...results]);
        console.log(`[Scraper] Found business url: ${url}`);
      } catch (err) {
        console.error(`[Scraper] Error extracting card ${i + 1}:`, err.message);
        continue;
      }
    }
    console.log(`[Scraper] Scraping complete. Total results: ${results.length}`);

    return results;
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = GoogleMapsBusinessScraper;