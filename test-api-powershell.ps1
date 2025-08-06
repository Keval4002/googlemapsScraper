# PowerShell script to test the Google Maps Scraper API with stealth levels

Write-Host "🚀 Testing Google Maps Scraper API with Stealth Levels..." -ForegroundColor Green
Write-Host "Make sure the server is running with: npm start" -ForegroundColor Yellow
Write-Host ""

# Test Optimized Mode (Faster)
Write-Host "=== Testing OPTIMIZED Mode ===" -ForegroundColor Cyan
$optimizedBody = @{
    searchTerm = "restaurants"
    location = "New York"
    maxResults = 3
    batchSize = 3
    stealthLevel = "optimized"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/scrape" -Method POST -ContentType "application/json" -Body $optimizedBody
    Write-Host "✅ Optimized job started with ID: $($response.jobId)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error starting optimized job: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test High-Stealth Mode (Slower but more anti-detection)
Write-Host "=== Testing HIGH-STEALTH Mode ===" -ForegroundColor Cyan
$stealthBody = @{
    searchTerm = "coffee shops"
    location = "Los Angeles"
    maxResults = 2
    batchSize = 2
    stealthLevel = "high-stealth"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/scrape" -Method POST -ContentType "application/json" -Body $stealthBody
    Write-Host "✅ High-stealth job started with ID: $($response.jobId)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error starting high-stealth job: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== API Test Complete ===" -ForegroundColor Green
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "- Use 'optimized' for faster scraping (default)" -ForegroundColor White
Write-Host "- Use 'high-stealth' for maximum anti-detection" -ForegroundColor White
Write-Host "- Check combined_results.csv for full results" -ForegroundColor White
Write-Host ""
Write-Host "To check job status, visit: http://localhost:3000/api/jobs" -ForegroundColor Cyan 