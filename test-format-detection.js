#!/usr/bin/env node

/**
 * Test Google Maps Format Detection
 * Demonstrates the format detection and monitoring system
 */

const { chromium } = require('playwright');
const GoogleMapsFormatDetector = require('./format-detector');
const FormatMonitor = require('./format-monitor');

async function testFormatDetection() {
  console.log('🔍 Testing Google Maps Format Detection...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to Google Maps
    console.log('📱 Loading Google Maps...');
    await page.goto('https://www.google.com/maps/search/restaurants+New+York', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    
    // Initialize format detector
    const detector = new GoogleMapsFormatDetector();
    
    // Detect current format
    console.log('🔍 Detecting current format...');
    const format = await detector.detectFormat(page);
    
    console.log('\n📊 Format Detection Results:');
    console.log('Version:', format.version);
    console.log('Timestamp:', format.timestamp);
    console.log('\nWorking Selectors:');
    Object.entries(format.selectors).forEach(([type, selector]) => {
      console.log(`  ${type}: ${selector}`);
    });
    
    // Validate format
    console.log('\n✅ Validating format...');
    const isValid = await detector.validateFormat(page);
    console.log('Format valid:', isValid);
    
    // Get recommendations
    const report = detector.getReport();
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    
    // Test data extraction
    console.log('\n🧪 Testing data extraction...');
    const testData = {};
    
    const elementsToTest = ['businessCards', 'businessName', 'rating', 'reviews'];
    for (const elementType of elementsToTest) {
      try {
        const data = await detector.extractData(page, elementType);
        testData[elementType] = data ? 'SUCCESS' : 'NO DATA';
      } catch (error) {
        testData[elementType] = `ERROR: ${error.message}`;
      }
    }
    
    console.log('Extraction Test Results:');
    Object.entries(testData).forEach(([type, result]) => {
      console.log(`  ${type}: ${result}`);
    });
    
    // Initialize format monitor
    console.log('\n📈 Initializing format monitor...');
    const monitor = new FormatMonitor({
      checkInterval: 60 * 1000, // 1 minute for testing
      alertThreshold: 2
    });
    
    // Check format with monitor
    const checkResult = await monitor.checkFormat(page);
    console.log('\n📊 Monitor Check Results:');
    console.log('Success:', checkResult.success);
    console.log('Is New Format:', checkResult.isNewFormat);
    console.log('Recommendations:', checkResult.recommendations);
    
    // Get monitor report
    const monitorReport = monitor.getReport();
    console.log('\n📋 Monitor Report:');
    console.log('Status:', monitorReport.status);
    console.log('Last Check:', monitorReport.lastCheck);
    console.log('Failure Count:', monitorReport.failureCount);
    
    // Get statistics
    const stats = monitor.getStatistics();
    console.log('\n📊 Statistics:');
    console.log('Total Checks:', stats.totalChecks);
    console.log('Total Changes:', stats.totalChanges);
    console.log('Current Status:', stats.status);
    
    console.log('\n✅ Format detection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Format detection test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testFormatDetection().catch(console.error);
}

module.exports = { testFormatDetection }; 