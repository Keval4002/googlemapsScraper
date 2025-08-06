const { chromium } = require('playwright');

class DataEnrichment {
  constructor(options = {}) {
    this.options = options;
  }

  async enrich(business) {
    // TODO: Visit business.website and extract social, tech, company size, sentiment, etc.
    return business;
  }
}

module.exports = DataEnrichment; 