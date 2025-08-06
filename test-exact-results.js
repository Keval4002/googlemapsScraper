const CombinedGoogleMapsScraper = require('./combined-scraper');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function testExactResults() {
  console.log('=== Testing EXACT Results Accuracy ===');
  
  const scraper = new CombinedGoogleMapsScraper({
    stealthLevel: 'optimized',
    headless: false // Set to true for production
  });
  
  try {
    await scraper.init();
    
    // Test with a specific target
    const searchTerm = 'restaurants';
    const location = 'Mumbai';
    const targetResults = 8; // Request exactly 8 results
    
    console.log(`Testing with target: ${targetResults} results for "${searchTerm}" in "${location}"`);
    
    // Get initial database count
    const { data: initialDbResults, error: initialDbError } = await supabase
      .from('business_results')
      .select('*');
    
    const initialCount = initialDbResults ? initialDbResults.length : 0;
    console.log(`Initial database count: ${initialCount} businesses`);
    
    const startTime = Date.now();
    
    const results = await scraper.scrapeAndEnrich(searchTerm, location, targetResults, (progress, currentResults) => {
      console.log(`Progress: ${progress}% (${currentResults.length} businesses processed)`);
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Get final database count
    const { data: finalDbResults, error: finalDbError } = await supabase
      .from('business_results')
      .select('*');
    
    const finalCount = finalDbResults ? finalDbResults.length : 0;
    const newInDb = finalCount - initialCount;
    
    console.log(`\n=== Results Analysis ===`);
    console.log(`Target: ${targetResults} results`);
    console.log(`Returned by scraper: ${results.length} results`);
    console.log(`New in database: ${newInDb} results`);
    console.log(`Total in database: ${finalCount} results`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    
    // Calculate success rates
    const scraperSuccessRate = ((results.length / targetResults) * 100).toFixed(1);
    const dbSuccessRate = ((newInDb / targetResults) * 100).toFixed(1);
    
    console.log(`Scraper Success Rate: ${scraperSuccessRate}%`);
    console.log(`Database Success Rate: ${dbSuccessRate}%`);
    
    // Verify accuracy
    let accuracyStatus = '❌ FAILED';
    if (results.length === targetResults && newInDb === targetResults) {
      accuracyStatus = '✅ PERFECT';
    } else if (results.length === targetResults) {
      accuracyStatus = '⚠️ PARTIAL (scraper OK, database mismatch)';
    } else if (newInDb === targetResults) {
      accuracyStatus = '⚠️ PARTIAL (database OK, scraper mismatch)';
    }
    
    console.log(`\n=== Accuracy Status ===`);
    console.log(accuracyStatus);
    
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
    
    // Detailed analysis
    console.log(`\n=== Detailed Analysis ===`);
    if (results.length !== targetResults) {
      console.log(`❌ Scraper returned ${results.length} instead of ${targetResults} results`);
    } else {
      console.log(`✅ Scraper returned exactly ${targetResults} results`);
    }
    
    if (newInDb !== targetResults) {
      console.log(`❌ Database has ${newInDb} new entries instead of ${targetResults}`);
    } else {
      console.log(`✅ Database has exactly ${targetResults} new entries`);
    }
    
    if (results.length !== newInDb) {
      console.log(`❌ Mismatch: Scraper returned ${results.length} but database has ${newInDb} new entries`);
    } else {
      console.log(`✅ Consistency: Scraper and database match (${results.length} entries)`);
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await scraper.close();
  }
}

// Run the test
testExactResults(); 