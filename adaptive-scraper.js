const { chromium } = require('playwright');
const config = require('./config');

class AdaptiveGoogleMapsScraper {
  constructor(options = {}) {
    this.options = {
      stealthLevel: 'optimized',
      batchSize: 3,
      autoAdapt: true, // Enable automatic adaptation
      selectorTimeout: 10000,
      maxRetries: 3,
      proxy: null, // Proxy configuration
      ...options
    };
    this.browser = null;
    this.context = null;
    this.page = null;
    this.selectorCache = new Map(); // Cache working selectors
    this.adaptationHistory = []; // Track adaptation attempts
  }

  // Adaptive selector detection system
  async detectSelectors(page) {
    console.log('[Adaptive Scraper] Detecting current Google Maps selectors...');
    
    const selectors = {
      businessName: [],
      rating: [],
      reviews: [],
      address: [],
      phone: [],
      website: []
    };

    // Business Name selectors (multiple possible patterns)
    selectors.businessName = [
      'h1[data-attrid="title"]',
      'h1.DUwDvf',
      'h1[role="main"]',
      'h1',
      '[data-value="Business Name"]',
      'div[role="main"] h1',
      'div[aria-label*="Business"] h1'
    ];

    // Rating selectors
    selectors.rating = [
      'span[aria-label*="rating"]',
      'span[aria-label*="stars"]',
      'span[data-value*="rating"]',
      'div[aria-label*="rating"]',
      'span:has-text("★")',
      'div:has-text("★")',
      '[data-value*="rating"]'
    ];

    // Reviews selectors
    selectors.reviews = [
      'span[aria-label*="review"]',
      'span:has-text("review")',
      'div[aria-label*="review"]',
      'span[data-value*="review"]',
      'a[aria-label*="review"]'
    ];

    // Address selectors
    selectors.address = [
      'button[data-tooltip="Copy address"]',
      'button[aria-label*="address"]',
      'button[aria-label*="Address"]',
      'a[data-tooltip="Copy address"]',
      'div[aria-label*="address"]',
      'span[aria-label*="address"]',
      'button:has-text("address")',
      'a[href*="maps.google.com"]'
    ];

    // Phone selectors
    selectors.phone = [
      'button[data-tooltip="Copy phone number"]',
      'button[aria-label*="phone"]',
      'button[aria-label*="Phone"]',
      'a[data-tooltip="Copy phone number"]',
      'a[href^="tel:"]',
      'button:has-text("phone")',
      'span[aria-label*="phone"]'
    ];

    // Website selectors
    selectors.website = [
      'a[data-tooltip="Open website"]',
      'a[data-tooltip="Open menu link"]',
      'a[aria-label*="website"]',
      'a[aria-label*="Website"]',
      'a[href*="http"]:not([href*="google.com"])',
      'a[target="_blank"]'
    ];

    // Test each selector and find working ones
    const workingSelectors = {};
    
    for (const [field, selectorList] of Object.entries(selectors)) {
      workingSelectors[field] = await this.findWorkingSelector(page, selectorList, field);
    }

    console.log('[Adaptive Scraper] Working selectors detected:', workingSelectors);
    return workingSelectors;
  }

  async findWorkingSelector(page, selectorList, fieldName) {
    for (const selector of selectorList) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim().length > 0) {
            console.log(`[Adaptive Scraper] Found working selector for ${fieldName}: ${selector}`);
            return selector;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    console.log(`[Adaptive Scraper] No working selector found for ${fieldName}`);
    return null;
  }

