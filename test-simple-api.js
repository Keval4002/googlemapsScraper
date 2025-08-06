const express = require('express');
const app = express();

// Mock job data for testing
const jobs = {
  1: {
    id: 1,
    status: 'queued',
    progress: 0,
    results: [],
    error: null,
    createdAt: new Date()
  },
  2: {
    id: 2,
    status: 'running',
    progress: 45,
    results: [],
    error: null,
    createdAt: new Date()
  },
  3: {
    id: 3,
    status: 'completed',
    progress: 100,
    results: [
      { 'Business Name': 'Test Business 1', 'Rating': '4.5', 'Address': '123 Test St' },
      { 'Business Name': 'Test Business 2', 'Rating': '4.2', 'Address': '456 Test Ave' }
    ],
    error: null,
    createdAt: new Date(),
    completedAt: new Date().toISOString()
  },
  4: {
    id: 4,
    status: 'failed',
    progress: 0,
    results: [],
    error: 'Test error message',
    createdAt: new Date(),
    failedAt: new Date().toISOString()
  }
};

// GET /api/jobs/:id/results - Get job results (updated version)
app.get('/api/jobs/:id/results', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  // Check job status
  if (job.status === 'queued' || job.status === 'running') {
    return res.json({
      status: 'processing',
      message: `Job is currently ${job.status}. Progress: ${job.progress}%`,
      progress: job.progress,
      jobStatus: job.status,
      estimatedTimeRemaining: job.status === 'running' ? 'Calculating...' : 'Pending...'
    });
  }
  
  // Job is completed or failed
  if (job.status === 'completed') {
    return res.json({
      status: 'completed',
      results: job.results,
      totalResults: job.results.length,
      completedAt: job.completedAt || new Date().toISOString()
    });
  }
  
  // Job failed
  if (job.status === 'failed') {
    return res.status(500).json({
      status: 'failed',
      error: job.error,
      message: 'Job failed during processing'
    });
  }
  
  // Fallback
  res.json(job.results);
});

// Test function
async function testAPI() {
  console.log('🧪 Testing Updated Job Results API...\n');
  
  const testCases = [
    { id: 1, expectedStatus: 'processing', description: 'Queued job' },
    { id: 2, expectedStatus: 'processing', description: 'Running job' },
    { id: 3, expectedStatus: 'completed', description: 'Completed job' },
    { id: 4, expectedStatus: 'failed', description: 'Failed job' },
    { id: 999, expectedStatus: 'not_found', description: 'Non-existent job' }
  ];
  
  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.description} (Job ID: ${testCase.id})`);
    
    try {
      const response = await fetch(`http://localhost:3001/api/jobs/${testCase.id}/results`);
      const data = await response.json();
      
      if (testCase.expectedStatus === 'not_found') {
        if (response.status === 404) {
          console.log('✅ Correctly returned 404 for non-existent job');
        } else {
          console.log('❌ Expected 404 but got:', response.status);
        }
      } else {
        if (data.status === testCase.expectedStatus) {
          console.log(`✅ Correct status: ${data.status}`);
          if (data.status === 'processing') {
            console.log(`   Progress: ${data.progress}%`);
            console.log(`   Message: ${data.message}`);
          } else if (data.status === 'completed') {
            console.log(`   Total Results: ${data.totalResults}`);
            console.log(`   Completed At: ${data.completedAt}`);
          } else if (data.status === 'failed') {
            console.log(`   Error: ${data.error}`);
          }
        } else {
          console.log(`❌ Expected status ${testCase.expectedStatus} but got ${data.status}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error testing job ${testCase.id}:`, error.message);
    }
    
    console.log('');
  }
}

// Start server on port 3001
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Waiting 2 seconds for server to start...\n');
  
  setTimeout(() => {
    testAPI().then(() => {
      console.log('🎉 API test completed!');
      process.exit(0);
    }).catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
  }, 2000);
}); 