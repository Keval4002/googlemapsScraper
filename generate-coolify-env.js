#!/usr/bin/env node

/**
 * Generate environment variables for Coolify deployment
 * This script creates a .env file with default values that Coolify can use
 */

const fs = require('fs');
const crypto = require('crypto');

// Default environment variables
const defaultEnv = {
  // Server Configuration
  NODE_ENV: 'production',
  PORT: '3000',
  API_KEY: '', // Leave empty to disable API authentication
  
  // Scraping Configuration
  MAX_RESULTS: '100',
  BATCH_SIZE: '3',
  STEALTH_LEVEL: 'optimized',
  
  // Rate Limiting & Performance
  REQUESTS_PER_MINUTE: '60',
  DELAY_BETWEEN_REQUESTS: '1000',
  MAX_CONCURRENT_JOBS: '2',
  
  // Proxy Configuration
  USE_PROXY: 'false',
  PROXY_LIST: '',
  
  // Browser Configuration
  BROWSER: 'chromium',
  HEADLESS: 'true',
  
  // CAPTCHA Solving (Optional)
  CAPTCHA_API_KEY: '',
  CAPTCHA_SERVICE: '',
  
  // Database & Storage
  DB_PATH: './data/scraper.db',
  
  // Email Notifications (Optional)
  EMAIL_ENABLED: 'false',
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: '587',
  EMAIL_USER: '',
  EMAIL_PASS: '',
  EMAIL_FROM: '',
  EMAIL_TO: '',
  
  // Logging & Debugging
  LOG_LEVEL: 'info',
  DEBUG: 'false',
  
  // Security & Privacy
  TRUST_PROXY: 'false',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex')
};

function generateEnvFile() {
  console.log('🔧 Generating environment variables for Coolify...\n');
  
  let envContent = `# =============================================================================
# Google Maps Scraper - Environment Variables for Coolify
# =============================================================================
# Generated on: ${new Date().toISOString()}
# Copy these values to your Coolify environment variables section
# =============================================================================

`;
  
  // Add each environment variable with comments
  Object.entries(defaultEnv).forEach(([key, value]) => {
    const comment = getComment(key);
    envContent += `# ${comment}\n`;
    envContent += `${key}=${value}\n\n`;
  });
  
  // Write to file
  fs.writeFileSync('.env.coolify', envContent);
  
  console.log('✅ Generated .env.coolify file');
  console.log('📋 Copy the contents to your Coolify environment variables:');
  console.log('');
  
  // Display the content for easy copying
  console.log(envContent);
  
  console.log('🚀 Next steps:');
  console.log('1. Copy the above variables to your Coolify deployment');
  console.log('2. Update any values as needed (especially API_KEY if you want authentication)');
  console.log('3. Deploy your application');
}

function getComment(key) {
  const comments = {
    NODE_ENV: 'Node.js environment',
    PORT: 'Server port (Coolify will override this automatically)',
    API_KEY: 'API authentication key (optional - leave empty to disable)',
    MAX_RESULTS: 'Maximum number of results to scrape per job',
    BATCH_SIZE: 'Number of results to process in each batch (1-5 recommended)',
    STEALTH_LEVEL: 'Stealth level: optimized (faster) or high-stealth (more anti-detection)',
    REQUESTS_PER_MINUTE: 'Maximum requests per minute',
    DELAY_BETWEEN_REQUESTS: 'Delay between requests in milliseconds',
    MAX_CONCURRENT_JOBS: 'Maximum concurrent scraping jobs',
    USE_PROXY: 'Enable proxy usage (true/false)',
    PROXY_LIST: 'Comma-separated list of proxy URLs',
    BROWSER: 'Browser to use: chromium, firefox, webkit',
    HEADLESS: 'Run browser in headless mode (always true for production)',
    CAPTCHA_API_KEY: 'CAPTCHA solving service API key (optional)',
    CAPTCHA_SERVICE: 'CAPTCHA service: 2captcha, anticaptcha, capmonster',
    DB_PATH: 'SQLite database path',
    EMAIL_ENABLED: 'Enable email notifications',
    EMAIL_HOST: 'SMTP server host',
    EMAIL_PORT: 'SMTP server port',
    EMAIL_USER: 'SMTP username',
    EMAIL_PASS: 'SMTP password',
    EMAIL_FROM: 'From email address',
    EMAIL_TO: 'To email address',
    LOG_LEVEL: 'Log level: error, warn, info, debug',
    DEBUG: 'Enable detailed logging for debugging',
    TRUST_PROXY: 'Trust proxy headers (set to true if behind reverse proxy)',
    SESSION_SECRET: 'Session secret for secure cookies (auto-generated)'
  };
  
  return comments[key] || key;
}

function generateCoolifyYaml() {
  console.log('\n📄 Generating Coolify YAML configuration...\n');
  
  const yamlContent = `# Coolify Application Configuration
# Save this as coolify.yaml in your repository root

name: google-maps-scraper
description: Apollo-style Google Maps business scraper with Playwright automation
type: application
buildPack: nodejs
port: 3000

environmentVariables:
  NODE_ENV: production
  PORT: 3000
  API_KEY: ""  # Optional: Set this for API authentication
  MAX_RESULTS: 100
  BATCH_SIZE: 3
  STEALTH_LEVEL: optimized
  REQUESTS_PER_MINUTE: 60
  DELAY_BETWEEN_REQUESTS: 1000
  MAX_CONCURRENT_JOBS: 2
  USE_PROXY: false
  PROXY_LIST: ""
  BROWSER: chromium
  HEADLESS: true
  CAPTCHA_API_KEY: ""
  CAPTCHA_SERVICE: ""
  DB_PATH: ./data/scraper.db
  EMAIL_ENABLED: false
  EMAIL_HOST: smtp.gmail.com
  EMAIL_PORT: 587
  EMAIL_USER: ""
  EMAIL_PASS: ""
  EMAIL_FROM: ""
  EMAIL_TO: ""
  LOG_LEVEL: info
  DEBUG: false
  TRUST_PROXY: false
  SESSION_SECRET: "${crypto.randomBytes(32).toString('hex')}"

volumes:
  - hostPath: /app/data
    containerPath: /app/data
    description: Data directory for database and CSV files

healthCheck:
  path: /health
  interval: 30
  timeout: 10
  retries: 3

buildCommand: npm install && npx playwright install chromium
startCommand: node server.js
dockerfile: Dockerfile
dockerCompose: docker-compose.yml
`;
  
  fs.writeFileSync('coolify.yaml', yamlContent);
  console.log('✅ Generated coolify.yaml file');
  console.log('📋 You can use this file for Coolify configuration');
}

// Run the generator
if (require.main === module) {
  generateEnvFile();
  generateCoolifyYaml();
  
  console.log('\n🎉 Environment generation complete!');
  console.log('\n📚 Files created:');
  console.log('  - .env.coolify (environment variables)');
  console.log('  - coolify.yaml (Coolify configuration)');
  console.log('\n💡 Tips:');
  console.log('  - Set API_KEY if you want to require authentication');
  console.log('  - Configure PROXY_LIST if you want to use proxies');
  console.log('  - Set up email variables if you want notifications');
  console.log('  - Adjust rate limiting based on your needs');
}

module.exports = { generateEnvFile, generateCoolifyYaml }; 