  // Adaptive extraction with fallback mechanisms
  async extractBusinessDetailsAdaptive(url, page) {
    try {
      console.log(`[Adaptive Extractor] Opening URL: ${url}`);
      await page.goto(url, { timeout: 60000 });
      await page.waitForSelector('[role="main"]', { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Detect current selectors
      const selectors = await this.detectSelectors(page);
      
      // Cache working selectors for future use
      this.selectorCache.set('current', selectors);

      // Extract data using adaptive selectors
      const businessName = await this.extractWithFallback(page, selectors.businessName, 'Business Name');
      const rating = await this.extractWithFallback(page, selectors.rating, 'Rating');
      const reviews = await this.extractWithFallback(page, selectors.reviews, 'Reviews');
      const address = await this.extractWithFallback(page, selectors.address, 'Address');
      const phone = await this.extractWithFallback(page, selectors.phone, 'Phone');
      const website = await this.extractWithFallback(page, selectors.website, 'Website');

      // Clean and format data
      const cleanedRating = this.cleanRating(rating);
      const cleanedReviews = this.cleanReviews(reviews);
      const cleanedAddress = this.cleanAddress(address);
      const formattedPhone = this.formatPhoneNumber(phone);
      const cleanedWebsite = this.cleanWebsite(website);

      // Extract email and social media information from website
      let email = '';
      let socialMedia = { instagram: '', linkedin: '', facebook: '' };
      
      if (cleanedWebsite && cleanedWebsite !== '') {
        try {
          console.log(`[Adaptive Extractor] Scraping website for contact info: ${cleanedWebsite}`);
          const contactInfo = await this.scrapeWebsiteForContactInfo(cleanedWebsite, page);
          email = contactInfo.email;
          socialMedia = {
            instagram: contactInfo.instagram || '',
            linkedin: contactInfo.linkedin || '',
            facebook: contactInfo.facebook || ''
          };
        } catch (err) {
          console.log(`[Adaptive Extractor] Error scraping website for contact info: ${err.message}`);
        }
      }

      return {
        'Business Name': this.removeGlyphs(businessName),
        'Company Type': this.removeGlyphs(await this.extractCompanyType(page)),
        'Rating': this.removeGlyphs(cleanedRating),
        'Reviews': this.removeGlyphs(cleanedReviews),
        'Address': this.removeGlyphs(cleanedAddress),
        'Phone Number': formattedPhone, // Already cleaned in formatPhoneNumber
        'Website': this.removeGlyphs(cleanedWebsite),
        'Email': this.removeGlyphs(email),
        'Instagram': this.removeGlyphs(socialMedia.instagram),
        'LinkedIn': this.removeGlyphs(socialMedia.linkedin),
        'Facebook': this.removeGlyphs(socialMedia.facebook),
        'URL': url
      };

    } catch (err) {
      console.error(`[Adaptive Extractor] Error extracting details from ${url}:`, err.message);
      return this.getEmptyResult(url);
    }
  }

  async extractWithFallback(page, selector, fieldName) {
    if (!selector) {
      console.log(`[Adaptive Extractor] No selector available for ${fieldName}, trying generic extraction`);
      return await this.genericExtraction(page, fieldName);
    }

    try {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch (error) {
      console.log(`[Adaptive Extractor] Selector failed for ${fieldName}: ${error.message}`);
    }

    // Fallback to generic extraction
    return await this.genericExtraction(page, fieldName);
  }

  async genericExtraction(page, fieldName) {
    // Generic extraction patterns for when specific selectors fail
    const patterns = {
      'Business Name': [
        'h1',
        'h2',
        '[role="main"] h1',
        'div[aria-label*="Business"]',
        'div[data-value*="name"]'
      ],
      'Rating': [
        'span:has-text("★")',
        'div:has-text("★")',
        'span[aria-label*="rating"]',
        'div[aria-label*="rating"]'
      ],
      'Reviews': [
        'span:has-text("review")',
        'a:has-text("review")',
        'span[aria-label*="review"]'
      ],
      'Address': [
        'button:has-text("address")',
        'span:has-text("St")',
        'span:has-text("Ave")',
        'span:has-text("Rd")'
      ],
      'Phone': [
        'a[href^="tel:"]',
        'button:has-text("phone")',
        'span:has-text("(")',
        'span:has-text("-")'
      ],
      'Website': [
        'a[href*="http"]:not([href*="google.com"])',
        'a[target="_blank"]',
        'a[rel="noopener"]'
      ]
    };

    const fieldPatterns = patterns[fieldName] || [];
    
    for (const pattern of fieldPatterns) {
      try {
        const elements = await page.$$(pattern);
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      } catch (error) {
        // Continue to next pattern
      }
    }

    return '';
  }

  // Data cleaning methods
  cleanRating(rating) {
    if (!rating) return '';
    return rating.replace(/["""]/g, '').replace(/[^\d.]/g, '');
  }

  cleanReviews(reviews) {
    if (!reviews) return '';
    return reviews
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/["""'']/g, '') // Remove quotes
      .replace(/,/g, '') // Remove commas
      .replace(/[^\d]/g, '') // Remove all non-digit characters
      .trim();
  }

  cleanAddress(address) {
    if (!address) return '';
    return address
      .replace(/["""'']/g, '')
      .replace(/,\s*$/, '')
      .replace(/^\s*,\s*/, '')
      .trim();
  }

  // Enhanced comprehensive glyph removal method
  removeGlyphs(text) {
    if (!text) return '';
    return text
      .replace(/[\u200B\u200C\u200D\uFEFF\u200E\u200F]/g, '') // Remove zero-width characters
      .replace(/[\uE000-\uF8FF]/g, '') // Remove Unicode private use area characters (Google Maps icons)
      .replace(/[\uF000-\uFFFF]/g, '') // Remove additional Unicode private use area
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '') // Remove Unicode supplementary private use area
      .replace(/[\u{100000}-\u{10FFFF}]/gu, '') // Remove Unicode supplementary private use area B
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Remove emoji characters
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Remove miscellaneous symbols and pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Remove transport and map symbols
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Remove regional indicator symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remove miscellaneous symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Remove dingbats
      .replace(/[\u{2300}-\u{23FF}]/gu, '') // Remove technical symbols
      .replace(/[\u{2400}-\u{243F}]/gu, '') // Remove control pictures
      .replace(/[\u{2440}-\u{245F}]/gu, '') // Remove optical character recognition
      .replace(/[\u{2460}-\u{24FF}]/gu, '') // Remove enclosed alphanumerics
      .replace(/[\u{2500}-\u{257F}]/gu, '') // Remove box drawing
      .replace(/[\u{2580}-\u{259F}]/gu, '') // Remove block elements
      .replace(/[\u{25A0}-\u{25FF}]/gu, '') // Remove geometric shapes
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remove miscellaneous symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Remove dingbats
      .replace(/[\u{2B00}-\u{2BFF}]/gu, '') // Remove miscellaneous symbols and arrows
      .replace(/[\u{2900}-\u{297F}]/gu, '') // Remove supplemental arrows
      .replace(/[\u{2980}-\u{29FF}]/gu, '') // Remove miscellaneous mathematical symbols
      .replace(/[\u{2A00}-\u{2AFF}]/gu, '') // Remove supplemental mathematical operators
      .replace(/[\u{2B00}-\u{2BFF}]/gu, '') // Remove miscellaneous symbols and arrows
      .replace(/[\u{2C00}-\u{2C5F}]/gu, '') // Remove glagolitic
      .replace(/[\u{2C60}-\u{2C7F}]/gu, '') // Remove latin extended-c
      .replace(/[\u{2C80}-\u{2CFF}]/gu, '') // Remove coptic
      .replace(/[\u{2D00}-\u{2D2F}]/gu, '') // Remove georgian supplement
      .replace(/[\u{2D30}-\u{2D7F}]/gu, '') // Remove tifinagh
      .replace(/[\u{2D80}-\u{2DDF}]/gu, '') // Remove ethiopic extended
      .replace(/[\u{2DE0}-\u{2DFF}]/gu, '') // Remove cyrillic extended-a
      .replace(/[\u{2E00}-\u{2E7F}]/gu, '') // Remove supplemental punctuation
      .replace(/[\u{2E80}-\u{2EFF}]/gu, '') // Remove cjk radicals supplement
      .replace(/[\u{2F00}-\u{2FDF}]/gu, '') // Remove kangxi radicals
      .replace(/[\u{2FF0}-\u{2FFF}]/gu, '') // Remove ideographic description characters
      .replace(/[\u{3000}-\u{303F}]/gu, '') // Remove cjk symbols and punctuation
      .replace(/[\u{3040}-\u{309F}]/gu, '') // Remove hiragana
      .replace(/[\u{30A0}-\u{30FF}]/gu, '') // Remove katakana
      .replace(/[\u{3100}-\u{312F}]/gu, '') // Remove bopomofo
      .replace(/[\u{3130}-\u{318F}]/gu, '') // Remove hangul compatibility jamo
      .replace(/[\u{3190}-\u{319F}]/gu, '') // Remove kanbun
      .replace(/[\u{31A0}-\u{31BF}]/gu, '') // Remove bopomofo extended
      .replace(/[\u{31C0}-\u{31EF}]/gu, '') // Remove cjk strokes
      .replace(/[\u{31F0}-\u{31FF}]/gu, '') // Remove katakana phonetic extensions
      .replace(/[\u{3200}-\u{32FF}]/gu, '') // Remove enclosed cjk letters and months
      .replace(/[\u{3300}-\u{33FF}]/gu, '') // Remove cjk compatibility
      .replace(/[\u{3400}-\u{4DBF}]/gu, '') // Remove cjk unified ideographs extension a
      .replace(/[\u{4DC0}-\u{4DFF}]/gu, '') // Remove yijing hexagram symbols
      .replace(/[\u{4E00}-\u{9FFF}]/gu, '') // Remove cjk unified ideographs
      .replace(/[\u{A000}-\u{A48F}]/gu, '') // Remove yi syllables
      .replace(/[\u{A490}-\u{A4CF}]/gu, '') // Remove yi radicals
      .replace(/[\u{A4D0}-\u{A4FF}]/gu, '') // Remove lisu
      .replace(/[\u{A500}-\u{A63F}]/gu, '') // Remove vai
      .replace(/[\u{A640}-\u{A69F}]/gu, '') // Remove cyrillic extended-b
      .replace(/[\u{A6A0}-\u{A6FF}]/gu, '') // Remove bamum
      .replace(/[\u{A700}-\u{A71F}]/gu, '') // Remove modifier tone letters
      .replace(/[\u{A720}-\u{A7FF}]/gu, '') // Remove latin extended-d
      .replace(/[\u{A800}-\u{A82F}]/gu, '') // Remove syloti nagri
      .replace(/[\u{A830}-\u{A83F}]/gu, '') // Remove common indic number forms
      .replace(/[\u{A840}-\u{A87F}]/gu, '') // Remove phags-pa
      .replace(/[\u{A880}-\u{A8DF}]/gu, '') // Remove saurashtra
      .replace(/[\u{A8E0}-\u{A8FF}]/gu, '') // Remove devanagari extended
      .replace(/[\u{A900}-\u{A92F}]/gu, '') // Remove kayah li
      .replace(/[\u{A930}-\u{A95F}]/gu, '') // Remove rejang
      .replace(/[\u{A960}-\u{A97F}]/gu, '') // Remove hangul jamo extended-a
      .replace(/[\u{A980}-\u{A9DF}]/gu, '') // Remove javanese
      .replace(/[\u{A9E0}-\u{A9FF}]/gu, '') // Remove myanmar extended-b
      .replace(/[\u{AA00}-\u{AA5F}]/gu, '') // Remove cham
      .replace(/[\u{AA60}-\u{AA7F}]/gu, '') // Remove myanmar extended-a
      .replace(/[\u{AA80}-\u{AADF}]/gu, '') // Remove tai viet
      .replace(/[\u{AAE0}-\u{AAFF}]/gu, '') // Remove meetei mayek extensions
      .replace(/[\u{AB00}-\u{AB2F}]/gu, '') // Remove ethiopic extended-a
      .replace(/[\u{AB30}-\u{AB6F}]/gu, '') // Remove latin extended-e
      .replace(/[\u{AB70}-\u{ABBF}]/gu, '') // Remove cherokee supplement
      .replace(/[\u{ABC0}-\u{ABFF}]/gu, '') // Remove meetei mayek
      .replace(/[\u{AC00}-\u{D7AF}]/gu, '') // Remove hangul syllables
      .replace(/[\u{D7B0}-\u{D7FF}]/gu, '') // Remove hangul jamo extended-b
      .replace(/[\u{D800}-\u{DB7F}]/gu, '') // Remove high surrogates
      .replace(/[\u{DB80}-\u{DBFF}]/gu, '') // Remove high private use surrogates
      .replace(/[\u{DC00}-\u{DFFF}]/gu, '') // Remove low surrogates
      .replace(/[\u{E000}-\u{F8FF}]/gu, '') // Remove private use area
      .replace(/[\u{F900}-\u{FAFF}]/gu, '') // Remove cjk compatibility ideographs
      .replace(/[\u{FB00}-\u{FB4F}]/gu, '') // Remove alphabetic presentation forms
      .replace(/[\u{FB50}-\u{FDFF}]/gu, '') // Remove arabic presentation forms-a
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Remove variation selectors
      .replace(/[\u{FE10}-\u{FE1F}]/gu, '') // Remove vertical forms
      .replace(/[\u{FE20}-\u{FE2F}]/gu, '') // Remove combining half marks
      .replace(/[\u{FE30}-\u{FE4F}]/gu, '') // Remove cjk compatibility forms
      .replace(/[\u{FE50}-\u{FE6F}]/gu, '') // Remove small form variants
      .replace(/[\u{FE70}-\u{FEFF}]/gu, '') // Remove arabic presentation forms-b
      .replace(/[\u{FF00}-\u{FFEF}]/gu, '') // Remove halfwidth and fullwidth forms
      .replace(/[\u{FFF0}-\u{FFFF}]/gu, '') // Remove specials
      .replace(/NO GLYPH/g, '') // Remove NO GLYPH placeholders
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/^\s*[📍🏢🏪🏬🏭🏮🏯🏰🏱🏲🏳🏴🏵🏶🏷🏸🏹🏺🏻🏼🏽🏾🏿]/g, '') // Remove common location/building emojis at start
      .replace(/^\s*[📞📱📲📳📴📵📶📷📸📹📺📻📼📽📾📿🔀🔁🔂🔃🔄🔅🔆🔇🔈🔉🔊🔋🔌🔍🔎🔏🔐🔑🔒🔓🔔🔕🔖🔗🔘🔙🔚🔛🔜🔝🔞🔟🔠🔡🔢🔣🔤🔥🔦🔧🔨🔩🔪🔫🔬🔭🔮🔯🔰🔱🔲🔳🔴🔵🔶🔷🔸🔹🔺🔻🔼🔽🔾🔿🕀🕁🕂🕃🕄🕅🕆🕇🕈🕉🕊🕋🕌🕍🕎🕏🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦🕧🕨🕩🕪🕫🕬🕭🕮🕯🕰🕱🕲🕳🕴🕵🕶🕷🕸🕹🕺🕻🕼🕽🕾🕿🖀🖁🖂🖃🖄🖅🖆🖇🖈🖉🖊🖋🖌🖍🖎🖏🖐🖑🖒🖓🖔🖕🖖🖗🖘🖙🖚🖛🖜🖝🖞🖟🖠🖡🖢🖣🖤🖥🖦🖧🖨🖩🖪🖫🖬🖭🖮🖯🖰🖱🖲🖳🖴🖵🖶🖷🖸🖹🖺🖻🖼🖽🖾🖿🗀🗁🗂🗃🗄🗅🗆🗇🗈🗉🗊🗋🗌🗍🗎🗏🗐🗑🗒🗓🗔🗕🗖🗗🗘🗙🗚🗛🗜🗝🗞🗟🗠🗡🗢🗣🗤🗥🗦🗧🗨🗩🗪🗫🗬🗭🗮🗯🗰🗱🗲🗳🗴🗵🗶🗷🗸🗹🗺🗻🗼🗽🗾🗿]/g, '') // Remove all emojis
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return '';
    }
    
    // Clean glyphs and other unwanted characters first
    const cleanedPhone = this.removeGlyphs(phoneNumber);
    
    // Extract only digits
    const digits = cleanedPhone.replace(/\D/g, '');
    
    // Handle different phone number formats
    if (digits.length === 10) {
      // US 10-digit number: 1234567890 -> +11234567890
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US 11-digit number starting with 1: 11234567890 -> +11234567890
      return `+${digits}`;
    } else if (digits.length === 11 && !digits.startsWith('1')) {
      // International 11-digit number: 44123456789 -> +44123456789
      return `+${digits}`;
    } else if (digits.length === 7) {
      // 7-digit number (local): 1234567 -> +11234567890 (assume US)
      return `+1${digits}`;
    } else if (digits.length > 11) {
      // Long international number: 441234567890 -> +441234567890
      return `+${digits}`;
    } else if (digits.length < 7) {
      // Too short, return empty
      return '';
    } else {
      // Fallback: if it already starts with +, keep it, otherwise add +
      return cleanedPhone.startsWith('+') ? cleanedPhone : `+${digits}`;
    }
  }

  // Format phone number for CSV export (adds single quote to prevent Excel formula interpretation)
  formatPhoneNumberForCSV(phoneNumber) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) return '';
    
    // Add single quote prefix to prevent CSV parsing issues with + symbol
    return `'${formattedPhone}`;
  }

  cleanWebsite(website) {
    if (!website) return '';
    // Extract href if it's an anchor tag
    if (website.includes('href=')) {
      const match = website.match(/href="([^"]+)"/);
      return match ? match[1] : website;
    }
    return website;
  }

  async extractCompanyType(page) {
    try {
      const selectors = [
        'span[aria-label*="type"]',
        'div[aria-label*="type"]',
        'span[data-value*="type"]',
        'div[data-value*="type"]'
      ];

      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      }
    } catch (error) {
      // Continue
    }
    return '';
  }

  getEmptyResult(url) {
    return {
      'Business Name': '',
      'Company Type': '',
      'Rating': '',
      'Reviews': '',
      'Address': '',
      'Phone Number': '',
      'Website': '',
      'Email': '',
      'Instagram': '',
      'LinkedIn': '',
      'Facebook': '',
      'URL': url
    };
  }

  // Extract email and social media from business websites
  async scrapeWebsiteForContactInfo(websiteUrl, page) {
    if (!websiteUrl || websiteUrl === '') {
      return { email: '', instagram: '', linkedin: '', facebook: '' };
    }

    console.log(`[Adaptive Scraper] Scraping website: ${websiteUrl}`);
    
    // Helper to extract emails/socials from the current page
    const extractFromCurrentPage = async () => {
      // Extract email addresses from text and mailto links
      const emails = await page.evaluate(() => {
        const allEmails = new Set();
        
        // 1. Extract emails from page text using regex
        const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
        const pageText = document.body.innerText;
        const emailMatches = pageText.match(emailRegex) || [];
        
        // Filter out false positives (phone numbers, etc.)
        const validEmails = emailMatches.filter(email => {
          const emailPart = email.split('@')[0];
          if (/^[0-9\-\(\)\s]+$/.test(emailPart)) return false;
          if (emailPart.length < 2) return false;
          if (/^[0-9\.]+$/.test(emailPart)) return false;
          if (/^[0-9\-\(\)\s]{3,}[a-zA-Z]/.test(emailPart)) return false;
          if (/[0-9]{3,4}[-\(\)\s]?[0-9]{3,4}/.test(emailPart)) return false;
          const numbers = (emailPart.match(/[0-9]/g) || []).length;
          const letters = (emailPart.match(/[a-zA-Z]/g) || []).length;
          if (numbers > letters && numbers > 3) return false;
          return true;
        });
        
        // Add valid emails from text
        validEmails.forEach(email => allEmails.add(email.toLowerCase()));
        
        // 2. Extract emails from mailto links
        const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
        mailtoLinks.forEach(link => {
          const href = link.href;
          const mailtoMatch = href.match(/^mailto:([^?]+)/);
          if (mailtoMatch) {
            const email = mailtoMatch[1].trim();
            // Validate the email from mailto link
            if (emailRegex.test(email)) {
              allEmails.add(email.toLowerCase());
            }
          }
        });
        
        return Array.from(allEmails);
      });

      // Extract social media links
      const socialLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const socialMedia = { instagram: '', linkedin: '', facebook: '' };
        links.forEach(link => {
          const href = link.href.toLowerCase();
          if (href.includes('instagram.com') && !socialMedia.instagram) {
            if (href.match(/instagram\.com\/[a-zA-Z0-9._]{3,30}/) && !href.includes('instagram.com/wix')) {
              // Additional check: ensure the URL doesn't contain 'wix' anywhere in the path
              const urlPath = href.split('instagram.com/')[1];
              if (urlPath && !urlPath.includes('wix')) {
                socialMedia.instagram = link.href;
              }
            }
          }
          if (href.includes('linkedin.com') && !socialMedia.linkedin) {
            socialMedia.linkedin = link.href;
          }
          if (href.includes('facebook.com') && !socialMedia.facebook) {
            if (!href.includes('developers.facebook.com') && 
                !href.includes('facebook.com/developers') &&
                !href.includes('facebook.com/docs') &&
                !href.includes('facebook.com/help') &&
                !href.includes('facebook.com/support') &&
                !href.includes('facebook.com/business') &&
                !href.includes('facebook.com/legal') &&
                !href.includes('facebook.com/policy') &&
                !href.includes('facebook.com/terms') &&
                !href.includes('facebook.com/privacy') &&
                !href.includes('facebook.com/wix') &&
                !href.match(/^https?:\/\/[^\/]*facebook\.com\/?$/) &&
                !href.match(/^https?:\/\/[^\/]*facebook\.com\/[a-zA-Z0-9._-]{1,2}$/)) {
              socialMedia.facebook = link.href;
            }
          }
        });
        return socialMedia;
      });

      // Also check for social media in text content
      const textSocialLinks = await page.evaluate(() => {
        const pageText = document.body.innerText;
        const socialMedia = { instagram: '', linkedin: '', facebook: '' };
        const instagramPatterns = [
          /instagram\.com\/[a-zA-Z0-9._]+/g,
          /@[a-zA-Z0-9._]{3,30}/g
        ];
        const linkedinPatterns = [ /linkedin\.com\/[a-zA-Z0-9._-]+/g ];
        const facebookPatterns = [ /facebook\.com\/[a-zA-Z0-9._-]+/g ];
        
        instagramPatterns.forEach(pattern => {
          const matches = pageText.match(pattern);
          if (matches && matches.length > 0 && !socialMedia.instagram) {
            // Check all matches to find the first valid one (not wix)
            for (const match of matches) {
              if (match.includes('instagram.com/') && !match.includes('instagram.com/wix')) {
                // Additional check: ensure the URL doesn't contain 'wix' anywhere in the path
                const urlPath = match.split('instagram.com/')[1];
                if (urlPath && !urlPath.includes('wix')) {
                  socialMedia.instagram = match;
                  break; // Found a valid Instagram URL
                }
              } else if (match.startsWith('@')) {
                const username = match.substring(1);
                if (!username.includes('@') && !username.includes('.com') && !username.includes('.org') && !username.includes('.net')) {
                  socialMedia.instagram = 'https://instagram.com/' + username;
                  break; // Found a valid Instagram username
                }
              }
            }
          }
        });
        
        linkedinPatterns.forEach(pattern => {
          const matches = pageText.match(pattern);
          if (matches && matches.length > 0 && !socialMedia.linkedin) {
            socialMedia.linkedin = matches[0];
          }
        });
        
        facebookPatterns.forEach(pattern => {
          const matches = pageText.match(pattern);
          if (matches && matches.length > 0 && !socialMedia.facebook) {
            const match = matches[0];
            if (!match.includes('developers.facebook.com') && 
                !match.includes('facebook.com/developers') &&
                !match.includes('facebook.com/docs') &&
                !match.includes('facebook.com/help') &&
                !match.includes('facebook.com/support') &&
                !match.includes('facebook.com/business') &&
                !match.includes('facebook.com/legal') &&
                !match.includes('facebook.com/policy') &&
                !match.includes('facebook.com/terms') &&
                !match.includes('facebook.com/privacy') &&
                !match.includes('facebook.com/wix') &&
                !match.match(/^https?:\/\/[^\/]*facebook\.com\/?$/) &&
                !match.match(/^https?:\/\/[^\/]*facebook\.com\/[a-zA-Z0-9._-]{1,2}$/)) {
              socialMedia.facebook = match;
            }
          }
        });
        
        return socialMedia;
      });

      const finalSocialLinks = {
        instagram: socialLinks.instagram || textSocialLinks.instagram,
        linkedin: socialLinks.linkedin || textSocialLinks.linkedin,
        facebook: socialLinks.facebook || textSocialLinks.facebook
      };

      Object.keys(finalSocialLinks).forEach(platform => {
        if (finalSocialLinks[platform]) {
          if (!finalSocialLinks[platform].startsWith('http')) {
            finalSocialLinks[platform] = 'https://' + finalSocialLinks[platform];
          }
        }
      });

      return {
        email: emails.length > 0 ? emails.map(email => email.toLowerCase()).join(', ') : '',
        instagram: finalSocialLinks.instagram,
        linkedin: finalSocialLinks.linkedin,
        facebook: finalSocialLinks.facebook
      };
    };

    // 1. Scrape homepage
    await page.goto(websiteUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    let result = await extractFromCurrentPage();
    console.log(`[Adaptive Scraper] Found: Email=${result.email ? `Yes` : 'No'}, Instagram=${result.instagram ? 'Yes' : 'No'}, LinkedIn=${result.linkedin ? 'Yes' : 'No'}, Facebook=${result.facebook ? 'Yes' : 'No'}`);

    // 2. If no email found, try to find and scrape the Contact page
    if (!result.email) {
      // Try to find a Contact page link
      const contactHref = await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('a[href]'));
        // Look for links with text or href containing 'contact'
        let contactLink = candidates.find(link => {
          const href = link.href;
          const text = link.innerText.trim().toLowerCase();
          // Skip mailto links and other non-http links
          return !href.startsWith('mailto:') && 
                 !href.startsWith('tel:') && 
                 !href.startsWith('javascript:') &&
                 (text.includes('contact') || href.toLowerCase().includes('contact'));
        });
        return contactLink ? contactLink.href : '';
      });
      
      if (contactHref && contactHref !== websiteUrl && !contactHref.startsWith('mailto:')) {
        try {
          console.log(`[Adaptive Scraper] No email on homepage, checking Contact page: ${contactHref}`);
          await page.goto(contactHref, { timeout: 20000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
          const contactResult = await extractFromCurrentPage();
          // If we found an email or socials on the contact page, use them
          if (contactResult.email || contactResult.instagram || contactResult.linkedin || contactResult.facebook) {
            result = contactResult;
            console.log(`[Adaptive Scraper] Found contact info on Contact page.`);
          } else {
            console.log(`[Adaptive Scraper] No contact info found on Contact page.`);
          }
        } catch (err) {
          console.log(`[Adaptive Scraper] Error scraping Contact page: ${err.message}`);
        }
      } else {
        console.log(`[Adaptive Scraper] No Contact page link found.`);
      }
    }
    
    return result;
  }

  // Monitor for changes and adapt
  async monitorForChanges(page) {
    const currentSelectors = this.selectorCache.get('current');
    if (!currentSelectors) return;

    // Check if current selectors are still working
    for (const [field, selector] of Object.entries(currentSelectors)) {
      if (selector) {
        try {
          const element = await page.$(selector);
          if (!element) {
            console.log(`[Adaptive Scraper] Selector changed for ${field}, re-detecting...`);
            await this.adaptToChanges(page);
            break;
          }
        } catch (error) {
          console.log(`[Adaptive Scraper] Selector error for ${field}, re-detecting...`);
          await this.adaptToChanges(page);
          break;
        }
      }
    }
  }

  async adaptToChanges(page) {
    console.log('[Adaptive Scraper] Adapting to Google Maps changes...');
    
    // Record adaptation attempt
    this.adaptationHistory.push({
      timestamp: new Date().toISOString(),
      action: 'selector_change_detected'
    });

    // Re-detect selectors
    const newSelectors = await this.detectSelectors(page);
    
    // Update cache
    this.selectorCache.set('current', newSelectors);
    
    console.log('[Adaptive Scraper] Adaptation completed');
  }

  // Initialize browser and context (same as original)
  async init() {
    const headless = true;
    const browsers = ['chromium', 'firefox'];
    const selectedBrowser = this.options.browser || browsers[Math.floor(Math.random() * browsers.length)];
    
    // Prepare launch options with proxy support
    const launchOptions = {
      headless: headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    
    // Add proxy configuration if provided
    if (this.options.proxy) {
      if (typeof this.options.proxy === 'string') {
        // Single proxy string
        launchOptions.proxy = {
          server: this.options.proxy
        };
      } else if (this.options.proxy.proxy) {
        // Proxy object with additional options
        launchOptions.proxy = {
          server: this.options.proxy.proxy,
          username: this.options.proxy.username,
          password: this.options.proxy.password
        };
      }
    }
    
    if (selectedBrowser === 'firefox') {
      const { firefox } = require('playwright');
      this.browser = await firefox.launch(launchOptions);
    } else {
      // Add Chrome-specific args for better stealth
      launchOptions.args.push(
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      );
      this.browser = await chromium.launch(launchOptions);
    }
    
    if (this.options.stealthLevel === 'high-stealth') {
      await this.initHighStealthContext();
    } else {
      await this.initOptimizedContext();
    }
  }

  async initOptimizedContext() {
    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    this.page = await this.context.newPage();
    
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete navigator.__proto__.webdriver;
    });
  }

  async initHighStealthContext() {
    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: this.getRandomViewport(),
      locale: this.getRandomLocale(),
      timezoneId: this.getRandomTimezone(),
      bypassCSP: true
    });
    this.page = await this.context.newPage();
    
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete navigator.__proto__.webdriver;
      
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'permissions', { get: () => ({ query: () => Promise.resolve({ state: 'granted' }) }) });
    });

    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  getRandomViewport() {
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  getRandomLocale() {
    const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU'];
    return locales[Math.floor(Math.random() * locales.length)];
  }

  getRandomTimezone() {
    const timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'Europe/London'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  // Process URLs with adaptive extraction
  async processUrlsInBatches(urls, progressCb, batchSize = 3) {
    const results = [];
    const totalUrls = urls.length;
    
    console.log(`[Adaptive Scraper] Processing ${totalUrls} URLs in batches of ${batchSize}`);
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      console.log(`[Adaptive Scraper] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(urls.length / batchSize)}`);
      
      const batchPromises = batch.map(async (url, index) => {
        const individualContext = await this.browser.newContext({
          userAgent: this.getRandomUserAgent(),
          viewport: { width: 1366, height: 768 },
          locale: 'en-US',
          timezoneId: 'America/New_York'
        });
        
        const page = await individualContext.newPage();
        
        try {
          const result = await this.extractBusinessDetailsAdaptive(url, page);
          
          // Monitor for changes during extraction
          if (this.options.autoAdapt) {
            await this.monitorForChanges(page);
          }
          
          console.log(`[Adaptive Worker ${index + 1}] Completed: ${url}`);
          return result;
        } catch (error) {
          console.error(`[Adaptive Worker ${index + 1}] Error processing ${url}:`, error.message);
          return this.getEmptyResult(url);
        } finally {
          await page.close();
          await individualContext.close();
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const progress = Math.round(((i + batchSize) / totalUrls) * 100);
      progressCb(Math.min(progress, 100), [...results]);
      
      if (i + batchSize < urls.length) {
        console.log(`[Adaptive Scraper] Waiting 3000ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    return results;
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  // Get adaptation statistics
  getAdaptationStats() {
    return {
      totalAdaptations: this.adaptationHistory.length,
      lastAdaptation: this.adaptationHistory[this.adaptationHistory.length - 1],
      selectorCache: Object.fromEntries(this.selectorCache),
      adaptationHistory: this.adaptationHistory
    };
  }
}

module.exports = AdaptiveGoogleMapsScraper; 