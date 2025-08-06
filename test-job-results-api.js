const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testJobResultsAPI() {
  console.log('🧪 Testing Job Results API with Processing Status...\n');
  
  try {
    // Step 1: Start a new scraping job
    console.log('1️⃣ Starting a new scraping job...');
    const jobResponse = await axios.post(`${BASE_URL}/api/scrape`, {
      searchTerm: 'coffee shops',
      location: 'New York',
      maxResults: 5,
      batchSize: 2
    });
    
    const jobId = jobResponse.data.jobId;
    console.log(`✅ Job started with ID: ${jobId}\n`);
    
    // Step 2: Immediately check results (should show processing)
    console.log('2️⃣ Checking results immediately (should show processing)...');
    const immediateResults = await axios.get(`${BASE_URL}/api/jobs/${jobId}/results`);
    console.log('📊 Immediate Results Response:');
    console.log(JSON.stringify(immediateResults.data, null, 2));
    console.log('');
    
    // Step 3: Wait a bit and check again
    console.log('3️⃣ Waiting 3 seconds and checking again...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const progressResults = await axios.get(`${BASE_URL}/api/jobs/${jobId}/results`);
    console.log('📊 Progress Results Response:');
    console.log(JSON.stringify(progressResults.data, null, 2));
    console.log('');
    
    // Step 4: Wait for completion
    console.log('4️⃣ Waiting for job completion...');
    let finalResults;
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 5 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
      
      try {
        finalResults = await axios.get(`${BASE_URL}/api/jobs/${jobId}/results`);
        console.log(`📊 Attempt ${attempts}: Status = ${finalResults.data.status}`);
        
        if (finalResults.data.status === 'completed') {
          console.log('✅ Job completed!');
          break;
        } else if (finalResults.data.status === 'failed') {
          console.log('❌ Job failed!');
          break;
        }
      } catch (error) {
        console.log(`⚠️ Attempt ${attempts}: Error checking results`);
      }
    }
    
    // Step 5: Show final results
    if (finalResults) {
      console.log('\n📊 Final Results Response:');
      console.log(JSON.stringify(finalResults.data, null, 2));
      
      if (finalResults.data.status === 'completed') {
        console.log(`\n🎉 Success! Found ${finalResults.data.totalResults} businesses`);
        console.log(`⏱️ Completed at: ${finalResults.data.completedAt}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testJobResultsAPI(); 