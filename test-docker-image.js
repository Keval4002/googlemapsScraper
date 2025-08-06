const { chromium } = require('playwright');

async function testPlaywrightVersion() {
  console.log('🧪 Testing Playwright version compatibility...\n');
  
  try {
    // Test browser launch
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Browser launched successfully');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('✅ Page created successfully');
    
    // Test navigation
    await page.goto('https://example.com');
    const title = await page.title();
    console.log(`✅ Navigation successful. Page title: ${title}`);
    
    await browser.close();
    console.log('✅ Browser closed successfully');
    console.log('🎉 Playwright v1.54.0 test completed successfully!');
    console.log('📦 Docker image mcr.microsoft.com/playwright:v1.54.0-noble should work correctly');
    
  } catch (error) {
    console.error('❌ Playwright test failed:', error.message);
    process.exit(1);
  }
}

testPlaywrightVersion(); 