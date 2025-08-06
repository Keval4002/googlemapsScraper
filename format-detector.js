/**
 * Google Maps Format Detector and Adapter
 * Automatically detects and adapts to Google Maps layout changes
 */

class GoogleMapsFormatDetector {
  constructor() {
    this.selectors = {
      // Multiple selector strategies for each element
      businessCards: [
        'a.hfpxzc',                    // Current selector
        'div[role="article"] a',       // Alternative
        'div[data-result-index] a',    // Another alternative
        'a[href*="/maps/place/"]'      // URL-based fallback
      ],
      
      businessName: [
        'h1',                          // Current
        'div[role="main"] h1',         // Alternative
        'div[data-tooltip] h1',        // Another
        '[data-value="Business Name"]' // Data attribute
      ],
      
      rating: [
        'span[aria-label*="stars"]',   // Current
        'span[role="img"]',            // Alternative
        'div[aria-label*="rating"]',   // Another
        '[data-value="rating"]'        // Data attribute
      ],
      
      reviews: [
        'span[aria-label*="reviews"]', // Current
        'span:contains("reviews")',    // Alternative
        'div[aria-label*="review"]',   // Another
        '[data-value="reviews"]'       // Data attribute
      ],
      
      address: [
        'button[data-tooltip="Copy address"]', // Current
        'button[aria-label*="address"]',       // Alternative
        'div[data-value="address"]',           // Another
        'span[aria-label*="address"]'          // Fallback
      ],
      
      phone: [
        'button[data-tooltip="Copy phone number"]', // Current
        'button[aria-label*="phone"]',             // Alternative
        'div[data-value="phone"]',                 // Another
        'span[aria-label*="phone"]'                // Fallback
      ],
      
      website: [
        'a[data-tooltip="Open website"]', // Current
        'a[data-tooltip="Open menu link"]', // Alternative
        'a[href^="http"]',                 // Generic
        'a[target="_blank"]'               // External links
      ],
      
      category: [
        'span[aria-label*="category"]', // Current
        'button[aria-label*="category"]', // Alternative
        'div[data-value="category"]',     // Another
        'span:contains("Restaurant")'     // Text-based
      ]
    };
    
    this.detectedFormat = null;
    this.workingSelectors = {};
  }

  /**
   * Detect the current Google Maps format and find working selectors
   */
  async detectFormat(page) {
    console.log('[FormatDetector] Detecting Google Maps format...');
    
    const format = {
      version: 'unknown',
      selectors: {},
      timestamp: new Date().toISOString()
    };

    // Test each selector strategy
    for (const [elementType, selectorList] of Object.entries(this.selectors)) {
      format.selectors[elementType] = await this.findWorkingSelector(page, selectorList);
    }

    // Determine format version based on working selectors
    format.version = this.determineVersion(format.selectors);
    
    this.detectedFormat = format;
    this.workingSelectors = format.selectors;
    
    console.log(`[FormatDetector] Detected format: ${format.version}`);
    console.log('[FormatDetector] Working selectors:', format.selectors);
    
    return format;
  }

  /**
   * Test multiple selectors and return the first working one
   */
  async findWorkingSelector(page, selectorList) {
    for (const selector of selectorList) {
      try {
        const element = await page.$(selector);
        if (element) {
          // Additional test: try to get text content
          const text = await element.textContent().catch(() => '');
          if (text || selector.includes('href') || selector.includes('aria-label')) {
            return selector;
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    
    // Return the most likely selector as fallback
    return selectorList[0];
  }

  /**
   * Determine format version based on working selectors
   */
  determineVersion(selectors) {
    // Version detection logic based on selector patterns
    if (selectors.businessCards.includes('a.hfpxzc')) {
      return 'v1.43.0-current';
    } else if (selectors.businessCards.includes('div[role="article"]')) {
      return 'v1.43.0-alternative';
    } else if (selectors.businessCards.includes('a[href*="/maps/place/"]')) {
      return 'v1.43.0-fallback';
    } else {
      return 'v1.43.0-unknown';
    }
  }

  /**
   * Get the best working selector for an element type
   */
  getSelector(elementType) {
    return this.workingSelectors[elementType] || this.selectors[elementType][0];
  }

  /**
   * Extract data using the detected format
   */
  async extractData(page, elementType, context = null) {
    const selector = this.getSelector(elementType);
    
    try {
      if (context) {
        // Extract from specific context (like a business card)
        return await context.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return '';
          
          if (sel.includes('href')) {
            return el.href || '';
          } else if (sel.includes('aria-label')) {
            return el.getAttribute('aria-label') || el.textContent || '';
          } else {
            return el.textContent || '';
          }
        }, selector);
      } else {
        // Extract from page
        return await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return '';
          
          if (sel.includes('href')) {
            return el.href || '';
          } else if (sel.includes('aria-label')) {
            return el.getAttribute('aria-label') || el.textContent || '';
          } else {
            return el.textContent || '';
          }
        }, selector);
      }
    } catch (error) {
      console.warn(`[FormatDetector] Failed to extract ${elementType} with selector ${selector}:`, error.message);
      return '';
    }
  }

  /**
   * Check if the current format is still working
   */
  async validateFormat(page) {
    console.log('[FormatDetector] Validating current format...');
    
    const testSelectors = [
      'businessCards',
      'businessName',
      'rating'
    ];
    
    for (const elementType of testSelectors) {
      const selector = this.getSelector(elementType);
      const element = await page.$(selector);
      
      if (!element) {
        console.warn(`[FormatDetector] Selector ${selector} for ${elementType} is no longer working`);
        return false;
      }
    }
    
    console.log('[FormatDetector] Format validation passed');
    return true;
  }

  /**
   * Get format detection report
   */
  getReport() {
    return {
      detectedFormat: this.detectedFormat,
      workingSelectors: this.workingSelectors,
      timestamp: new Date().toISOString(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get recommendations based on detected format
   */
  getRecommendations() {
    const recommendations = [];
    
    if (!this.detectedFormat) {
      recommendations.push('Run format detection before scraping');
      return recommendations;
    }
    
    if (this.detectedFormat.version.includes('fallback')) {
      recommendations.push('Using fallback selectors - consider updating scraper');
    }
    
    if (this.detectedFormat.version.includes('unknown')) {
      recommendations.push('Unknown format detected - manual review recommended');
    }
    
    // Check for missing selectors
    const missingSelectors = Object.entries(this.workingSelectors)
      .filter(([type, selector]) => !selector || selector === this.selectors[type][0])
      .map(([type]) => type);
    
    if (missingSelectors.length > 0) {
      recommendations.push(`Missing selectors for: ${missingSelectors.join(', ')}`);
    }
    
    return recommendations;
  }
}

module.exports = GoogleMapsFormatDetector; 