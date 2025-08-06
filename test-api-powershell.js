const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAPIWithStealthLevel(stealthLevel, searchTerm, location, maxResults = 5) {
  console.log(`\n=== Testing ${stealthLevel.toUpperCase()} Mode via API ===`);
  
  try {
    const response = await axios.post(`${API_BASE}/scrape`, {
      searchTerm: searchTerm,
      location: location,
      maxResults: maxResults,
      batchSize: stealthLevel === 'high-stealth' ? 2 : 3,
      stealthLevel: stealthLevel
    });
    
    const jobId = response.data.jobId;
    console.log(`Job started with ID: ${jobId}`);
    console.log(`Stealth Level: ${stealthLevel}`);
    console.log(`Search: ${searchTerm} in ${location}`);
    console.log(`Max Results: ${maxResults}`);
    
    // Poll for completion
    let completed = false;
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(`${API_BASE}/jobs/${jobId}`);
      const job = statusResponse.data;
      
      console.log(`Status: ${job.status}, Progress: ${job.progress}%`);
      
      if (job.status === 'completed') {
        console.log(`✅ ${stealthLevel} mode completed! Found ${job.results.length} businesses`);
        
        // Show sample results
        if (job.results.length > 0) {
          console.log('\n📋 Sample Results:');
          job.results.slice(0, 2).forEach((business, index) => {
            console.log(`\n${index + 1}. ${business['Business Name'] || 'N/A'}`);
            console.log(`   Email: ${business['Email'] || 'N/A'}`);
            console.log(`   Website: ${business['Website'] || 'N/A'}`);
            console.log(`   Instagram: ${business['Instagram'] || 'N/A'}`);
            console.log(`   Facebook: ${business['Facebook'] || 'N/A'}`);
          });
        }
        
        completed = true;
      } else if (job.status === 'failed') {
        console.log(`❌ Job failed: ${job.error}`);
        completed = true;
      }
    }
    
  } catch (error) {
    console.error(`Error testing ${stealthLevel} mode:`, error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Testing Google Maps Scraper API with Stealth Levels...');
  console.log('Make sure the server is running with: npm start\n');
  
  // Test optimized mode (faster)
  await testAPIWithStealthLevel('optimized', 'restaurants', 'New York', 3);
  
  // Test high-stealth mode (slower but more anti-detection)
  await testAPIWithStealthLevel('high-stealth', 'coffee shops', 'Los Angeles', 2);
  
  console.log('\n=== API Test Complete ===');
  console.log('💡 Tips:');
  console.log('- Use "optimized" for faster scraping (default)');
  console.log('- Use "high-stealth" for maximum anti-detection');
  console.log('- Check combined_results.csv for full results');
}

if (require.main === module) {
  main().catch(console.error);
} 