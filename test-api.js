const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testOptimizedMode() {
  console.log('\n=== Testing OPTIMIZED Mode via API ===');
  
  try {
    const response = await axios.post(`${API_BASE}/scrape`, {
      searchTerm: 'restaurants',
      location: 'New York',
      maxResults: 5,
      batchSize: 3,
      stealthLevel: 'optimized'
    });
    
    const jobId = response.data.jobId;
    console.log(`Job started with ID: ${jobId}`);
    
    // Poll for completion
    let completed = false;
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(`${API_BASE}/jobs/${jobId}`);
      const job = statusResponse.data;
      
      console.log(`Status: ${job.status}, Progress: ${job.progress}%`);
      
      if (job.status === 'completed') {
        console.log(`✅ Optimized mode completed! Found ${job.results.length} businesses`);
        completed = true;
      } else if (job.status === 'failed') {
        console.log(`❌ Job failed: ${job.error}`);
        completed = true;
      }
    }
    
  } catch (error) {
    console.error('Error testing optimized mode:', error.response?.data || error.message);
  }
}

async function testHighStealthMode() {
  console.log('\n=== Testing HIGH-STEALTH Mode via API ===');
  
  try {
    const response = await axios.post(`${API_BASE}/scrape`, {
      searchTerm: 'coffee shops',
      location: 'Los Angeles',
      maxResults: 3,
      batchSize: 2,
      stealthLevel: 'high-stealth'
    });
    
    const jobId = response.data.jobId;
    console.log(`Job started with ID: ${jobId}`);
    
    // Poll for completion
    let completed = false;
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await axios.get(`${API_BASE}/jobs/${jobId}`);
      const job = statusResponse.data;
      
      console.log(`Status: ${job.status}, Progress: ${job.progress}%`);
      
      if (job.status === 'completed') {
        console.log(`✅ High-stealth mode completed! Found ${job.results.length} businesses`);
        completed = true;
      } else if (job.status === 'failed') {
        console.log(`❌ Job failed: ${job.error}`);
        completed = true;
      }
    }
    
  } catch (error) {
    console.error('Error testing high-stealth mode:', error.response?.data || error.message);
  }
}

async function listJobs() {
  console.log('\n=== Listing All Jobs ===');
  try {
    const response = await axios.get(`${API_BASE}/jobs`);
    const jobs = response.data;
    
    if (jobs.length === 0) {
      console.log('No jobs found');
      return;
    }
    
    jobs.forEach(job => {
      console.log(`Job ${job.id}: ${job.status} - ${job.searchTerm} in ${job.location} (${job.stealthLevel})`);
    });
    
  } catch (error) {
    console.error('Error listing jobs:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('Testing Google Maps Scraper API with different stealth levels...');
  
  // Test optimized mode
  await testOptimizedMode();
  
  // Test high-stealth mode
  await testHighStealthMode();
  
  // List all jobs
  await listJobs();
  
  console.log('\n=== API Test Complete ===');
  console.log('Check the server logs for detailed progress information');
}

if (require.main === module) {
  main().catch(console.error);
} 