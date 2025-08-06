const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const config = require('./config');
const CombinedGoogleMapsScraper = require('./combined-scraper');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: true, // Allow all origins in production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(helmet());
app.use(compression());

// Serve static files from public directory
app.use(express.static('public'));

// In-memory job store for demonstration
const jobs = {};
let jobCounter = 1;

// API key middleware - only apply if API_KEY is set
function apiKeyMiddleware(req, res, next) {
  if (config.apiKey && req.headers['x-api-key'] !== config.apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// Only apply API key middleware if API_KEY is configured
if (config.apiKey) {
  app.use('/api', apiKeyMiddleware);
}

// GET /api/docs - API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Google Maps Scraper API Documentation',
    version: '1.0.0',
    baseUrl: '/api',
    endpoints: {
      'POST /scrape': {
        description: 'Start a new scraping job',
        parameters: {
          searchTerm: { type: 'string', required: true, description: 'Search term (e.g., "restaurants", "coffee shops")' },
          location: { type: 'string', required: true, description: 'Location to search in (e.g., "New York", "Los Angeles")' },
          maxResults: { type: 'number', required: false, default: 100, description: 'Maximum number of results to scrape' },
          batchSize: { type: 'number', required: false, default: 3, description: 'Number of results to process in each batch' },
          stealthLevel: { type: 'string', required: false, default: 'optimized', enum: ['optimized', 'high-stealth'], description: 'Stealth level for anti-detection' },
          proxy: { type: 'string|object', required: false, description: 'Proxy configuration (string or object with proxy property)' }
        },
        response: {
          jobId: { type: 'number', description: 'Unique job identifier' }
        },
        example: {
          request: {
            searchTerm: 'restaurants',
            location: 'New York',
            maxResults: 50,
            batchSize: 3,
            stealthLevel: 'optimized',
            proxy: 'http://username:password@proxy.example.com:8080'
          },
          response: {
            jobId: 123
          }
        },
                  curl: {
            basic: 'curl -X POST http://localhost:3000/api/scrape \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "searchTerm": "restaurants",\n    "location": "New York",\n    "maxResults": 50,\n    "batchSize": 3,\n    "stealthLevel": "optimized"\n  }\'',
            withProxy: 'curl -X POST http://localhost:3000/api/scrape \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "searchTerm": "coffee shops",\n    "location": "Los Angeles",\n    "maxResults": 25,\n    "proxy": "http://username:password@proxy.example.com:8080"\n  }\'',
            withApiKey: 'curl -X POST http://localhost:3000/api/scrape \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: your-api-key-here" \\\n  -d \'{\n    "searchTerm": "restaurants",\n    "location": "Chicago"\n  }\''
          }
      },
      'POST /scrape/bulk': {
        description: 'Start multiple scraping jobs',
        parameters: {
          jobs: { type: 'array', required: true, description: 'Array of job configurations' }
        },
        response: {
          jobIds: { type: 'array', description: 'Array of job identifiers' }
        },
        curl: {
          basic: 'curl -X POST http://localhost:3000/api/scrape/bulk \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "jobs": [\n      {\n        "searchTerm": "restaurants",\n        "location": "New York",\n        "maxResults": 20\n      },\n      {\n        "searchTerm": "coffee shops",\n        "location": "Los Angeles",\n        "maxResults": 15\n      }\n    ]\n  }\''
        }
      },
      'GET /jobs': {
        description: 'List all jobs',
        response: {
          type: 'array',
          items: {
            id: { type: 'number' },
            status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed'] },
            progress: { type: 'number' },
            results: { type: 'array' },
            error: { type: 'string' },
            createdAt: { type: 'string' },
            searchTerm: { type: 'string' },
            location: { type: 'string' },
            maxResults: { type: 'number' },
            batchSize: { type: 'number' },
            stealthLevel: { type: 'string' },
            proxy: { type: 'object' }
          }
        },
        curl: {
          basic: 'curl -X GET http://localhost:3000/api/jobs',
          withApiKey: 'curl -X GET http://localhost:3000/api/jobs \\\n  -H "x-api-key: your-api-key-here"'
        }
      },
      'GET /jobs/:id': {
        description: 'Get job status and details',
        parameters: {
          id: { type: 'number', required: true, description: 'Job identifier' }
        },
        curl: {
          basic: 'curl -X GET http://localhost:3000/api/jobs/123',
          withApiKey: 'curl -X GET http://localhost:3000/api/jobs/123 \\\n  -H "x-api-key: your-api-key-here"'
        }
      },
      'GET /jobs/:id/results': {
        description: 'Get job results (returns processing status if job is still running)',
        parameters: {
          id: { type: 'number', required: true, description: 'Job identifier' }
        },
        response: {
          processing: {
            jobId: { type: 'number', description: 'Job identifier' },
            status: { type: 'string', value: 'processing' },
            message: { type: 'string', description: 'Status message with progress' },
            progress: { type: 'number', description: 'Progress percentage (0-100)' },
            jobStatus: { type: 'string', enum: ['queued', 'running'] },
            estimatedTimeRemaining: { type: 'string', description: 'Estimated time remaining' }
          },
          completed: {
            jobId: { type: 'number', description: 'Job identifier' },
            status: { type: 'string', value: 'completed' },
            results: { type: 'array', description: 'Array of business data' },
            totalResults: { type: 'number', description: 'Total number of results' },
            completedAt: { type: 'string', description: 'ISO timestamp when job completed' }
          },
          failed: {
            jobId: { type: 'number', description: 'Job identifier' },
            status: { type: 'string', value: 'failed' },
            error: { type: 'string', description: 'Error message' },
            message: { type: 'string', description: 'Failure description' }
          }
        },
        curl: {
          basic: 'curl -X GET http://localhost:3000/api/jobs/123/results',
          withApiKey: 'curl -X GET http://localhost:3000/api/jobs/123/results \\\n  -H "x-api-key: your-api-key-here"'
        }
      },
      'DELETE /jobs/:id': {
        description: 'Delete a job',
        parameters: {
          id: { type: 'number', required: true, description: 'Job identifier' }
        },
        curl: {
          basic: 'curl -X DELETE http://localhost:3000/api/jobs/123',
          withApiKey: 'curl -X DELETE http://localhost:3000/api/jobs/123 \\\n  -H "x-api-key: your-api-key-here"'
        }
      },
      'GET /settings': {
        description: 'Get current settings',
        curl: {
          basic: 'curl -X GET http://localhost:3000/api/settings',
          withApiKey: 'curl -X GET http://localhost:3000/api/settings \\\n  -H "x-api-key: your-api-key-here"'
        }
      },
      'POST /settings': {
        description: 'Update settings',
        curl: {
          basic: 'curl -X POST http://localhost:3000/api/settings \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "useProxy": true,\n    "proxyList": ["http://proxy1:8080", "http://proxy2:8080"],\n    "requestsPerMinute": 60\n  }\'',
          withApiKey: 'curl -X POST http://localhost:3000/api/settings \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: your-api-key-here" \\\n  -d \'{\n    "useProxy": true,\n    "proxyList": ["http://proxy1:8080"]\n  }\''
        }
      }
    },
    authentication: {
      type: 'API Key',
      header: 'x-api-key',
      description: 'Set API_KEY environment variable to enable authentication'
    },
    proxySupport: {
      description: 'Proxy support for enhanced privacy and IP rotation',
      formats: [
        'http://username:password@proxy.example.com:8080',
        'socks5://username:password@proxy.example.com:1080',
        { proxy: 'http://proxy.example.com:8080', username: 'user', password: 'pass' }
      ]
    },
    examples: {
      quickStart: 'curl -X POST http://localhost:3000/api/scrape \\\n  -H "Content-Type: application/json" \\\n  -d \'{"searchTerm": "coffee shops", "location": "New York", "maxResults": 10}\'',
      monitorJob: 'curl -X GET http://localhost:3000/api/jobs/123',
      downloadResults: 'curl -X GET http://localhost:3000/api/jobs/123/download/csv -o results.csv'
    }
  });
});

