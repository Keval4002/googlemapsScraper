const AdaptiveGoogleMapsScraper = require('./adaptive-scraper');
const fs = require('fs');
const path = require('path');

class GoogleMapsMonitor {
  constructor(options = {}) {
    this.options = {
      checkInterval: 60000, // Check every minute
      maxFailures: 3, // Max consecutive failures before alert
      backupSelectors: true,
      logChanges: true,
      ...options
    };
    
    this.failureCount = 0;
    this.lastSuccessTime = null;
    this.monitoring = false;
    this.adaptationLog = [];
    this.selectorBackups = new Map();
  }

  async startMonitoring() {
    console.log('[Monitor] Starting Google Maps monitoring...');
    this.monitoring = true;
    
    while (this.monitoring) {
      try {
        await this.performHealthCheck();
        await this.sleep(this.options.checkInterval);
      } catch (error) {
        console.error('[Monitor] Monitoring error:', error.message);
        await this.sleep(30000); // Wait 30 seconds on error
      }
    }
  }

  async performHealthCheck() {
    console.log('[Monitor] Performing health check...');
    
    const testUrl = 'https://www.google.com/maps/place/Young+Chiropractic+Center/data=!4m7!3m6!1s0x79524b561a8908a1:0x8e174239ec29fb98!8m2!3d19.7241421!4d-155.0887032!16s%2Fg%2F1tfkqzn2!19sChIJoQiJGlZLUnkRmPsp7DlCF44?authuser=0&hl=en&rclk=1';
    
    const scraper = new AdaptiveGoogleMapsScraper({
      stealthLevel: 'optimized',
      batchSize: 1,
      autoAdapt: true
    });

    try {
      await scraper.init();
      
      const results = await scraper.processUrlsInBatches([testUrl], () => {}, 1);
      const result = results[0];
      
      // Check if extraction was successful
      const hasRequiredFields = result['Business Name'] && 
                               result['Address'] && 
                               result['Phone Number'];
      
      if (hasRequiredFields) {
        console.log('[Monitor] ✅ Health check passed');
        this.failureCount = 0;
        this.lastSuccessTime = new Date();
        
        // Log successful extraction
        this.logAdaptation('health_check_success', {
          timestamp: new Date().toISOString(),
          fields: {
            businessName: !!result['Business Name'],
            address: !!result['Address'],
            phone: !!result['Phone Number'],
            rating: !!result['Rating'],
            reviews: !!result['Reviews'],
            website: !!result['Website']
          }
        });
        
      } else {
        console.log('[Monitor] ⚠️ Health check failed - missing required fields');
        this.failureCount++;
        
        // Log failure
        this.logAdaptation('health_check_failure', {
          timestamp: new Date().toISOString(),
          failureCount: this.failureCount,
          missingFields: {
            businessName: !result['Business Name'],
            address: !result['Address'],
            phone: !result['Phone Number']
          }
        });
        
        // Check if we need to trigger adaptation
        if (this.failureCount >= this.options.maxFailures) {
          await this.triggerAdaptation(scraper);
        }
      }
      
      // Get adaptation stats
      const stats = scraper.getAdaptationStats();
      if (stats.totalAdaptations > 0) {
        console.log(`[Monitor] Adaptation stats: ${stats.totalAdaptations} adaptations made`);
      }
      
    } catch (error) {
      console.error('[Monitor] ❌ Health check error:', error.message);
      this.failureCount++;
      
      this.logAdaptation('health_check_error', {
        timestamp: new Date().toISOString(),
        error: error.message,
        failureCount: this.failureCount
      });
      
      if (this.failureCount >= this.options.maxFailures) {
        await this.triggerEmergencyFix();
      }
    } finally {
      await scraper.close();
    }
  }

