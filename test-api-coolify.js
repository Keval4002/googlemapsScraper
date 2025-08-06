const axios = require('axios');

// Configuration - update these for your Coolify deployment
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || null;

console.log('Testing API endpoints for Coolify deployment...');
console.log('Base URL:', BASE_URL);
console.log('API Key configured:', !!API_KEY);

const headers = {
  'Content-Type': 'application/json'
};

if (API_KEY) {
  headers['x-api-key'] = API_KEY;
}

async function testEndpoints() {
  try {
    // Test 1: Health check (no auth required)
    console.log('\n1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test 2: API docs (may require auth)
    console.log('\n2. Testing API docs...');
    try {
      const docsResponse = await axios.get(`${BASE_URL}/api/docs`, { headers });
      console.log('✅ API docs accessible');
    } catch (error) {
      console.log('❌ API docs failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 3: Settings endpoint
    console.log('\n3. Testing settings endpoint...');
    try {
      const settingsResponse = await axios.get(`${BASE_URL}/api/settings`, { headers });
      console.log('✅ Settings accessible:', settingsResponse.data);
    } catch (error) {
      console.log('❌ Settings failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 4: Jobs endpoint
    console.log('\n4. Testing jobs endpoint...');
    try {
      const jobsResponse = await axios.get(`${BASE_URL}/api/jobs`, { headers });
      console.log('✅ Jobs endpoint accessible, found', jobsResponse.data.length, 'jobs');
    } catch (error) {
      console.log('❌ Jobs failed:', error.response?.status, error.response?.data?.error);
    }

    // Test 5: Scrape endpoint (with minimal data)
    console.log('\n5. Testing scrape endpoint...');
    try {
      const scrapeData = {
        searchTerm: 'test',
        location: 'test',
        maxResults: 1
      };
      const scrapeResponse = await axios.post(`${BASE_URL}/api/scrape`, scrapeData, { headers });
      console.log('✅ Scrape endpoint accessible, job ID:', scrapeResponse.data.jobId);
    } catch (error) {
      console.log('❌ Scrape failed:', error.response?.status, error.response?.data?.error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testEndpoints(); 