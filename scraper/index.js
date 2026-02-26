'use strict';

/**
 * Price Scraper — fetches active competitor URLs from Supabase,
 * extracts prices from HTML pages, and inserts results into price_history.
 *
 * Runs on GitHub Actions (CRON: 06:00 and 18:00 UTC) at zero cost.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// ─── Environment ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only validate env and create client when running as main script (not in tests)
let supabase = null;
if (require.main === module) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '[scraper] ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ─── Config ───────────────────────────────────────────────────────────────────
/** Milliseconds to wait between requests to avoid hammering servers. */
const DELAY_MS = 2000;

/** HTTP request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 15000;

/** Browser-like User-Agent to reduce bot-detection blocks. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for `ms` milliseconds. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract a numeric price from a raw text string.
 * Handles Hungarian HUF formats ("12 990 Ft", "12.990 Ft", "12,990")
 * as well as standard decimal formats ("99.99", "1,234.56").
 *
 * @param {string} text
 * @returns {number|null}
 */
function extractPrice(text) {
  if (!text) return null;

  const cleaned = text.trim();

  // ── Hungarian HUF patterns ─────────────────────────────────────────────────
  // e.g. "12 990 Ft", "12.990 Ft", "12 990,- Ft", "12990 Ft"
  const hufMatch = cleaned.match(
    /(\d[\d\s.,]*\d|\d)\s*(?:Ft|HUF|forint)/i
  );
  if (hufMatch) {
    return parseHungarianNumber(hufMatch[1]);
  }

  // ── Generic price patterns ─────────────────────────────────────────────────
  // e.g. "$99.99", "€1.234,56", "1,234.56", "1 234.56"
  const genericMatch = cleaned.match(
    /[€$£]?\s*(\d[\d\s.,]*\d|\d)\s*(?:[€$£]|USD|EUR|GBP)?/
  );
  if (genericMatch) {
    return parseGenericNumber(genericMatch[1]);
  }

  return null;
}

/**
 * Parse a Hungarian-formatted number string.
 * Thousands separator is a space or period; decimal separator is a comma.
 * e.g. "12 990" → 12990, "12.990" → 12990, "12.990,50" → 12990.50
 *
 * @param {string} str
 * @returns {number|null}
 */
function parseHungarianNumber(str) {
  if (!str) return null;
  const s = str.trim().replace(/\s+/g, '');

  // If there's a comma it's the decimal separator: "12.990,50" → "12990.50"
  if (s.includes(',')) {
    const normalized = s.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(normalized);
    return isFinite(val) ? val : null;
  }

  // No comma — dots are thousand separators: "12.990" → 12990
  const normalized = s.replace(/\./g, '');
  const val = parseFloat(normalized);
  return isFinite(val) ? val : null;
}

/**
 * Parse a generic price number (handles "1,234.56", "1 234,56", "1234.56").
 *
 * @param {string} str
 * @returns {number|null}
 */
function parseGenericNumber(str) {
  if (!str) return null;
  const s = str.trim();

  // Detect decimal separator: last `.` or `,` that separates cents
  const lastDot   = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  let normalized;
  if (lastComma > lastDot) {
    // Comma is decimal separator: "1.234,56" → "1234.56"
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Dot is decimal separator (or no decimals): "1,234.56" → "1234.56"
    normalized = s.replace(/,/g, '').replace(/\s+/g, '');
  }

  const val = parseFloat(normalized);
  return isFinite(val) ? val : null;
}

/**
 * Try to extract a price from an HTML page using a CSS selector override
 * (if provided) and then fall back to common price-related selectors and
 * a full-text regex scan.
 *
 * @param {string} html
 * @param {string|null} selector  Optional CSS selector override from DB.
 * @returns {{ price: number|null, rawText: string|null }}
 */
