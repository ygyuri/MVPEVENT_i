# Bulk Resend Email Verification Guide

## Overview

This guide explains how to verify that bulk resend will work correctly and that emails are sent from the admin email address.

## Email Configuration

### Production Settings

All emails are sent from: **`no-reply@event-i.co.ke`**

- **SMTP Server**: `mail.event-i.co.ke:465` (SSL)
- **Admin Notifications**: Sent to `ADMIN_EMAIL` environment variable (or falls back to `SMTP_USER`)

### Local Development

All emails are sent from: **`nova7@ethereal.email`**

- **SMTP Server**: `smtp.ethereal.email:587` (Test service)
- Emails are caught by Ethereal and won't actually deliver
- Preview URLs are provided to view the emails

## Email Flow in Bulk Resend

### 1. Customer Ticket Emails

**Location**: `server/services/emailService.js:1442`

```javascript
from: `"Event-i" <${process.env.SMTP_USER}>`
```

- Contains order details and QR codes (inline PNG attachments)
- Includes all tickets with updated QR codes
- Retry logic: 3 attempts with exponential backoff
- Only saved to database if email succeeds (transaction safety)

### 2. Admin Completion Notification

**Location**: `server/services/notificationService.js:173`

```javascript
from: `"Event-i Notifications" <${process.env.SMTP_USER}>`
to: process.env.ADMIN_EMAIL || process.env.SMTP_USER
```

- Sent after bulk resend completes (success or failure)
- Includes:
  - Summary stats (orders processed, emails sent, errors)
  - Execution details (duration, triggered by, filters)
  - Error list (if any)
  - Audit log ID for tracking

## Verification Steps

### Step 1: Test SMTP Configuration

**Local Development:**
```bash
cd server
MONGODB_URI="mongodb://127.0.0.1:27017/event_i" node -e "
const emailService = require('./services/emailService');
console.log('Email Configuration:');
console.log('  From:', process.env.SMTP_USER);
console.log('  Host:', process.env.SMTP_HOST);
console.log('  Port:', process.env.SMTP_PORT);
console.log('  Admin:', process.env.ADMIN_EMAIL || process.env.SMTP_USER);
console.log('\\nTesting connection...');
emailService.testEmailConfiguration().then(valid => {
  console.log(valid ? '✅ SUCCESS' : '❌ FAILED');
  process.exit(valid ? 0 : 1);
});
"
```

**Production:**
```bash
ssh event-i-prod
docker exec event_i_server_prod node -e "
const emailService = require('./services/emailService');
emailService.testEmailConfiguration().then(valid => {
  console.log(valid ? '✅ SMTP OK' : '❌ SMTP FAILED');
  process.exit(valid ? 0 : 1);
});
"
```

### Step 2: Preview Orders (Production)

Connect to production and preview the 8 orders that need QR regeneration:

```bash
ssh event-i-prod

# Run preview query
docker exec -it event_i_server_prod node -e "
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Event = require('./models/Event');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const eventId = '6900585705a1f5631d411705'; // Double Fervour
  const cutoffDate = new Date('2025-12-06T00:00:00.000Z');

  const event = await Event.findById(eventId);
  console.log('\\n📅 Event:', event.title);
  console.log('🗓️  Orders before:', cutoffDate.toLocaleString());
  console.log('');

  const orders = await Order.find({
    'items.eventId': mongoose.Types.ObjectId(eventId),
    status: { \\\$in: ['completed', 'paid'] },
    'payment.status': 'completed',
    createdAt: { \\\$lt: cutoffDate }
  }).populate('items.eventId', 'title').sort({ createdAt: 1 }).lean();

  console.log('✅ Found', orders.length, 'orders with OLD QR logic\\n');

  let totalTickets = 0;
  orders.forEach((order, i) => {
    const count = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    totalTickets += count;
    const email = order.customer?.email || order.customerEmail;
    console.log(\\\`  \\\${i+1}. \\\${order.orderNumber} - \\\${email} - \\\${count} ticket(s)\\\`);
  });

  console.log('\\n📊 Summary:');
  console.log('   Orders:', orders.length);
  console.log('   Tickets:', totalTickets);
  console.log('   From:', process.env.SMTP_USER);

  mongoose.connection.close();
});
"
```

