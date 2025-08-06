const CombinedGoogleMapsScraper = require('./combined-scraper');

// Helper function to clean text fields
function cleanText(text) {
  if (!text) return '';
  return text.replace(/[""]/g, '').replace(/[\u200B]/g, '');
}

async function testOptimizedMode() {
  console.log('\n=== Testing OPTIMIZED Mode (Faster) ===');
  const scraper = new CombinedGoogleMapsScraper({ 
    stealthLevel: 'optimized',
    batchSize: 3 
  });
  
  try {
    await scraper.init();
    
    const startTime = Date.now();
    const results = await scraper.scrapeAndEnrich('restaurants', 'New York', 5, (progress, currentResults) => {
      console.log(`Progress: ${progress}% (${currentResults.length} businesses processed)`);
    });
    
    const endTime = Date.now();
    console.log(`Optimized mode completed in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Found ${results.length} businesses`);
    
  } catch (error) {
    console.error('Error in optimized mode:', error);
  } finally {
    await scraper.close();
  }
}

async function testHighStealthMode() {
  console.log('\n=== Testing HIGH-STEALTH Mode (Slower but more anti-detection) ===');
  const scraper = new CombinedGoogleMapsScraper({ 
    stealthLevel: 'high-stealth',
    batchSize: 2 
  });
  
  try {
    await scraper.init();
    
    const startTime = Date.now();
    const results = await scraper.scrapeAndEnrich('coffee shops', 'Los Angeles', 3, (progress, currentResults) => {
      console.log(`Progress: ${progress}% (${currentResults.length} businesses processed)`);
    });
    
    const endTime = Date.now();
    console.log(`High-stealth mode completed in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Found ${results.length} businesses`);
    
  } catch (error) {
    console.error('Error in high-stealth mode:', error);
  } finally {
    await scraper.close();
  }
}

async function main() {
  console.log('Testing Google Maps Scraper with different stealth levels...');
  
  // Test optimized mode first (faster)
  await testOptimizedMode();
  
  // Test high-stealth mode (slower but more anti-detection)
  await testHighStealthMode();
  
  console.log('\n=== Test Complete ===');
  console.log('Check combined_results.csv for results');
}

if (require.main === module) {
  main().catch(console.error);
} 