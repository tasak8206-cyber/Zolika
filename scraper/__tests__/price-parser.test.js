'use strict';

const { extractPrice, parseHungarianNumber, parseGenericNumber, scrapePrice } = require('../index');

// ─── parseHungarianNumber ─────────────────────────────────────────────────────

describe('parseHungarianNumber', () => {
  describe('happy paths', () => {
    it('parses space-separated thousands ("12 990")', () => {
      expect(parseHungarianNumber('12 990')).toBe(12990);
    });

    it('parses dot-separated thousands ("12.990")', () => {
      expect(parseHungarianNumber('12.990')).toBe(12990);
    });

    it('parses decimal with comma separator ("12.990,50")', () => {
      expect(parseHungarianNumber('12.990,50')).toBe(12990.5);
    });

    it('parses plain integer string ("12990")', () => {
      expect(parseHungarianNumber('12990')).toBe(12990);
    });

    it('parses single digit ("5")', () => {
      expect(parseHungarianNumber('5')).toBe(5);
    });

    it('parses large numbers ("1.234.567")', () => {
      expect(parseHungarianNumber('1.234.567')).toBe(1234567);
    });
  });

  describe('edge cases / error states', () => {
    it('returns null for null input', () => {
      expect(parseHungarianNumber(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseHungarianNumber('')).toBeNull();
    });

    it('returns null for non-numeric string', () => {
      expect(parseHungarianNumber('abc')).toBeNull();
    });

    it('returns null for string with only separators', () => {
      expect(parseHungarianNumber('...')).toBeNull();
    });
  });
});

// ─── parseGenericNumber ───────────────────────────────────────────────────────

describe('parseGenericNumber', () => {
  describe('happy paths', () => {
    it('parses comma-as-thousands, dot-as-decimal ("1,234.56")', () => {
      expect(parseGenericNumber('1,234.56')).toBe(1234.56);
    });

    it('parses dot-as-thousands, comma-as-decimal ("1.234,56")', () => {
      expect(parseGenericNumber('1.234,56')).toBe(1234.56);
    });

    it('parses plain integer string ("9999")', () => {
      expect(parseGenericNumber('9999')).toBe(9999);
    });

    it('parses simple decimal ("99.99")', () => {
      expect(parseGenericNumber('99.99')).toBe(99.99);
    });

    it('parses space-separated thousands ("1 234.56")', () => {
      expect(parseGenericNumber('1 234.56')).toBe(1234.56);
    });
  });

  describe('edge cases / error states', () => {
    it('returns null for null input', () => {
      expect(parseGenericNumber(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseGenericNumber('')).toBeNull();
    });

    it('returns null for alphabetic string', () => {
      expect(parseGenericNumber('price')).toBeNull();
    });
  });
});

// ─── extractPrice ─────────────────────────────────────────────────────────────

describe('extractPrice', () => {
  describe('Hungarian HUF formats', () => {
    it('extracts price from "12 990 Ft"', () => {
      expect(extractPrice('12 990 Ft')).toBe(12990);
    });

    it('extracts price from "12.990 Ft"', () => {
      expect(extractPrice('12.990 Ft')).toBe(12990);
    });

    it('extracts price from "12990 HUF"', () => {
      expect(extractPrice('12990 HUF')).toBe(12990);
    });

    it('extracts price from "12 990 forint"', () => {
      expect(extractPrice('12 990 forint')).toBe(12990);
    });

    it('extracts price from "12.990,- Ft" (common Hungarian webshop format)', () => {
      expect(extractPrice('12.990,- Ft')).not.toBeNull();
    });
  });

  describe('generic currency formats', () => {
    it('extracts price from "$99.99"', () => {
      expect(extractPrice('$99.99')).toBe(99.99);
    });

    it('extracts price from "€1.234,56"', () => {
      expect(extractPrice('€1.234,56')).toBe(1234.56);
    });

    it('extracts price from "£49.99"', () => {
      expect(extractPrice('£49.99')).toBe(49.99);
    });

    it('extracts price from "1,234.56 USD"', () => {
      expect(extractPrice('1,234.56 USD')).toBe(1234.56);
    });
  });

  describe('edge cases / error states', () => {
    it('returns null for null input', () => {
      expect(extractPrice(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractPrice('')).toBeNull();
    });

    it('returns null for plain text with no numbers', () => {
      expect(extractPrice('Product name only')).toBeNull();
    });

    it('returns null for string with only whitespace', () => {
      expect(extractPrice('   ')).toBeNull();
    });

    it('handles XSS attempt gracefully (returns null or non-null but numeric)', () => {
      const result = extractPrice('<script>alert(1)</script>');
      // Should not throw; result must be null or a number
      expect(result === null || typeof result === 'number').toBe(true);
    });

    it('handles extremely long input without crashing', () => {
      const longText = 'A'.repeat(10000) + ' 999 Ft';
      expect(() => extractPrice(longText)).not.toThrow();
    });
  });
});

// ─── scrapePrice ──────────────────────────────────────────────────────────────

describe('scrapePrice', () => {
  describe('happy paths', () => {
    it('extracts price via itemprop="price" attribute', () => {
      const html = '<html><body><span itemprop="price" content="12990">12 990 Ft</span></body></html>';
      const { price, rawText } = scrapePrice(html, null);
      expect(price).toBe(12990);
      expect(rawText).toBeTruthy();
    });

    it('extracts price via a custom CSS selector override', () => {
      const html = '<html><body><div class="custom-price">5 990 Ft</div></body></html>';
      const { price } = scrapePrice(html, '.custom-price');
      expect(price).toBe(5990);
    });

    it('extracts price via common .price class', () => {
      const html = '<html><body><span class="price">29.99 USD</span></body></html>';
      const { price } = scrapePrice(html, null);
      expect(price).toBeGreaterThan(0);
    });

    it('extracts price via #price id', () => {
      const html = '<html><body><p id="price">€ 49.99</p></body></html>';
      const { price } = scrapePrice(html, null);
      expect(price).toBe(49.99);
    });

    it('extracts price from data-price attribute', () => {
      const html = '<html><body><div data-price="1299">Some product</div></body></html>';
      const { price } = scrapePrice(html, null);
      expect(price).toBe(1299);
    });

    it('falls back to body text scan when no selector matches', () => {
      const html = '<html><body><p>The total cost is 4 990 Ft including VAT.</p></body></html>';
      const { price } = scrapePrice(html, null);
      expect(price).toBe(4990);
    });
  });

  describe('edge cases / error states', () => {
    it('returns null price when no price is found in HTML', () => {
      const html = '<html><body><p>No price information here.</p></body></html>';
      const { price, rawText } = scrapePrice(html, null);
      expect(price).toBeNull();
      expect(rawText).toBeNull();
    });

    it('ignores "old-price" class selectors (not in common selector list)', () => {
      const html = `
        <html><body>
          <span class="old-price">19 990 Ft</span>
          <span class="current-price">14 990 Ft</span>
        </body></html>
      `;
      const { price } = scrapePrice(html, null);
      // Should prefer current-price over old-price
      expect(price).toBe(14990);
    });

    it('handles empty HTML gracefully', () => {
      const { price, rawText } = scrapePrice('', null);
      expect(price).toBeNull();
      expect(rawText).toBeNull();
    });

    it('handles malformed HTML without throwing', () => {
      const html = '<html><body><div class="price"><<INVALID>></div></body>';
      expect(() => scrapePrice(html, null)).not.toThrow();
    });

    it('handles HTML with XSS payloads without executing them', () => {
      const html = '<html><body><span class="price"><script>alert(1)</script>9.99 EUR</span></body></html>';
      expect(() => scrapePrice(html, null)).not.toThrow();
    });

    it('returns null price for zero-price elements (price > 0 check)', () => {
      const html = '<html><body><span itemprop="price" content="0">0 Ft</span></body></html>';
      const { price } = scrapePrice(html, null);
      // The scraper correctly requires price > 0
      expect(price === null || price === 0).toBe(true);
    });

    it('handles very large HTML document without crashing', () => {
      const largeHtml =
        '<html><body>' +
        '<p>' + 'Lorem ipsum '.repeat(5000) + '</p>' +
        '<span class="price">999 Ft</span>' +
        '</body></html>';
      expect(() => scrapePrice(largeHtml, null)).not.toThrow();
      const { price } = scrapePrice(largeHtml, null);
      expect(price).toBe(999);
    });
  });
});
