const CombinedGoogleMapsScraper = require('./combined-scraper');

// Helper function to clean text fields
function cleanText(text) {
  if (!text) return '';
  return text.replace(/[""]/g, '').replace(/[\u200B]/g, '');
}

async function testCombinedScraperAll() {
  // Test parameters - get ALL available results
  const searchTerm = 'coffee shops';
  const location = 'Manhattan, NY';
  const maxResults = 9999; // Get all available results
  const batchSize = 5; // Process 5 URLs concurrently for maximum speed
  
  const scraper = new CombinedGoogleMapsScraper({ batchSize });
  
  try {
    console.log('🚀 Starting combined scraper test (ALL RESULTS)...');
    await scraper.init();
    
    console.log(`📋 Search: "${searchTerm}" in "${location}"`);
    console.log(`📊 Max results: ${maxResults} (all available)`);
    console.log(`⚡ Batch size: ${batchSize} (concurrent URLs)`);
    console.log('⏳ Starting scrape and enrich process...\n');
    
    const results = await scraper.scrapeAndEnrich(
      searchTerm, 
      location, 
      maxResults, 
      (progress, currentResults) => {
        console.log(`📈 Progress: ${progress}% (${currentResults.length} businesses processed)`);
      }
    );
    
    console.log('\n✅ Scraping completed successfully!');
    console.log(`📊 Total businesses processed: ${results.length}`);
    console.log('📁 Results saved to: combined_results.csv');
    
          // Display first few results
      if (results.length > 0) {
        console.log('\n📋 Sample results:');
        results.slice(0, 5).forEach((business, index) => {
          console.log(`\n${index + 1}. ${business['Business Name'] || 'N/A'}`);
          console.log(`   Rating: ${cleanText(business['Rating']) || 'N/A'}`);
          console.log(`   Reviews: ${business['Reviews'] || 'N/A'}`);
          console.log(`   Address: ${cleanText(business['Address']) || 'N/A'}`);
          console.log(`   Phone: ${business['Phone Number'] || 'N/A'}`);
          console.log(`   Website: ${business['Website'] || 'N/A'}`);
          console.log(`   Email: ${business['Email'] || 'N/A'}`);
          console.log(`   Instagram: ${business['Instagram'] || 'N/A'}`);
          console.log(`   LinkedIn: ${business['LinkedIn'] || 'N/A'}`);
          console.log(`   Facebook: ${business['Facebook'] || 'N/A'}`);
        });
        
        if (results.length > 5) {
          console.log(`\n... and ${results.length - 5} more businesses`);
        }
      }
    
  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await scraper.close();
    console.log('\n🔒 Browser closed');
  }
}

// Run the test
testCombinedScraperAll(); 