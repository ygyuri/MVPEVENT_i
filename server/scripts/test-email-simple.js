#!/usr/bin/env node

/**
 * Simple Email Service Test
 */

require('dotenv').config();
const emailService = require('../services/emailService');

async function testEmail() {
  try {
    console.log('🧪 Testing Email Service...\n');

    console.log('📧 Email Configuration:');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log(`\n🌐 View emails at: https://ethereal.email/messages`);
    console.log(`   Login: nova7@ethereal.email / wHQmBVbbjdWPUX7vG4\n`);

    // Test account creation email
    console.log('📨 Sending test welcome email...');
    
    await emailService.sendAccountCreationEmail({
      email: 'test.user@example.com',
      firstName: 'Test',
      tempPassword: 'TempPass123!',
      orderNumber: 'ORD-TEST-' + Date.now()
    });

    console.log('✅ Test email sent successfully!\n');
    console.log('👉 Check emails at: https://ethereal.email/messages\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Email Test Failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);
    process.exit(1);
  }
}

testEmail();