function scrapePrice(html, selector) {
  const $ = cheerio.load(html);

  const candidates = [];

  // 1. User-supplied CSS selector override
  if (selector) {
    const el = $(selector).first();
    if (el.length) candidates.push(el.text());
  }

  // 2. Common e-commerce price selectors
  const commonSelectors = [
    '[itemprop="price"]',
    '[class*="price"]:not([class*="old"]):not([class*="was"]):not([class*="original"])',
    '[id*="price"]:not([id*="old"])',
    '[data-price]',
    '.price',
    '#price',
    '.product-price',
    '.current-price',
    '.sale-price',
    '.offer-price',
  ];
  for (const sel of commonSelectors) {
    $(sel).each((_, el) => {
      const text =
        $(el).attr('content') || $(el).attr('data-price') || $(el).text();
      if (text) candidates.push(text);
    });
  }

  // 3. Try every candidate in order and return the first valid price
  for (const raw of candidates) {
    const price = extractPrice(raw);
    if (price !== null && price > 0) {
      return { price, rawText: raw.trim() };
    }
  }

  // 4. Last resort: scan all visible text for a price-like pattern
  const bodyText = $('body').text();
  const price = extractPrice(bodyText);
  return { price, rawText: price !== null ? bodyText.slice(0, 200) : null };
}

/**
 * Fetch a URL with rate-limit-aware retries.
 *
 * @param {string} url
 * @returns {Promise<string>} HTML body
 */
async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
    // Follow redirects (default), but cap at 5
    maxRedirects: 5,
    // Return raw buffer so we can handle various encodings
    responseType: 'text',
  });
  return response.data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[scraper] Starting price scrape run at', new Date().toISOString());

  // Fetch all active competitor URLs (join to products to get product data)
  const { data: urls, error: fetchError } = await supabase
    .from('competitor_urls')
    .select(
      'id, url, scrape_selector, product_id, user_id, competitor_name, consecutive_failures, products(currency)'
    )
    .eq('is_active', true);

  if (fetchError) {
    console.error('[scraper] Failed to fetch competitor URLs:', fetchError.message);
    process.exit(1);
  }

  if (!urls || urls.length === 0) {
    console.log('[scraper] No active competitor URLs found. Exiting.');
    return;
  }

  console.log(`[scraper] Found ${urls.length} active URL(s) to scrape.`);

  let successCount = 0;
  let failureCount = 0;

  for (const entry of urls) {
    const { id: competitorUrlId, url, scrape_selector, product_id, user_id, consecutive_failures } = entry;
    const currency = entry.products?.currency ?? 'HUF';

    console.log(`[scraper] Scraping: ${url}`);

    let status = 'failed';
    let scrapedPrice = null;
    let rawPriceText = null;
    let errorMessage = null;

    try {
      const html = await fetchPage(url);
      const result = scrapePrice(html, scrape_selector);

      if (result.price !== null) {
        scrapedPrice = result.price;
        rawPriceText = result.rawText;
        status = 'success';
        console.log(`  ✓ Price: ${scrapedPrice} ${currency} (raw: "${rawPriceText?.slice(0, 60)}")`);
      } else {
        errorMessage = 'Price could not be extracted from the page.';
        console.warn(`  ✗ Could not extract price from: ${url}`);
      }
    } catch (err) {
      errorMessage = err.message ?? String(err);

      // Detect rate-limiting (HTTP 429) and mark accordingly
      if (err.response?.status === 429) {
        status = 'rate_limited';
        console.warn(`  ✗ Rate-limited (429): ${url}`);
      } else {
        console.warn(`  ✗ Error scraping ${url}: ${errorMessage}`);
      }
    }

    if (status === 'success') {
      successCount++;
    } else {
      failureCount++;
    }

    // ── Insert result into price_history ──────────────────────────────────
    const { error: insertError } = await supabase.from('price_history').insert({
      competitor_url_id: competitorUrlId,
      product_id,
      user_id,
      scraped_price: scrapedPrice,
      currency,
      raw_price_text: rawPriceText,
      status,
      error_message: errorMessage,
      scraped_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error(
        `  ✗ Failed to insert price_history for ${url}:`,
        insertError.message
      );
    }

    // ── Update last_scraped_at and last_status on the competitor URL ───────
    await supabase
      .from('competitor_urls')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_status: status,
        consecutive_failures:
          status === 'success' ? 0 : (consecutive_failures ?? 0) + 1,
      })
      .eq('id', competitorUrlId);

    // Rate-limit courtesy delay between requests
    await sleep(DELAY_MS);
  }

  console.log(
    `[scraper] Run complete. Success: ${successCount}, Failures: ${failureCount}, Total: ${urls.length}`
  );
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[scraper] Unhandled error:', err);
    process.exit(1);
  });
}

// Export pure utility functions for unit testing
module.exports = { extractPrice, parseHungarianNumber, parseGenericNumber, scrapePrice };
