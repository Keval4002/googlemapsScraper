# 🚀 Adaptive Google Maps Scraper

This enhanced version of your Google Maps scraper includes **automatic adaptation** capabilities to handle Google Maps changes without manual intervention.

## 🎯 Key Features

### 🔄 **Automatic Adaptation**
- **Selector Detection**: Automatically detects working selectors when Google changes their HTML structure
- **Fallback Mechanisms**: Multiple extraction methods ensure data is captured even when primary selectors fail
- **Real-time Monitoring**: Continuous health checks to detect issues before they affect your scraping

### 🛡️ **Resilience Features**
- **Multiple Selector Patterns**: 6+ different selector patterns for each data field
- **Generic Extraction**: Fallback to pattern-based extraction when specific selectors fail
- **User Agent Rotation**: Automatic switching between different browsers and user agents
- **Stealth Modes**: Optimized and high-stealth modes for different scenarios

### 📊 **Monitoring & Alerts**
- **Health Checks**: Regular testing to ensure scraper is working
- **Failure Detection**: Automatic detection of consecutive failures
- **Backup System**: Automatic backup of working selectors
- **Alert System**: Notifications when manual intervention is needed

## 📁 Files Overview

```
google-maps-scraper/
├── adaptive-scraper.js      # Main adaptive scraper class
├── monitor-and-fix.js       # Monitoring and auto-fix system
├── run-monitor.js          # Script to run continuous monitoring
├── test-adaptive.js        # Test script for adaptive features
├── combined-scraper.js     # Original scraper (still works)
└── ADAPTIVE_README.md      # This file
```

## 🚀 Quick Start

### 1. Test the Adaptive Scraper
```bash
node test-adaptive.js
```

### 2. Run Continuous Monitoring
```bash
node run-monitor.js
```

### 3. Use in Your Code
```javascript
const AdaptiveGoogleMapsScraper = require('./adaptive-scraper');

const scraper = new AdaptiveGoogleMapsScraper({
  stealthLevel: 'optimized',
  batchSize: 3,
  autoAdapt: true
});

await scraper.init();
const results = await scraper.processUrlsInBatches(urls, progressCb, 3);
```

## 🔧 How It Works

### 1. **Selector Detection**
The scraper maintains a list of multiple selector patterns for each data field:

```javascript
// Business Name selectors
selectors.businessName = [
  'h1[data-attrid="title"]',
  'h1.DUwDvf',
  'h1[role="main"]',
  'h1',
  '[data-value="Business Name"]',
  'div[role="main"] h1'
];
```

### 2. **Adaptive Extraction**
When a selector fails, the system automatically tries alternatives:

```javascript
async extractWithFallback(page, selector, fieldName) {
  if (!selector) {
    return await this.genericExtraction(page, fieldName);
  }
  
  try {
    const element = await page.$(selector);
    if (element) {
      return await element.textContent();
    }
  } catch (error) {
    // Fallback to generic extraction
    return await this.genericExtraction(page, fieldName);
  }
}
```

### 3. **Monitoring System**
Continuous health checks ensure the scraper is working:

```javascript
async performHealthCheck() {
  const result = await scraper.extractBusinessDetails(testUrl);
  
  if (result['Business Name'] && result['Address'] && result['Phone Number']) {
    console.log('✅ Health check passed');
    this.failureCount = 0;
  } else {
    console.log('⚠️ Health check failed');
    this.failureCount++;
    
    if (this.failureCount >= this.options.maxFailures) {
      await this.triggerAdaptation();
    }
  }
}
```

## 📈 Adaptation Statistics

The system tracks all adaptation attempts:

```javascript
const stats = scraper.getAdaptationStats();
console.log(`Total adaptations: ${stats.totalAdaptations}`);
console.log(`Current selectors:`, stats.selectorCache.current);
console.log(`Adaptation history:`, stats.adaptationHistory);
```

## 🛠️ Configuration Options

### Adaptive Scraper Options
```javascript
const scraper = new AdaptiveGoogleMapsScraper({
  stealthLevel: 'optimized',    // 'optimized' or 'high-stealth'
  batchSize: 3,                 // Number of concurrent scrapes
  autoAdapt: true,              // Enable automatic adaptation
  selectorTimeout: 10000,       // Timeout for selector detection
  maxRetries: 3                 // Max retries per URL
});
```