// GET /api/settings - Get current settings
app.get('/api/settings', (req, res) => {
  res.json({
    useProxy: config.useProxy,
    proxyList: config.proxyList,
    requestsPerMinute: config.requestsPerMinute,
    delayBetweenRequests: config.delayBetweenRequests,
    maxConcurrentJobs: config.maxConcurrentJobs,
    browser: config.browser,
    headless: config.headless
  });
});

// POST /api/settings - Update settings
app.post('/api/settings', (req, res) => {
  const { useProxy, proxyList, requestsPerMinute, delayBetweenRequests, maxConcurrentJobs } = req.body;
  
  // Update config (in-memory only for this demo)
  if (typeof useProxy === 'boolean') config.useProxy = useProxy;
  if (Array.isArray(proxyList)) config.proxyList = proxyList;
  if (typeof requestsPerMinute === 'number') config.requestsPerMinute = requestsPerMinute;
  if (typeof delayBetweenRequests === 'number') config.delayBetweenRequests = delayBetweenRequests;
  if (typeof maxConcurrentJobs === 'number') config.maxConcurrentJobs = maxConcurrentJobs;
  
  res.json({ success: true, settings: {
    useProxy: config.useProxy,
    proxyList: config.proxyList,
    requestsPerMinute: config.requestsPerMinute,
    delayBetweenRequests: config.delayBetweenRequests,
    maxConcurrentJobs: config.maxConcurrentJobs
  }});
});

