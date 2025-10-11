const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class NgrokMonitor {
  constructor() {
    this.ngrokApiUrl = 'http://localhost:4040/api/tunnels';
    this.currentUrl = null;
    this.checkInterval = 30000; // Check every 30 seconds
    this.intervalId = null;
    this.logFile = path.join(__dirname, '../../logs/ngrok-changes.log');
  }

  /**
   * Get current ngrok URL
   */
  async getCurrentNgrokUrl() {
    try {
      const response = await axios.get(this.ngrokApiUrl, { timeout: 5000 });
      const tunnels = response.data.tunnels || [];
      const httpsTunnel = tunnels.find(t => t.proto === 'https');
      
      return httpsTunnel ? httpsTunnel.public_url : null;
    } catch (error) {
      // Ngrok might not be running - this is expected sometimes
      return null;
    }
  }

  /**
   * Log URL change
   */
  logUrlChange(oldUrl, newUrl) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Ngrok URL changed: ${oldUrl || 'none'} → ${newUrl}\n`;
    
    try {
      const logsDir = path.dirname(this.logFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  /**
   * Update docker-compose.yml
   */
  async updateDockerCompose(newUrl) {
    try {
      const composePath = path.join(__dirname, '../../docker-compose.yml');
      const callbackUrl = `${newUrl}/api/payhero/callback`;
      
      let composeContent = fs.readFileSync(composePath, 'utf8');
      
      // Update PAYHERO_CALLBACK_URL
      const regex = /PAYHERO_CALLBACK_URL:\s*https?:\/\/[^\s]+/;
      composeContent = composeContent.replace(regex, `PAYHERO_CALLBACK_URL: ${callbackUrl}`);
      
      // Create backup
      fs.writeFileSync(composePath + '.backup', composeContent, 'utf8');
      fs.writeFileSync(composePath, composeContent, 'utf8');
      
      console.log('✅ Updated docker-compose.yml with new callback URL');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to update docker-compose.yml:', error.message);
      return false;
    }
  }

  /**
   * Restart server container
   */
  async restartServer() {
    try {
      console.log('🔄 Restarting server container...');
      const { stdout, stderr } = await execPromise('docker compose restart server');
      
      if (stderr && !stderr.includes('warning')) {
        console.error('Server restart stderr:', stderr);
      }
      
      console.log('✅ Server restarted with new callback URL');
      return true;
    } catch (error) {
      console.error('❌ Failed to restart server:', error.message);
      return false;
    }
  }

  /**
   * Send notification about URL change
   */
  async sendNotification(oldUrl, newUrl) {
    const callbackUrl = `${newUrl}/api/payhero/callback`;
    
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║          ⚠️  NGROK URL CHANGED - ACTION REQUIRED! ⚠️         ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Old URL:', oldUrl || 'none');
    console.log('New URL:', newUrl);
    console.log('New Callback:', callbackUrl);
    console.log('');
    console.log('✅ Server auto-updated with new URL');
    console.log('');
    console.log('⚠️  MANUAL ACTION REQUIRED:');
    console.log('   Update PayHero Dashboard with:');
    console.log(`   ${callbackUrl}`);
    console.log('');
    console.log('   1. Login: https://payhero.co.ke/');
    console.log('   2. Go to: Settings → Webhooks');
    console.log('   3. Update callback URL');
    console.log('   4. Save changes');
    console.log('');
    
    // Log to file
    this.logUrlChange(oldUrl, newUrl);
  }

  /**
   * Check for URL changes and auto-update
   */
  async checkAndUpdate() {
    try {
      const currentUrl = await this.getCurrentNgrokUrl();
      
      if (!currentUrl) {
        // Ngrok not running - silent (expected during downtime)
        return;
      }

      // First run - store initial URL
      if (!this.currentUrl) {
        this.currentUrl = currentUrl;
        console.log('📡 Ngrok monitor initialized:', currentUrl);
        this.logUrlChange(null, currentUrl);
        return;
      }

      // Check if URL changed
      if (currentUrl !== this.currentUrl) {
        console.log('');
        console.log('🚨 NGROK URL CHANGE DETECTED!');
        
        const oldUrl = this.currentUrl;
        const newUrl = currentUrl;
        
        // Update docker-compose.yml
        const updated = await this.updateDockerCompose(newUrl);
        
        if (updated) {
          // Restart server
          await this.restartServer();
          
          // Send notification
          await this.sendNotification(oldUrl, newUrl);
          
          // Update current URL
          this.currentUrl = newUrl;
        }
      }
      
    } catch (error) {
      console.error('❌ Error in ngrok monitor:', error.message);
    }
  }

  /**
   * Start monitoring
   */
  start() {
    console.log('🔍 Starting ngrok URL monitor...');
    console.log(`   Checking every ${this.checkInterval / 1000} seconds`);
    console.log(`   Logs: ${this.logFile}`);
    console.log('');
    
    // Initial check
    this.checkAndUpdate();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkAndUpdate();
    }, this.checkInterval);

    console.log('✅ Monitor active');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('✅ Ngrok monitor stopped');
    }
  }
}

module.exports = new NgrokMonitor();

