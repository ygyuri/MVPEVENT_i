#!/usr/bin/env node

/**
 * Ngrok URL Monitor
 * Automatically detects ngrok URL changes and updates server configuration
 * Run with: node monitor-ngrok.js
 */

const ngrokMonitor = require('./server/services/ngrokMonitor');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║              🔍 NGROK URL MONITOR SERVICE 🔍                 ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('This service monitors ngrok for URL changes and automatically');
console.log('updates your server configuration.');
console.log('');
console.log('Features:');
console.log('  ✅ Auto-detects ngrok URL changes');
console.log('  ✅ Auto-updates docker-compose.yml');
console.log('  ✅ Auto-restarts server container');
console.log('  ✅ Logs all changes');
console.log('  ⚠️  Alerts you to update PayHero dashboard');
console.log('');
console.log('Press Ctrl+C to stop.');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Start monitoring
ngrokMonitor.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Shutting down ngrok monitor...');
  ngrokMonitor.stop();
  console.log('✅ Monitor stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('🛑 Received SIGTERM, shutting down...');
  ngrokMonitor.stop();
  process.exit(0);
});

// Keep process alive
process.stdin.resume();

