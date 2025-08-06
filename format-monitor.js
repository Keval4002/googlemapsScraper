/**
 * Google Maps Format Monitor
 * Monitors for layout changes and alerts when updates are needed
 */

const fs = require('fs');
const path = require('path');
const GoogleMapsFormatDetector = require('./format-detector');

class FormatMonitor {
  constructor(options = {}) {
    this.options = {
      checkInterval: options.checkInterval || 24 * 60 * 60 * 1000, // 24 hours
      alertThreshold: options.alertThreshold || 3, // Number of failures before alert
      logFile: options.logFile || './data/format-monitor.log',
      formatHistoryFile: options.formatHistoryFile || './data/format-history.json'
    };
    
    this.detector = new GoogleMapsFormatDetector();
    this.failureCount = 0;
    this.lastCheck = null;
    this.formatHistory = this.loadFormatHistory();
  }

  /**
   * Load format history from file
   */
  loadFormatHistory() {
    try {
      if (fs.existsSync(this.options.formatHistoryFile)) {
        const data = fs.readFileSync(this.options.formatHistoryFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('[FormatMonitor] Could not load format history:', error.message);
    }
    
    return {
      versions: [],
      changes: [],
      lastUpdate: null
    };
  }

  /**
   * Save format history to file
   */
  saveFormatHistory() {
    try {
      const dir = path.dirname(this.options.formatHistoryFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.options.formatHistoryFile, JSON.stringify(this.formatHistory, null, 2));
    } catch (error) {
      console.error('[FormatMonitor] Could not save format history:', error.message);
    }
  }

  /**
   * Log format check result
   */
  logCheck(result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      success: result.success,
      format: result.format,
      recommendations: result.recommendations,
      error: result.error
    };

    try {
      const dir = path.dirname(this.options.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.appendFileSync(this.options.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('[FormatMonitor] Could not write to log file:', error.message);
    }
  }

  /**
   * Check current format and compare with history
   */
  async checkFormat(page) {
    console.log('[FormatMonitor] Checking Google Maps format...');
    
    const result = {
      success: false,
      format: null,
      recommendations: [],
      error: null,
      isNewFormat: false
    };

    try {
      // Detect current format
      const currentFormat = await this.detector.detectFormat(page);
      result.format = currentFormat;
      result.success = true;

      // Validate format
      const isValid = await this.detector.validateFormat(page);
      if (!isValid) {
        result.recommendations.push('Format validation failed - manual review needed');
      }

      // Check if this is a new format
      const lastFormat = this.formatHistory.versions[this.formatHistory.versions.length - 1];
      if (lastFormat && lastFormat.version !== currentFormat.version) {
        result.isNewFormat = true;
        result.recommendations.push(`New format detected: ${currentFormat.version} (was: ${lastFormat.version})`);
        
        // Record format change
        this.formatHistory.changes.push({
          timestamp: new Date().toISOString(),
          from: lastFormat.version,
          to: currentFormat.version,
          selectors: currentFormat.selectors
        });
      }

      // Update history
      this.formatHistory.versions.push({
        timestamp: new Date().toISOString(),
        version: currentFormat.version,
        selectors: currentFormat.selectors
      });

      // Keep only last 10 versions
      if (this.formatHistory.versions.length > 10) {
        this.formatHistory.versions = this.formatHistory.versions.slice(-10);
      }

      this.formatHistory.lastUpdate = new Date().toISOString();
      this.saveFormatHistory();

      // Reset failure count on success
      this.failureCount = 0;

    } catch (error) {
      result.error = error.message;
      result.success = false;
      this.failureCount++;
      
      if (this.failureCount >= this.options.alertThreshold) {
        result.recommendations.push(`Multiple format check failures (${this.failureCount}) - immediate attention required`);
      }
    }

    this.lastCheck = new Date().toISOString();
    this.logCheck(result);

    return result;
  }

  /**
   * Get format monitoring report
   */
  getReport() {
    return {
      lastCheck: this.lastCheck,
      failureCount: this.failureCount,
      formatHistory: this.formatHistory,
      recommendations: this.getRecommendations(),
      status: this.getStatus()
    };
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    if (this.failureCount >= this.options.alertThreshold) {
      return 'CRITICAL';
    } else if (this.failureCount > 0) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  /**
   * Get recommendations based on monitoring data
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.failureCount >= this.options.alertThreshold) {
      recommendations.push(`CRITICAL: ${this.failureCount} consecutive format check failures`);
      recommendations.push('Immediate action required - Google Maps format may have changed');
    }
    
    if (this.formatHistory.changes.length > 0) {
      const recentChanges = this.formatHistory.changes.slice(-3);
      recommendations.push(`Recent format changes: ${recentChanges.map(c => `${c.from} → ${c.to}`).join(', ')}`);
    }
    
    if (!this.lastCheck) {
      recommendations.push('No format checks performed yet');
    }
    
    return recommendations;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(page) {
    console.log('[FormatMonitor] Starting continuous monitoring...');
    
    const checkAndAlert = async () => {
      const result = await this.checkFormat(page);
      
      if (result.isNewFormat || result.recommendations.length > 0) {
        console.warn('[FormatMonitor] ALERT:', result.recommendations);
        // Here you could send email notifications, webhooks, etc.
        this.sendAlert(result);
      }
    };

    // Initial check
    checkAndAlert();
    
    // Set up periodic checks
    this.monitoringInterval = setInterval(checkAndAlert, this.options.checkInterval);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[FormatMonitor] Stopped continuous monitoring');
    }
  }

  /**
   * Send alert about format changes
   */
  sendAlert(result) {
    // This could send emails, webhooks, Slack messages, etc.
    console.error('[FormatMonitor] FORMAT CHANGE ALERT:');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Success:', result.success);
    console.error('Format:', result.format?.version);
    console.error('Recommendations:', result.recommendations);
    
    if (result.error) {
      console.error('Error:', result.error);
    }
    
    // TODO: Implement actual alert mechanisms
    // - Email notification
    // - Webhook to monitoring service
    // - Slack/Discord integration
    // - SMS alert
  }

  /**
   * Get format change statistics
   */
  getStatistics() {
    const stats = {
      totalChecks: this.formatHistory.versions.length,
      totalChanges: this.formatHistory.changes.length,
      currentFailureCount: this.failureCount,
      lastCheck: this.lastCheck,
      status: this.getStatus()
    };

    if (this.formatHistory.changes.length > 0) {
      const recentChanges = this.formatHistory.changes.slice(-5);
      stats.recentChanges = recentChanges;
      
      // Calculate average time between changes
      if (this.formatHistory.changes.length > 1) {
        const intervals = [];
        for (let i = 1; i < this.formatHistory.changes.length; i++) {
          const prev = new Date(this.formatHistory.changes[i-1].timestamp);
          const curr = new Date(this.formatHistory.changes[i].timestamp);
          intervals.push(curr - prev);
        }
        stats.averageDaysBetweenChanges = intervals.reduce((a, b) => a + b, 0) / intervals.length / (1000 * 60 * 60 * 24);
      }
    }

    return stats;
  }
}

module.exports = FormatMonitor; 