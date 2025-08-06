# Google Maps Scraper (Apollo-Style)

A production-ready, Playwright-powered Google Maps business scraper with Apollo-style dashboard, advanced enrichment, and Docker support.

## Features
- 🎯 Apollo-style web dashboard for lead generation
- 🤖 Playwright automation for Google Maps
- 🔍 Data enrichment (social, tech, company size, sentiment)
- 🛡️ Anti-detection & proxy rotation
- 📊 Real-time job management
- 📤 Export CSV/JSON
- 🐳 Docker-ready
- 🔄 **Automatic format detection & adaptation**
- 📈 **Continuous format monitoring & alerts**

## Quick Start

```bash
git clone <repo-url>
cd google-maps-scraper
cp .env.example .env
npm install
npm start
```

Or with Docker:

```bash
docker-compose up --build
```

### Coolify Deployment

1. **Generate Environment Variables**:
   ```bash
   npm run generate-env
   ```

2. **Copy Environment Variables**: Copy the contents of `.env.coolify` to your Coolify environment variables section

3. **Deploy**: Use the generated `coolify.yaml` or configure manually:
   - **Port**: 3000
   - **Build Command**: `npm install && npx playwright install chromium`
   - **Start Command**: `node server.js`
   - **Health Check**: `/health`

4. **Test Deployment**:
   ```bash
   # Set your Coolify URL
   export BASE_URL="https://your-coolify-domain.com"
   npm run test-api
   ```

## Configuration

### Automatic Environment Variable Generation

For Coolify deployment, you can automatically generate all environment variables:

```bash
# Generate environment variables for Coolify
npm run generate-env

# This will create:
# - .env.coolify (copy these to Coolify environment variables)
# - coolify.yaml (Coolify configuration file)
```

### Manual Configuration
See `env.example` for all options: proxies, rate limits, CAPTCHA, DB, email, security, Playwright.

## Usage
### Combined Scraper (Recommended)
The combined scraper performs both URL discovery and detailed data extraction in one workflow:

```bash
# Run the combined scraper directly
node combined-scraper.js "restaurants" "New York" 10

# Or use the test script
node test-combined.js

# Or use the API server
npm start
```

### Individual Scripts
- `scraper.js` - Only scrapes URLs from Google Maps search
- `main.js` - Extracts detailed data from URLs in results.csv
- `combined-scraper.js` - Does both in one workflow

### API Endpoints
- Web dashboard: http://localhost:3000
- POST `/api/scrape` - Start new scraping job
- POST `/api/scrape/bulk` - Bulk scraping
- GET `/api/jobs` - List all jobs
- GET `/api/jobs/:id` - Get job status
- GET `/api/jobs/:id/results` - Get job results
- GET `/api/jobs/:id/download/csv` - Download CSV
- DELETE `/api/jobs/:id` - Delete job

### API Parameters
```json
{
  "searchTerm": "restaurants",
  "location": "New York",
  "maxResults": 100,
  "batchSize": 3,
  "stealthLevel": "optimized"
}
```

**Stealth Level Options:**
- `optimized`: Faster performance with basic anti-detection (default)
- `high-stealth`: Slower but maximum anti-detection with rotating contexts

**Batch Size Options:**
- `1-2`: Conservative (less server load)
- `3`: Balanced (recommended)
- `4-5`: Fast (higher server load)

**Performance Comparison:**
- **Optimized Mode**: ~3x faster, uses one context per batch
- **High-Stealth Mode**: Maximum anti-detection, uses one context per URL

## Ethical Use
- For research and lead generation only. Respect Google Maps TOS and robots.txt.

## Troubleshooting

### General Issues
- See Playwright docs for browser issues.
- Use proxies and delays to avoid bans.

### Format Change Protection

Your scraper includes automatic protection against Google Maps format changes:

1. **Format Detection**: Automatically detects current Google Maps layout
2. **Multiple Selectors**: Uses fallback selectors if primary ones fail
3. **Continuous Monitoring**: Monitors for format changes and alerts you
4. **Adaptive Extraction**: Automatically adapts to new layouts

**Test Format Detection**:
```bash
npm run test-format
```

**Monitor Format Changes**:
- Format history is saved to `./data/format-history.json`
- Monitor logs are saved to `./data/format-monitor.log`
- Alerts are triggered when format changes are detected

**What Happens When Google Maps Changes**:
- ✅ **Automatic Detection**: System detects the change within 24 hours
- ✅ **Fallback Selectors**: Uses alternative selectors to continue working
- ✅ **Alert System**: Notifies you immediately about the change
- ✅ **Format History**: Tracks all changes for analysis
- ✅ **Recommendations**: Provides guidance on required updates

### Coolify Deployment Issues

If you're experiencing API issues in Coolify while the webapp works:

1. **Check Port Configuration**: Ensure Coolify is configured to use port 3000
2. **Test API Health**: Run the test script to diagnose issues:
   ```bash
   # Set your Coolify URL
   export BASE_URL="https://your-coolify-domain.com"
   export API_KEY="your-api-key"  # if configured
   node test-api-coolify.js
   ```

3. **Common Issues**:
   - **Port Mismatch**: Server runs on port 3000, not 3001
   - **API Key**: If `API_KEY` env var is set, all API calls need `x-api-key` header
   - **CORS**: API now allows all origins for production deployment
   - **Health Check**: Visit `/health` endpoint to verify server status

4. **Environment Variables for Coolify**:
   ```bash
   PORT=3000                    # Server port
   API_KEY=your-secret-key      # Optional: API authentication
   USE_PROXY=false              # Proxy usage
   REQUESTS_PER_MINUTE=60       # Rate limiting
   MAX_CONCURRENT_JOBS=2        # Concurrent job limit
   ```

5. **Debug Steps**:
   - Check Coolify logs for errors
   - Verify environment variables are set
   - Test `/health` endpoint first
   - Use browser dev tools to check network requests

## License
MIT 