// POST /api/scrape - Start new scraping job
app.post('/api/scrape', async (req, res) => {
  const { searchTerm, location, maxResults, batchSize, stealthLevel, proxy } = req.body;
  if (!searchTerm || !location) {
    return res.status(400).json({ error: 'searchTerm and location are required' });
  }
  
  // Validate stealth level
  const validStealthLevels = ['optimized', 'high-stealth'];
  const finalStealthLevel = validStealthLevels.includes(stealthLevel) ? stealthLevel : 'optimized';
  
  // Validate proxy configuration
  let proxyConfig = null;
  if (proxy) {
    if (typeof proxy === 'string') {
      // Single proxy string
      proxyConfig = { proxy };
    } else if (typeof proxy === 'object' && proxy.proxy) {
      // Proxy object with additional options
      proxyConfig = proxy;
    } else {
      return res.status(400).json({ error: 'Invalid proxy configuration' });
    }
  }
  
  const jobId = jobCounter++;
  jobs[jobId] = {
    id: jobId,
    status: 'queued',
    progress: 0,
    results: [],
    error: null,
    createdAt: new Date(),
    searchTerm,
    location,
    maxResults: maxResults || 100,
    batchSize: batchSize || 3,
    stealthLevel: finalStealthLevel,
    proxy: proxyConfig
  };
  
  // Start scraping asynchronously
  (async () => {
    jobs[jobId].status = 'running';
    const scraper = new CombinedGoogleMapsScraper({ 
      batchSize: batchSize || 3,
      stealthLevel: finalStealthLevel,
      proxy: proxyConfig
    });
    try {
      await scraper.init();
      await scraper.scrapeAndEnrich(searchTerm, location, maxResults || 100, (progress, partialResults) => {
        jobs[jobId].progress = progress;
        if (partialResults) jobs[jobId].results = partialResults;
      });
      jobs[jobId].status = 'completed';
      jobs[jobId].progress = 100;
      jobs[jobId].completedAt = new Date().toISOString();
      // jobs[jobId].results = ... already set by progressCb
    } catch (err) {
      jobs[jobId].status = 'failed';
      jobs[jobId].error = err.message || 'Scraping failed';
      jobs[jobId].failedAt = new Date().toISOString();
    } finally {
      await scraper.close();
    }
  })();
  res.json({ jobId });
});

// POST /api/scrape/bulk - Bulk scraping
app.post('/api/scrape/bulk', async (req, res) => {
  const { jobs: jobList } = req.body;
  if (!Array.isArray(jobList) || jobList.length === 0) {
    return res.status(400).json({ error: 'jobs array required' });
  }
  const ids = jobList.map(job => {
    const jobId = jobCounter++;
    
    // Validate stealth level for each job
    const validStealthLevels = ['optimized', 'high-stealth'];
    const finalStealthLevel = validStealthLevels.includes(job.stealthLevel) ? job.stealthLevel : 'optimized';
    
    // Validate proxy configuration for each job
    let proxyConfig = null;
    if (job.proxy) {
      if (typeof job.proxy === 'string') {
        proxyConfig = { proxy: job.proxy };
      } else if (typeof job.proxy === 'object' && job.proxy.proxy) {
        proxyConfig = job.proxy;
      }
    }
    
    jobs[jobId] = {
      id: jobId,
      status: 'queued',
      progress: 0,
      results: [],
      error: null,
      createdAt: new Date(),
      ...job,
      stealthLevel: finalStealthLevel,
      proxy: proxyConfig
    };
    
    // Start scraping asynchronously
    (async () => {
      jobs[jobId].status = 'running';
      const scraper = new CombinedGoogleMapsScraper({ 
        batchSize: job.batchSize || 3,
        stealthLevel: finalStealthLevel,
        proxy: proxyConfig
      });
      try {
        await scraper.init();
        await scraper.scrapeAndEnrich(job.searchTerm, job.location, job.maxResults || 100, (progress, partialResults) => {
          jobs[jobId].progress = progress;
          if (partialResults) jobs[jobId].results = partialResults;
        });
        jobs[jobId].status = 'completed';
        jobs[jobId].progress = 100;
        jobs[jobId].completedAt = new Date().toISOString();
      } catch (err) {
        jobs[jobId].status = 'failed';
        jobs[jobId].error = err.message || 'Scraping failed';
        jobs[jobId].failedAt = new Date().toISOString();
      } finally {
        await scraper.close();
      }
    })();
    return jobId;
  });
  res.json({ jobIds: ids });
});

// GET /api/jobs - List all jobs
app.get('/api/jobs', (req, res) => {
  res.json(Object.values(jobs));
});

// GET /api/jobs/:id - Get job status
app.get('/api/jobs/:id', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// GET /api/jobs/:id/results - Get job results
app.get('/api/jobs/:id/results', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  // Check job status
  if (job.status === 'queued' || job.status === 'running') {
    return res.json({
      jobId: job.id,
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
      jobId: job.id,
      status: 'completed',
      results: job.results,
      totalResults: job.results.length,
      completedAt: job.completedAt || new Date().toISOString()
    });
  }
  
  // Job failed
  if (job.status === 'failed') {
    return res.status(500).json({
      jobId: job.id,
      status: 'failed',
      error: job.error,
      message: 'Job failed during processing'
    });
  }
  
  // Fallback
  res.json(job.results);
});

// DELETE /api/jobs/:id - Delete job
app.delete('/api/jobs/:id', (req, res) => {
  if (!jobs[req.params.id]) return res.status(404).json({ error: 'Job not found' });
  delete jobs[req.params.id];
  res.json({ success: true });
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Health check
app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  port: PORT,
  apiKeyRequired: !!config.apiKey
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard available at: http://localhost:${PORT}`);
}); 