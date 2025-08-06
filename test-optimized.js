const CombinedGoogleMapsScraper = require('./combined-scraper');
const config = require('./config');

async function testOptimizedMode() {
  console.log('=== Testing OPTIMIZED Mode Only ===');
  
  const scraper = new CombinedGoogleMapsScraper({
    stealthLevel: 'optimized',
    headless: false // Set to true for production
  });
  
  try {
    await scraper.init();
    
    // Test with a specific target
    const searchTerm = 'pharmacies';
    const location = 'Delhi';
    const targetResults = 12; // Request exactly 12 results
    
    console.log(`Testing with target: ${targetResults} results for "${searchTerm}" in "${location}"`);
    
    const startTime = Date.now();
    
    const results = await scraper.scrapeAndEnrich(searchTerm, location, targetResults, (progress, currentResults) => {
      console.log(`Progress: ${progress}% (${currentResults.length} businesses processed)`);
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n=== Results ===`);
    console.log(`Target: ${targetResults} results`);
    console.log(`Found: ${results.length} results`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Success Rate: ${((results.length / targetResults) * 100).toFixed(1)}%`);
    
    if (results.length > 0) {
      console.log(`\n=== Sample Results ===`);
      results.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result['Business Name']}`);
        console.log(`   Address: ${result['Address']}`);
        console.log(`   Phone: ${result['Phone Number']}`);
        console.log(`   Rating: ${result['Rating']}`);
        console.log('');
      });
    }
    
    if (results.length < targetResults) {
      console.log(`\n⚠️  WARNING: Only found ${results.length}/${targetResults} results`);
      console.log(`This may be due to insufficient available businesses or extraction issues`);
    } else {
      console.log(`\n✅ SUCCESS: Found exactly ${results.length}/${targetResults} results`);
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await scraper.close();
  }
}

// Run the test
testOptimizedMode(); 