  async triggerAdaptation(scraper) {
    console.log('[Monitor] 🚨 Triggering adaptation due to repeated failures...');
    
    try {
      // Force re-detection of selectors
      const testUrl = 'https://www.google.com/maps/place/Young+Chiropractic+Center/data=!4m7!3m6!1s0x79524b561a8908a1:0x8e174239ec29fb98!8m2!3d19.7241421!4d-155.0887032!16s%2Fg%2F1tfkqzn2!19sChIJoQiJGlZLUnkRmPsp7DlCF44?authuser=0&hl=en&rclk=1';
      
      const page = await scraper.context.newPage();
      await page.goto(testUrl, { timeout: 60000 });
      
      // Force adaptation
      await scraper.adaptToChanges(page);
      
      // Test the adaptation
      const results = await scraper.processUrlsInBatches([testUrl], () => {}, 1);
      const result = results[0];
      
      if (result['Business Name'] && result['Address'] && result['Phone Number']) {
        console.log('[Monitor] ✅ Adaptation successful');
        this.failureCount = 0;
        
        this.logAdaptation('adaptation_success', {
          timestamp: new Date().toISOString(),
          newSelectors: scraper.selectorCache.get('current')
        });
        
        // Backup working selectors
        if (this.options.backupSelectors) {
          await this.backupSelectors(scraper.selectorCache.get('current'));
        }
        
      } else {
        console.log('[Monitor] ❌ Adaptation failed');
        this.logAdaptation('adaptation_failure', {
          timestamp: new Date().toISOString(),
          result: result
        });
      }
      
      await page.close();
      
    } catch (error) {
      console.error('[Monitor] Adaptation error:', error.message);
      this.logAdaptation('adaptation_error', {
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  async triggerEmergencyFix() {
    console.log('[Monitor] 🚨🚨 EMERGENCY: Triggering emergency fix...');
    
    try {
      // Try to restore from backup selectors
      const backupSelectors = await this.loadBackupSelectors();
      if (backupSelectors) {
        console.log('[Monitor] Attempting to restore from backup selectors...');
        // Implementation would restore selectors
      }
      
      // Try alternative extraction methods
      await this.tryAlternativeMethods();
      
      // Send alert (could be email, Slack, etc.)
      await this.sendAlert('Google Maps scraper requires manual intervention');
      
    } catch (error) {
      console.error('[Monitor] Emergency fix error:', error.message);
    }
  }

  async tryAlternativeMethods() {
    console.log('[Monitor] Trying alternative extraction methods...');
    
    // Try different user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    
    for (const userAgent of userAgents) {
      try {
        const scraper = new AdaptiveGoogleMapsScraper({
          stealthLevel: 'high-stealth',
          batchSize: 1
        });
        
        await scraper.init();
        
        // Override user agent
        await scraper.context.addInitScript(() => {
          Object.defineProperty(navigator, 'userAgent', { get: () => userAgent });
        });
        
        const testUrl = 'https://www.google.com/maps/place/Young+Chiropractic+Center/data=!4m7!3m6!1s0x79524b561a8908a1:0x8e174239ec29fb98!8m2!3d19.7241421!4d-155.0887032!16s%2Fg%2F1tfkqzn2!19sChIJoQiJGlZLUnkRmPsp7DlCF44?authuser=0&hl=en&rclk=1';
        const results = await scraper.processUrlsInBatches([testUrl], () => {}, 1);
        
        if (results[0]['Business Name']) {
          console.log(`[Monitor] ✅ Alternative method with user agent ${userAgent.substring(0, 50)}... worked`);
          await scraper.close();
          return true;
        }
        
        await scraper.close();
        
      } catch (error) {
        console.log(`[Monitor] Alternative method with user agent failed: ${error.message}`);
      }
    }
    
    return false;
  }

  async backupSelectors(selectors) {
    try {
      const backupPath = path.join(__dirname, 'backup-selectors.json');
      const backup = {
        timestamp: new Date().toISOString(),
        selectors: selectors,
        version: '1.0'
      };
      
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
      console.log('[Monitor] Selectors backed up successfully');
      
    } catch (error) {
      console.error('[Monitor] Backup error:', error.message);
    }
  }

  async loadBackupSelectors() {
    try {
      const backupPath = path.join(__dirname, 'backup-selectors.json');
      if (fs.existsSync(backupPath)) {
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        return backup.selectors;
      }
    } catch (error) {
      console.error('[Monitor] Load backup error:', error.message);
    }
    return null;
  }

  async sendAlert(message) {
    console.log(`[Monitor] ALERT: ${message}`);
    
    // Here you could implement:
    // - Email notification
    // - Slack webhook
    // - SMS
    // - Discord webhook
    // - etc.
    
    // For now, just log to file
    const alertLog = {
      timestamp: new Date().toISOString(),
      message: message,
      failureCount: this.failureCount,
      lastSuccess: this.lastSuccessTime
    };
    
    const alertPath = path.join(__dirname, 'alerts.log');
    fs.appendFileSync(alertPath, JSON.stringify(alertLog) + '\n');
  }

  logAdaptation(type, data) {
    if (!this.options.logChanges) return;
    
    const logEntry = {
      type,
      ...data
    };
    
    this.adaptationLog.push(logEntry);
    
    // Keep only last 100 entries
    if (this.adaptationLog.length > 100) {
      this.adaptationLog = this.adaptationLog.slice(-100);
    }
    
    // Save to file
    const logPath = path.join(__dirname, 'adaptation-log.json');
    fs.writeFileSync(logPath, JSON.stringify(this.adaptationLog, null, 2));
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopMonitoring() {
    console.log('[Monitor] Stopping monitoring...');
    this.monitoring = false;
  }

  getStatus() {
    return {
      monitoring: this.monitoring,
      failureCount: this.failureCount,
      lastSuccessTime: this.lastSuccessTime,
      adaptationLog: this.adaptationLog.slice(-10), // Last 10 entries
      totalAdaptations: this.adaptationLog.length
    };
  }
}

module.exports = GoogleMapsMonitor; 