**Expected Output:**
```
📅 Event: Double Fervour Edition 2 RnB Experience
🗓️  Orders before: 12/6/2025, 3:00:00 AM

✅ Found 8 orders with OLD QR logic

  1. ORD-XXXXX - customer1@example.com - 2 ticket(s)
  2. ORD-XXXXX - customer2@example.com - 1 ticket(s)
  ...

📊 Summary:
   Orders: 8
   Tickets: [total count]
   From: no-reply@event-i.co.ke
```

### Step 3: Test with Single Order (Recommended)

Before running bulk resend on all 8 orders, test with a single order:

```bash
# On production
ssh event-i-prod
docker exec -it event_i_server_prod node

# In Node REPL:
const bulkResendService = require('./services/bulkResendService');
const mongoose = require('mongoose');

// Connect and test
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Testing single order...');

  // Replace with actual order ID from preview
  const testOrderId = 'REPLACE_WITH_ACTUAL_ORDER_ID';

  const result = await bulkResendService.resendTicketsForOrders({
    orderId: testOrderId,
    dryRun: false  // Set to true to simulate without sending
  });

  console.log('Results:', result);
  mongoose.connection.close();
});
```

### Step 4: Use the Admin UI (Recommended Approach)

The safest way is to use the web interface:

1. **Login to Admin Dashboard**: https://event-i.co.ke/admin
2. **Navigate to Orders** tab
3. **Click "Bulk Resend Tickets"** button
4. **Select filters**:
   - Event: "Double Fervour Edition 2 RnB Experience"
   - End Date: 2025-12-06
5. **Preview Orders**: Review the list of orders that will be affected
6. **Execute**: Confirm and run bulk resend
7. **Monitor Progress**: Real-time updates via WebSocket
8. **Check Results**: View completion summary and any errors

## What Emails Get Sent?

### Customer Email (for each order)

**Subject**: `Your Tickets - Order #ORD-XXXXX`

**From**: `"Event-i" <no-reply@event-i.co.ke>`

**To**: Customer email address

**Contents**:
- Order summary
- All tickets with NEW QR codes (inline PNG images)
- Entry instructions
- Link to online wallet

### Admin Notification (after completion)

**Subject**: `✅ Bulk Resend Completed - 8 orders processed`

**From**: `"Event-i Notifications" <no-reply@event-i.co.ke>`

**To**: `ADMIN_EMAIL` (or `SMTP_USER` as fallback)

**Contents**:
- Summary statistics
- Orders processed, emails sent, errors
- Execution details (who triggered, when, duration)
- Error list (if any)
- Audit log ID

## Database Updates

### What Gets Updated?

For each ticket in each order:

1. **`qrCode`** field: Updated with new encrypted QR data (format: base64 JWT)
2. **`qrCodeUrl`** field: Updated with new data URL (PNG image)
3. **`order.metadata.lastBulkResendAt`**: Timestamp of when bulk resend was run

### Transaction Safety

**IMPORTANT**: Changes are only saved if email succeeds!

```javascript
// MongoDB transaction ensures atomicity
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Generate new QR codes (in memory)
  // 2. Send email with new QR codes
  // 3. IF email succeeds:
  await ticket.save({ session });  // Save to DB
  await session.commitTransaction();  // Commit
  // 4. IF email fails:
  await session.abortTransaction();  // Rollback (no DB changes)
} finally {
  session.endSession();
}
```

## Verifying Results

### 1. Check Audit Log

Query the audit log after bulk resend:

```bash
# On production
docker exec -it event_i_server_prod node -e "
const mongoose = require('mongoose');
const BulkResendLog = require('./models/BulkResendLog');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const logs = await BulkResendLog.find({})
    .sort({ startTime: -1 })
    .limit(1)
    .lean();

  console.log('Latest bulk resend log:');
  console.log(JSON.stringify(logs[0], null, 2));

  mongoose.connection.close();
});
"
```