### Monitor Options
```javascript
const monitor = new GoogleMapsMonitor({
  checkInterval: 300000,        // Check every 5 minutes
  maxFailures: 2,               // Alert after 2 consecutive failures
  backupSelectors: true,        // Backup working selectors
  logChanges: true              // Log all adaptation attempts
});
```

## 🔍 Monitoring Dashboard

The monitoring system provides real-time status:

```javascript
const status = monitor.getStatus();
console.log({
  monitoring: status.monitoring,           // Is monitoring active?
  failureCount: status.failureCount,       // Current failure count
  lastSuccessTime: status.lastSuccessTime, // Last successful extraction
  totalAdaptations: status.totalAdaptations // Total adaptations made
});
```

## 📊 Log Files

The system creates several log files:

- `adaptation-log.json` - History of all adaptation attempts
- `backup-selectors.json` - Backup of working selectors
- `alerts.log` - Alert history when manual intervention is needed

## 🚨 Alert System

When the system detects issues it can't automatically fix:

1. **Email Alerts** (configurable)
2. **Slack Webhooks** (configurable)
3. **Discord Notifications** (configurable)
4. **SMS Alerts** (configurable)

## 🔄 Migration from Original Scraper

To migrate from your original scraper:

1. **Replace the import**:
   ```javascript
   // Old
   const CombinedGoogleMapsScraper = require('./combined-scraper');
   
   // New
   const AdaptiveGoogleMapsScraper = require('./adaptive-scraper');
   ```

2. **Update the constructor**:
   ```javascript
   // Old
   const scraper = new CombinedGoogleMapsScraper(options);
   
   // New
   const scraper = new AdaptiveGoogleMapsScraper({
     ...options,
     autoAdapt: true
   });
   ```

3. **Add monitoring** (optional):
   ```javascript
   const GoogleMapsMonitor = require('./monitor-and-fix');
   const monitor = new GoogleMapsMonitor();
   await monitor.startMonitoring();
   ```

## 🎯 Benefits

### ✅ **Zero Downtime**
- Automatic detection and adaptation to Google Maps changes
- No manual intervention required for most changes

### ✅ **Higher Success Rate**
- Multiple fallback mechanisms ensure data extraction
- Pattern-based extraction when selectors fail

### ✅ **Real-time Monitoring**
- Continuous health checks prevent silent failures
- Early warning system for potential issues

### ✅ **Self-Healing**
- Automatic restoration from backup selectors
- Alternative extraction methods when primary methods fail

### ✅ **Comprehensive Logging**
- Full history of all adaptation attempts
- Detailed statistics for optimization

## 🚀 Production Deployment

For production use:

1. **Run the monitor continuously**:
   ```bash
   node run-monitor.js
   ```

2. **Set up alerts**:
   - Configure email/Slack notifications
   - Set appropriate failure thresholds

3. **Monitor logs**:
   - Check `adaptation-log.json` regularly
   - Review `alerts.log` for issues

4. **Backup selectors**:
   - The system automatically backs up working selectors
   - Manual backups available via `backupSelectors()` method

## 🔧 Troubleshooting

### Common Issues

1. **High adaptation frequency**: Google may be changing selectors frequently
   - Solution: Increase `checkInterval` and `maxFailures`

2. **False positives**: System detecting failures when scraping is working
   - Solution: Adjust health check criteria

3. **Performance impact**: Monitoring adds overhead
   - Solution: Increase `checkInterval` or disable monitoring in high-volume scenarios

### Manual Intervention

If the system can't automatically fix an issue:

1. Check `alerts.log` for details
2. Review `adaptation-log.json` for patterns
3. Manually update selectors if needed
4. Restart the monitoring system

## 📞 Support

The adaptive system is designed to be self-maintaining, but if you need help:

1. Check the logs for detailed error information
2. Review adaptation history for patterns
3. Test with `test-adaptive.js` to isolate issues
4. Consider updating selector patterns if Google makes major changes

---

**🎉 Your scraper is now future-proof against Google Maps changes!** 