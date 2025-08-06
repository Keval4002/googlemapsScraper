const GoogleMapsMonitor = require('./monitor-and-fix');

async function runMonitor() {
  console.log('🚀 Starting Google Maps Adaptive Monitoring System');
  
  const monitor = new GoogleMapsMonitor({
    checkInterval: 300000, // Check every 5 minutes
    maxFailures: 2, // Alert after 2 consecutive failures
    backupSelectors: true,
    logChanges: true
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    monitor.stopMonitoring();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    monitor.stopMonitoring();
    process.exit(0);
  });

  try {
    await monitor.startMonitoring();
  } catch (error) {
    console.error('❌ Monitor error:', error);
    process.exit(1);
  }
}

// Run the monitor
runMonitor().catch(console.error); 