### 2. Verify QR Code Format Changed

Check a ticket from an affected order:

```bash
docker exec -it event_i_server_prod node -e "
const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // Replace with ticket from affected order
  const ticket = await Ticket.findOne({ orderNumber: 'ORD-XXXXX' }).lean();

  console.log('QR Code format check:');
  console.log('  Length:', ticket.qrCode.length);
  console.log('  Starts with eyJ:', ticket.qrCode.startsWith('eyJ'));
  console.log('  Has colon:', ticket.qrCode.includes(':'));

  // OLD format: 417 chars, has colon, format: hash:data
  // NEW format: 234 chars, starts with eyJ, format: base64 JWT

  mongoose.connection.close();
});
"
```

### 3. Check Admin Email

- Check your admin email inbox
- Should receive completion notification with summary
- Verify it came from `no-reply@event-i.co.ke`

### 4. Test QR Code Scanning

- Open one of the tickets in the admin dashboard
- Scan the QR code with the scanner app
- Should successfully verify and show ticket details

## Troubleshooting

### Email Sending Failed

**Symptoms**: Orders processed but emails not sent

**Causes**:
- SMTP credentials incorrect
- SMTP server down
- Rate limiting

**Solution**:
1. Test SMTP connection (Step 1)
2. Check SMTP credentials in environment variables
3. Review email service provider logs
4. Retry bulk resend (safe - won't duplicate emails if already sent)

### Database Not Updated

**Symptoms**: QR codes still in old format after bulk resend

**Causes**:
- Email sending failed (transaction rolled back)
- Dry run mode was enabled
- Database connection issue

**Solution**:
1. Check audit log for errors
2. Verify `dryRun` was set to `false`
3. Check transaction commits in logs
4. Retry bulk resend for affected orders

### Admin Notification Not Received

**Symptoms**: Bulk resend completed but no admin email

**Causes**:
- `ADMIN_EMAIL` not set
- Admin email invalid
- Notification service failed

**Solution**:
1. Verify `ADMIN_EMAIL` environment variable is set
2. Check notification service logs
3. Admin can view audit log in dashboard

## Best Practices

### Before Running Bulk Resend

1. ✅ Test SMTP configuration
2. ✅ Preview orders to verify count
3. ✅ Run dry run first (test mode)
4. ✅ Test with single order
5. ✅ Backup database (production only)
6. ✅ Notify users (optional, for large batches)

### During Bulk Resend

1. ✅ Monitor progress in real-time (WebSocket updates)
2. ✅ Watch for errors in console/logs
3. ✅ Don't interrupt the process
4. ✅ Keep admin dashboard open

### After Bulk Resend

1. ✅ Review audit log
2. ✅ Verify admin notification received
3. ✅ Check customer emails (sample)
4. ✅ Test QR code scanning (sample)
5. ✅ Monitor for customer support tickets
6. ✅ Document any issues

## Production Execution Command

When ready to execute on production:

```bash
# SSH to production
ssh event-i-prod

# Use the admin UI (recommended)
# OR use API directly:

curl -X POST "https://event-i.co.ke/api/admin/tickets/bulk-resend?eventId=6900585705a1f5631d411705&endDate=2025-12-06T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

## Summary Checklist

- [ ] SMTP configuration tested and working
- [ ] Preview shows 8 orders with old QR logic
- [ ] Confirmed "from" address is `no-reply@event-i.co.ke`
- [ ] Confirmed admin email is set and correct
- [ ] Database backup completed (production)
- [ ] Dry run tested successfully
- [ ] Single order test completed
- [ ] Ready to execute bulk resend
- [ ] Monitoring plan in place
- [ ] Customer support notified (if needed)

---

**Last Updated**: 2025-12-13
**Contact**: Technical Support - gideonyuri15@gmail.com
