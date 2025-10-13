const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Create transporter using environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(orderData, paymentData) {
    try {
      const { customerInfo, items, totalAmount, feeBreakdown, paymentReference } = orderData;
      const { mpesaReceiptNumber, phone } = paymentData;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: customerInfo.email || customerInfo.phone + '@example.com', // Fallback if no email
        subject: `Payment Receipt - Order ${paymentReference}`,
        html: this.generateReceiptHTML(orderData, paymentData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Payment receipt email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending payment receipt:', error);
      throw error;
    }
  }

  /**
   * Generate HTML receipt template
   */
  generateReceiptHTML(orderData, paymentData) {
    const { customerInfo, items, totalAmount, feeBreakdown, paymentReference, createdAt } = orderData;
    const { mpesaReceiptNumber, phone } = paymentData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt - Event-i</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .receipt-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 18px; color: #667eea; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .success-badge { background: #4CAF50; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Payment Successful!</h1>
            <p>Thank you for your purchase</p>
          </div>
          
          <div class="content">
            <div class="success-badge">
              ✅ Payment Completed Successfully
            </div>
            
            <div class="receipt-details">
              <h3>Receipt Details</h3>
              <p><strong>Receipt Number:</strong> ${paymentReference}</p>
              <p><strong>MPESA Receipt:</strong> ${mpesaReceiptNumber || 'N/A'}</p>
              <p><strong>Date:</strong> ${new Date(createdAt).toLocaleDateString('en-KE')}</p>
              <p><strong>Time:</strong> ${new Date(createdAt).toLocaleTimeString('en-KE')}</p>
            </div>
            
            <div class="receipt-details">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${customerInfo.name}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              ${customerInfo.email ? `<p><strong>Email:</strong> ${customerInfo.email}</p>` : ''}
            </div>
            
            <div class="receipt-details">
              <h3>Order Items</h3>
              ${items.map(item => `
                <div class="item">
                  <div>
                    <strong>${item.eventTitle}</strong><br>
                    <small>${item.ticketType} x ${item.quantity}</small>
                  </div>
                  <div>KES ${item.subtotal.toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="receipt-details">
              <h3>Payment Summary</h3>
              <div class="item">
                <span>Subtotal:</span>
                <span>KES ${feeBreakdown?.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div class="item">
                <span>Processing Fee:</span>
                <span>KES ${feeBreakdown?.processingFee?.toFixed(2) || '0.00'}</span>
              </div>
              ${feeBreakdown?.fixedFee > 0 ? `
                <div class="item">
                  <span>Fixed Fee:</span>
                  <span>KES ${feeBreakdown.fixedFee.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="item total">
                <span>Total Paid:</span>
                <span>KES ${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing Event-i!</p>
              <p>For any inquiries, please contact our support team.</p>
              <p><small>This is an automated receipt. Please keep it for your records.</small></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderData) {
    try {
      const { customerInfo, items, totalAmount, paymentReference } = orderData;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: customerInfo.email || customerInfo.phone + '@example.com',
        subject: `Order Confirmation - ${paymentReference}`,
        html: this.generateOrderConfirmationHTML(orderData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Order confirmation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  }

  /**
   * Generate order confirmation HTML
   */
  generateOrderConfirmationHTML(orderData) {
    const { customerInfo, items, totalAmount, paymentReference, createdAt } = orderData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Event-i</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Order Confirmed!</h1>
            <p>Your tickets are ready</p>
          </div>
          
          <div class="content">
            <div class="order-details">
              <h3>Order Information</h3>
              <p><strong>Order Number:</strong> ${paymentReference}</p>
              <p><strong>Date:</strong> ${new Date(createdAt).toLocaleDateString('en-KE')}</p>
              <p><strong>Customer:</strong> ${customerInfo.name}</p>
            </div>
            
            <div class="order-details">
              <h3>Event Tickets</h3>
              ${items.map(item => `
                <div class="item">
                  <div>
                    <strong>${item.eventTitle}</strong><br>
                    <small>${item.ticketType} x ${item.quantity}</small>
                  </div>
                  <div>KES ${item.subtotal.toFixed(2)}</div>
                </div>
              `).join('')}
              <div class="item" style="font-weight: bold; border-top: 2px solid #667eea; margin-top: 10px;">
                <span>Total:</span>
                <span>KES ${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Your tickets will be sent to your email shortly.</p>
              <p>Thank you for choosing Event-i!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }

  /**
   * Send individual ticket email with deep-link to wallet and optional QR
   */
  async sendTicketEmail(ticket, event) {
    const to = ticket.holder?.email;
    if (!to) return;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const walletUrl = `${frontendUrl}/wallet?open=${ticket._id}`;

    // Simple template with CTA
    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>body{font-family:Arial,sans-serif;color:#222} .container{max-width:600px;margin:0 auto;padding:24px}
      .card{background:#f7f7fb;border-radius:12px;padding:20px;border:1px solid #eaeaf2}
      .btn{display:inline-block;background:#4f46e5;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none}
      .muted{color:#666;font-size:12px;margin-top:14px}
      </style></head>
      <body><div class="container">
        <h2>Your Ticket for ${event?.title || 'Event'}</h2>
        <div class="card">
          <p><strong>Holder:</strong> ${ticket.holder?.firstName} ${ticket.holder?.lastName}</p>
          <p><strong>Type:</strong> ${ticket.ticketType}</p>
          <p><strong>Status:</strong> ${ticket.status}</p>
          <p><a href="${walletUrl}" class="btn">View Ticket & QR</a></p>
          <p class="muted">Tip: The QR rotates periodically for security. Open the link at the gate.</p>
        </div>
      </div></body></html>`;

    // Optional inline QR PNG (best-effort)
    let attachments = [];
    try {
      const qrPayload = ticket?.qr?.signature ? null : null; // we don't have plaintext here; deep-link preferred
      // Generate a QR for wallet deep-link as a fallback (scanner uses app)
      const dataUrl = await QRCode.toDataURL(walletUrl, { margin: 1, width: 240 });
      const base64 = dataUrl.split(',')[1];
      attachments.push({ filename: 'ticket-qr.png', content: Buffer.from(base64, 'base64'), contentType: 'image/png' });
    } catch {}

    const mailOptions = {
      from: `"Event-i" <${process.env.SMTP_USER}>`,
      to,
      subject: `Your Ticket • ${event?.title || 'Event'}`,
      html,
      attachments
    };

    // Best-effort retry (non-persistent) up to 3 attempts with backoff
    const trySend = async (attempt = 1) => {
      try {
        const res = await this.transporter.sendMail(mailOptions);
        if (res?.messageId) return res;
        throw new Error('sendMail did not return messageId');
      } catch (err) {
        if (attempt >= 3) throw err;
        const delayMs = 500 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delayMs));
        return trySend(attempt + 1);
      }
    };

    return trySend();
  }

  /**
   * Send event published notification to organizer
   */
  async sendEventPublishedNotification(event, organizer) {
    const to = organizer.email;
    if (!to) return;
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const eventUrl = `${frontendUrl}/events/${event.slug}`;
    const dashboardUrl = `${frontendUrl}/organizer`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Event Published Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 24px; }
            .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 32px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
            .content { background: #f7f7fb; border-radius: 12px; padding: 24px; border: 1px solid #eaeaf2; }
            .event-card { background: white; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e5e7eb; }
            .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 4px; }
            .btn-secondary { background: #6b7280; }
            .muted { color: #666; font-size: 14px; margin-top: 16px; }
            .highlight { background: #fef3c7; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0; }
            .footer { text-align: center; margin-top: 32px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Event Published Successfully!</h1>
              <p>Your event is now live and ready for attendees</p>
            </div>
            
            <div class="content">
              <h2>Congratulations, ${organizer.firstName}!</h2>
              <p>Your event <strong>"${event.title}"</strong> has been successfully published and is now visible to potential attendees.</p>
              
              <div class="event-card">
                <h3>📅 Event Details</h3>
                <p><strong>Title:</strong> ${event.title}</p>
                <p><strong>Date:</strong> ${new Date(event.dates.startDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>Time:</strong> ${new Date(event.dates.startDate).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })} - ${new Date(event.dates.endDate).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })}</p>
                ${event.location?.venueName ? `<p><strong>Location:</strong> ${event.location.venueName}, ${event.location.city}</p>` : ''}
                <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">✅ Published & Live</span></p>
              </div>
              
              <div class="highlight">
                <h4>🚀 What's Next?</h4>
                <ul>
                  <li>Share your event link with potential attendees</li>
                  <li>Monitor registrations in your organizer dashboard</li>
                  <li>Prepare for your event day</li>
                  <li>Check in with attendees as the event approaches</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${eventUrl}" class="btn">View Your Event</a>
                <a href="${dashboardUrl}" class="btn btn-secondary">Go to Dashboard</a>
              </div>
              
              <div class="muted">
                <p><strong>Need Help?</strong></p>
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                <p>Thank you for using Event-i to create amazing experiences!</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This email was sent because you published an event on Event-i.</p>
              <p>© 2024 Event-i. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: `"Event-i" <${process.env.SMTP_USER}>`,
      to,
      subject: `🎉 Event Published: ${event.title}`,
      html
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send event published notification to admin for review
   */
  async sendEventPublishedAdminNotification(event, organizer) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@event-i.com';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const eventUrl = `${frontendUrl}/events/${event.slug}`;
    const adminUrl = `${frontendUrl}/admin`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>New Event Published - Admin Review</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 24px; }
            .header { background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 32px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
            .content { background: #f7f7fb; border-radius: 12px; padding: 24px; border: 1px solid #eaeaf2; }
            .event-card { background: white; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e5e7eb; }
            .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 4px; }
            .btn-secondary { background: #6b7280; }
            .muted { color: #666; font-size: 14px; margin-top: 16px; }
            .highlight { background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 16px 0; }
            .footer { text-align: center; margin-top: 32px; color: #666; font-size: 12px; }
            .organizer-info { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔍 New Event Published</h1>
              <p>Admin review required</p>
            </div>
            
            <div class="content">
              <h2>New Event Published</h2>
              <p>A new event has been published and requires admin review.</p>
              
              <div class="organizer-info">
                <h3>👤 Organizer Information</h3>
                <p><strong>Name:</strong> ${organizer.firstName} ${organizer.lastName}</p>
                <p><strong>Email:</strong> ${organizer.email}</p>
                <p><strong>User ID:</strong> ${organizer._id}</p>
              </div>
              
              <div class="event-card">
                <h3>📅 Event Details</h3>
                <p><strong>Title:</strong> ${event.title}</p>
                <p><strong>Description:</strong> ${event.description?.substring(0, 200)}${event.description?.length > 200 ? '...' : ''}</p>
                <p><strong>Date:</strong> ${new Date(event.dates.startDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>Time:</strong> ${new Date(event.dates.startDate).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })} - ${new Date(event.dates.endDate).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })}</p>
                ${event.location?.venueName ? `<p><strong>Location:</strong> ${event.location.venueName}, ${event.location.city}</p>` : ''}
                <p><strong>Capacity:</strong> ${event.capacity || 'Unlimited'}</p>
                <p><strong>Pricing:</strong> ${event.pricing?.isFree ? 'Free' : `$${event.pricing?.price || 0}`}</p>
                <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">✅ Published</span></p>
                <p><strong>Event ID:</strong> ${event._id}</p>
              </div>
              
              <div class="highlight">
                <h4>⚠️ Admin Action Required</h4>
                <ul>
                  <li>Review event content for compliance</li>
                  <li>Verify event details and location</li>
                  <li>Check for any policy violations</li>
                  <li>Approve or flag the event if necessary</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${eventUrl}" class="btn">Review Event</a>
                <a href="${adminUrl}" class="btn btn-secondary">Admin Dashboard</a>
              </div>
              
              <div class="muted">
                <p><strong>Quick Actions:</strong></p>
                <p>• Approve the event if it meets all guidelines</p>
                <p>• Contact the organizer if you need more information</p>
                <p>• Flag the event if there are any concerns</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated notification for admin review.</p>
              <p>© 2024 Event-i. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: `"Event-i Admin" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🔍 New Event Published: ${event.title} - Admin Review Required`,
      html
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send account creation email with temporary credentials
   * For auto-created accounts during direct checkout
   */
  async sendAccountCreationEmail({ email, firstName, tempPassword, orderNumber }) {
    try {
      // Get app URL with fallback
      const appUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const loginUrl = `${appUrl}/login`;
      
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Welcome to Event-i</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, sans-serif !important;}
        </style>
        <![endif]-->
        <style>
          /* Reset styles */
          body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1A1A1A;
            background-color: #F2F4F7;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Container */
          .email-wrapper { 
            width: 100%; 
            background-color: #F2F4F7; 
            padding: 40px 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #FFFFFF; 
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          }
          
          /* Header with brand colors */
          .header { 
            background: linear-gradient(135deg, #3A7DFF 0%, #8A4FFF 100%); 
            color: #FFFFFF; 
            padding: 48px 32px; 
            text-align: center; 
          }
          .header-icon {
            font-size: 64px;
            line-height: 1;
            margin-bottom: 16px;
          }
          .header h1 { 
            margin: 0 0 8px 0; 
            font-size: 32px; 
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 0;
            font-size: 18px;
            opacity: 0.95;
            font-weight: 400;
          }
          
          /* Content area */
          .content { 
            padding: 40px 32px; 
          }
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #1A1A1A;
            margin-bottom: 16px;
          }
          .intro-text {
            font-size: 16px;
            color: #4B4B4B;
            margin-bottom: 32px;
            line-height: 1.7;
          }
          
          /* Credentials box - Updated with brand colors */
          .credentials-box { 
            background: linear-gradient(135deg, rgba(58, 125, 255, 0.05) 0%, rgba(138, 79, 255, 0.05) 100%);
            border: 2px solid #3A7DFF;
            border-radius: 12px;
            padding: 24px; 
            margin: 32px 0; 
          }
          .credentials-box h3 {
            margin: 0 0 20px 0;
            color: #3A7DFF;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .credential-item { 
            margin: 16px 0; 
            padding: 16px; 
            background: #FFFFFF; 
            border-radius: 8px;
            border: 1px solid #E5E7EB;
          }
          .credential-label {
            font-size: 11px;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .credential-value {
            font-size: 18px;
            font-weight: 700;
            color: #1A1A1A;
            font-family: 'Courier New', Courier, monospace;
            word-break: break-all;
          }
          
          /* CTA Button - Brand colors */
          .btn-container {
            text-align: center;
            margin: 32px 0;
          }
          .btn { 
            display: inline-block; 
            padding: 16px 40px; 
            background: linear-gradient(135deg, #3A7DFF 0%, #8A4FFF 100%);
            color: #FFFFFF; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(58, 125, 255, 0.3);
            transition: all 0.3s ease;
          }
          .btn:hover {
            box-shadow: 0 6px 16px rgba(58, 125, 255, 0.4);
            transform: translateY(-2px);
          }
          
          /* Quick tips box */
          .tips-box {
            background: #F8FAFC;
            border-left: 4px solid #16A34A;
            border-radius: 8px;
            padding: 20px;
            margin: 32px 0;
          }
          .tips-box h3 {
            margin: 0 0 12px 0;
            color: #16A34A;
            font-size: 16px;
            font-weight: 700;
          }
          .tips-box ul {
            margin: 0;
            padding-left: 20px;
          }
          .tips-box li {
            margin: 8px 0;
            color: #4B4B4B;
            font-size: 15px;
          }
          
          /* Security notice - Subtle */
          .security-notice {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          }
          .security-notice-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            color: #92400E;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .security-notice p {
            margin: 0;
            font-size: 14px;
            color: #78350F;
          }
          
          /* Footer - Brand colors */
          .footer { 
            background: linear-gradient(135deg, #F8FAFC 0%, #F2F4F7 100%);
            padding: 32px; 
            text-align: center;
          }
          .footer-content {
            border-top: 2px solid #E5E7EB;
            padding-top: 24px;
          }
          .footer p {
            margin: 8px 0;
            color: #6B7280; 
            font-size: 13px; 
            line-height: 1.6;
          }
          .footer-contact {
            margin-top: 20px;
            padding: 16px;
            background: rgba(58, 125, 255, 0.05);
            border-radius: 8px;
            display: inline-block;
          }
          .footer-contact p {
            margin: 4px 0;
            color: #4B4B4B;
            font-size: 13px;
          }
          .footer-contact a {
            color: #3A7DFF;
            text-decoration: none;
            font-weight: 600;
          }
          .footer-brand {
            margin-top: 20px;
            font-weight: 600;
            color: #3A7DFF;
            font-size: 16px;
          }
          
          /* Responsive */
          @media only screen and (max-width: 600px) {
            .content { padding: 24px 20px; }
            .header { padding: 32px 20px; }
            .header h1 { font-size: 28px; }
            .btn { padding: 14px 32px; font-size: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="header-icon">🎉</div>
              <h1>Welcome to Event-i!</h1>
              <p>Your account is ready</p>
            </div>
            
            <!-- Content -->
            <div class="content">
              <div class="greeting">Hi ${firstName},</div>
              
              <p class="intro-text">
                Thanks for your purchase. We've set up your Event-i account so you can access your tickets 
                and manage your event details.
              </p>
              
              <!-- Login Credentials -->
              <div class="credentials-box">
                <h3>
                  <span>🔐</span>
                  <span>Your Login Credentials</span>
                </h3>
                
                <div class="credential-item">
                  <div class="credential-label">Email</div>
                  <div class="credential-value">${email}</div>
                </div>
                
                <div class="credential-item">
                  <div class="credential-label">Temporary Password</div>
                  <div class="credential-value">${tempPassword}</div>
                </div>
              </div>
              
              <!-- Security Notice -->
              <div class="security-notice">
                <div class="security-notice-header">
                  <span>🔒</span>
                  <span>Security Reminder</span>
                </div>
                <p>Change this password after logging in to keep your account secure.</p>
              </div>
              
              <!-- CTA Button -->
              <div class="btn-container">
                <a href="${loginUrl}" class="btn">Access Your Account →</a>
              </div>
              
              <!-- Quick Tips -->
              <div class="tips-box">
                <h3>Your Account Includes:</h3>
                <ul>
                  <li>Access to your tickets with QR codes</li>
                  <li>Event reminders and updates</li>
                  <li>Easy ticket management</li>
                </ul>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="footer-content">
                <div class="footer-contact">
                  <p><strong>Need Help?</strong></p>
                  <p>📧 <a href="mailto:gideonyuri15@gmail.com">gideonyuri15@gmail.com</a></p>
                  <p>📱 <a href="tel:+254703328938">+254 703 328 938</a></p>
                </div>
                
                <p style="margin-top: 24px;">This account was created for order <strong>#${orderNumber}</strong></p>
                <p>If you didn't make this purchase, please contact us immediately.</p>
                
                <div class="footer-brand">Event-i</div>
                <p style="margin-top: 4px;">© ${new Date().getFullYear()} All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your Event-i Account - Order #${orderNumber}`,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Account creation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Error sending account creation email:', error);
      throw error;
    }
  }

  /**
   * Send ticket email with QR codes after successful payment
   */
  async sendTicketEmail({ order, tickets, customerEmail, customerName }) {
    try {
      // Generate ticket HTML rows
      const ticketRows = tickets.map((ticket, index) => {
        const event = ticket.eventId;
        const eventDate = event?.dates?.startDate 
          ? new Date(event.dates.startDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Date TBD';

        return `
          <div style="background: white; border: 2px solid #667eea; border-radius: 12px; padding: 25px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
              <div>
                <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 20px;">
                  Ticket #${index + 1} - ${ticket.ticketNumber}
                </h3>
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">
                  ${event?.title || 'Event'}
                </p>
                <p style="margin: 5px 0; color: #666;">
                  🎫 ${ticket.ticketType}
                </p>
              </div>
              <div style="background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                ${ticket.status.toUpperCase()}
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #666;"><strong>📅 Date:</strong> ${eventDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>📍 Venue:</strong> ${event?.location?.venueName || 'TBD'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>🎫 Holder:</strong> ${ticket.holder.firstName} ${ticket.holder.lastName}</p>
            </div>
            
            <div style="text-align: center; background: #f0f0f0; padding: 20px; border-radius: 8px;">
              <p style="margin: 0 0 15px 0; font-weight: bold; color: #333;">Your Entry QR Code</p>
              ${ticket.qrCodeUrl 
                ? `<img src="${ticket.qrCodeUrl}" alt="QR Code" style="max-width: 250px; border: 3px solid #667eea; border-radius: 8px;" />`
                : '<p style="color: #666;">QR Code will be available soon</p>'
              }
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">
                Present this QR code at the event entrance
              </p>
            </div>
          </div>
        `;
      }).join('');

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Event Tickets</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #666; 
            font-size: 14px; 
            background: #f8f9fa;
          }
          .btn { 
            display: inline-block; 
            padding: 14px 32px; 
            background: #667eea; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold;
            margin: 20px 0;
          }
          .info-box {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 48px; margin: 10px 0;">🎫</div>
            <h1 style="margin: 0;">Your Tickets</h1>
            <p style="margin: 10px 0;">Order #${order.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Hi ${customerName},</p>
            
            <p>Your payment has been confirmed. You'll find your tickets below.</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>💳 Payment Confirmed</strong></p>
              <p style="margin: 8px 0 0 0;">Order: <strong>${order.orderNumber}</strong></p>
              ${order.payment?.mpesaReceiptNumber ? `<p style="margin: 5px 0 0 0;">M-PESA Receipt: <strong>${order.payment.mpesaReceiptNumber}</strong></p>` : ''}
              <p style="margin: 5px 0 0 0;">Amount Paid: <strong>${order.pricing?.currency || 'KES'} ${order.totalAmount || order.pricing?.total}</strong></p>
              <p style="margin: 5px 0 0 0;">Tickets: <strong>${tickets.length} × ${tickets[0]?.ticketType}</strong></p>
            </div>
            
            <h2 style="color: #667eea; margin-top: 30px;">Your Tickets</h2>
            
            ${ticketRows}
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold;">📱 At the Event</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Show your QR code at the entrance</li>
                <li>If the code doesn't scan, provide your ticket number</li>
                <li>Save this email or take a screenshot</li>
                <li>Each ticket is valid for one entry only</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/wallet" class="btn">
                View My Tickets
              </a>
            </div>
            
            <p>See you there.</p>
            <p style="margin-top: 16px;">The Event-i Team</p>
          </div>
          
          <div class="footer">
            <div style="padding: 16px; background: rgba(58, 125, 255, 0.05); border-radius: 8px; display: inline-block; margin-bottom: 20px;">
              <p style="margin: 4px 0;"><strong>Need Help?</strong></p>
              <p style="margin: 4px 0;">📧 <a href="mailto:gideonyuri15@gmail.com" style="color: #3A7DFF; text-decoration: none; font-weight: 600;">gideonyuri15@gmail.com</a></p>
              <p style="margin: 4px 0;">📱 <a href="tel:+254703328938" style="color: #3A7DFF; text-decoration: none; font-weight: 600;">+254 703 328 938</a></p>
            </div>
            <p style="margin-top: 20px;">Order #${order.orderNumber} • Payment receipt included above</p>
            <p>© ${new Date().getFullYear()} Event-i. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
      `;

      const mailOptions = {
        from: `"Event-i Tickets" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `🎫 Your Tickets & Receipt - Order #${order.orderNumber}`,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Ticket email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Error sending ticket email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();