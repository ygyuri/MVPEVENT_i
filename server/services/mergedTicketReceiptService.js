/**
 * Merged Ticket & Receipt Email Service
 * 
 * Combines ticket delivery with payment receipt to reduce email spam.
 * Sends one comprehensive email instead of two separate emails.
 * 
 * @module mergedTicketReceiptService
 */

const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

class MergedTicketReceiptService {
  constructor() {
    // Use same email service configuration as main emailService for consistency
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with proper configuration
   * Uses same setup as emailService for consistency
   */
  async initializeTransporter() {
    try {
      // Get Ethereal test account (same as emailService)
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      console.log('✅ Merged email service transporter initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      // Fallback to environment variables
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  /**
   * Send combined ticket + receipt email
   * Professional, concise, with all essential information
   */
  async sendTicketAndReceipt({ order, tickets, customerEmail, customerName, event }) {
    try {
      // Ensure transporter is initialized
      if (!this.transporter) {
        await this.initializeTransporter();
      }
      // Get app URL
      const appUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      
      // Generate ticket rows with QR codes
      const ticketRows = tickets.map((ticket, index) => {
        const qrCodeUrl = ticket.qrCodeUrl || '';
        const ticketNumber = ticket.ticketNumber || 'N/A';
        const ticketType = ticket.ticketType || 'General Admission';
        const price = ticket.price || 0;
        const currency = order.pricing?.currency || 'KES';

        return `
          <tr>
            <td style="padding: 24px; border-bottom: 1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="200" style="vertical-align: top; padding-right: 20px;">
                    <!-- QR Code -->
                    <div style="background: #FFFFFF; padding: 12px; border-radius: 12px; border: 2px solid #3A7DFF; display: inline-block;">
                      <img src="${qrCodeUrl}" alt="Ticket QR Code" style="width: 180px; height: 180px; display: block;" />
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <!-- Ticket Details -->
                    <h3 style="margin: 0 0 16px 0; color: #1A1A1A; font-size: 20px; font-weight: 700;">
                      ${ticketType}
                    </h3>
                    
                    <div style="background: linear-gradient(135deg, rgba(58, 125, 255, 0.05) 0%, rgba(138, 79, 255, 0.05) 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #3A7DFF; margin-bottom: 16px;">
                      <div style="font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; margin-bottom: 6px;">Ticket Number</div>
                      <div style="font-size: 24px; font-weight: 700; color: #3A7DFF; font-family: 'Courier New', Courier, monospace;">${ticketNumber}</div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                      <span style="color: #6B7280; font-size: 14px;">Holder:</span>
                      <span style="color: #1A1A1A; font-weight: 600; font-size: 14px; margin-left: 8px;">${ticket.holder?.firstName} ${ticket.holder?.lastName}</span>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                      <span style="color: #6B7280; font-size: 14px;">Price:</span>
                      <span style="color: #1A1A1A; font-weight: 600; font-size: 14px; margin-left: 8px;">${currency} ${price}</span>
                    </div>
                    
                    <div style="background: #F8FAFC; padding: 12px; border-radius: 6px; margin-top: 16px;">
                      <div style="font-size: 12px; color: #16A34A; font-weight: 600;">✅ Status: Active</div>
                      <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">Scan QR code at event entry</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      }).join('');

      // Payment details
      const totalAmount = order.totalAmount || order.pricing?.total || 0;
      const currency = order.pricing?.currency || 'KES';
      const mpesaReceipt = order.payment?.mpesaReceiptNumber || 'N/A';
      const paidAt = order.payment?.paidAt || new Date();
      const paymentMethod = 'M-PESA';

      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Your Tickets & Receipt</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1A1A1A;
            background-color: #F2F4F7;
          }
          .email-wrapper { 
            width: 100%; 
            background-color: #F2F4F7; 
            padding: 40px 0;
          }
          .container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: #FFFFFF; 
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          }
          .header { 
            background: linear-gradient(135deg, #3A7DFF 0%, #8A4FFF 100%); 
            color: #FFFFFF; 
            padding: 48px 32px; 
            text-align: center; 
          }
          .header-icon {
            font-size: 72px;
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
          }
          .content { 
            padding: 40px 32px; 
          }
          .section-title {
            font-size: 22px;
            font-weight: 700;
            color: #1A1A1A;
            margin: 0 0 24px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #3A7DFF;
          }
          .payment-summary {
            background: linear-gradient(135deg, rgba(22, 163, 74, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
            border: 2px solid #16A34A;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }
          .payment-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #E5E7EB;
          }
          .payment-row:last-child {
            border-bottom: none;
            padding-top: 16px;
            margin-top: 8px;
            border-top: 2px solid #16A34A;
          }
          .payment-label {
            color: #6B7280;
            font-size: 14px;
          }
          .payment-value {
            color: #1A1A1A;
            font-weight: 600;
            font-size: 14px;
          }
          .payment-total {
            font-size: 24px;
            font-weight: 700;
            color: #16A34A;
          }
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
          }
          .info-box {
            background: #F8FAFC;
            border-left: 4px solid #3A7DFF;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .info-box h4 {
            margin: 0 0 12px 0;
            color: #3A7DFF;
            font-size: 16px;
            font-weight: 700;
          }
          .info-box p {
            margin: 0;
            font-size: 14px;
            color: #4B4B4B;
            line-height: 1.6;
          }
          .footer { 
            background: linear-gradient(135deg, #F8FAFC 0%, #F2F4F7 100%);
            padding: 32px; 
            text-align: center;
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
          @media only screen and (max-width: 600px) {
            .content { padding: 24px 20px; }
            .header { padding: 32px 20px; }
            .payment-row { flex-direction: column; align-items: flex-start; gap: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="header-icon">🎫</div>
              <h1>Your Tickets Are Ready!</h1>
              <p>Order #${order.orderNumber}</p>
            </div>
            
            <!-- Content -->
            <div class="content">
              <p style="font-size: 18px; color: #1A1A1A; font-weight: 600; margin-bottom: 8px;">Hi ${customerName},</p>
              <p style="font-size: 16px; color: #4B4B4B; margin-bottom: 32px;">Your payment was successful! Your tickets and receipt are below.</p>
              
              <!-- Payment Summary -->
              <h2 class="section-title">💳 Payment Confirmed</h2>
              <div class="payment-summary">
                <div class="payment-row">
                  <span class="payment-label">Order Number</span>
                  <span class="payment-value">${order.orderNumber}</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">M-PESA Receipt</span>
                  <span class="payment-value">${mpesaReceipt}</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">Payment Method</span>
                  <span class="payment-value">${paymentMethod}</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">Date & Time</span>
                  <span class="payment-value">${new Date(paidAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">Tickets</span>
                  <span class="payment-value">${tickets.length} × ${tickets[0]?.ticketType}</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">Total Paid</span>
                  <span class="payment-total">${currency} ${totalAmount.toLocaleString()}</span>
                </div>
              </div>
              
              <!-- Tickets Section -->
              <h2 class="section-title">🎫 Your Tickets</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                ${ticketRows}
              </table>
              
              <!-- Important Information -->
              <div class="info-box">
                <h4>📱 How to Use Your Tickets</h4>
                <p><strong>Option 1:</strong> Show the QR code on your phone at the event entrance</p>
                <p style="margin-top: 8px;"><strong>Option 2:</strong> If QR fails, provide your <strong>Ticket Number</strong> to the organizer</p>
                <p style="margin-top: 12px; font-size: 13px; color: #6B7280;">💡 Tip: Save this email or take a screenshot of your QR codes</p>
              </div>
              
              <!-- CTA Button -->
              <div class="btn-container">
                <a href="${appUrl}/wallet" class="btn">View All My Tickets →</a>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div style="border-top: 2px solid #E5E7EB; padding-top: 24px;">
                <div class="footer-contact">
                  <p><strong>Need Help?</strong></p>
                  <p>📧 <a href="mailto:gideonyuri15@gmail.com">gideonyuri15@gmail.com</a></p>
                  <p>📱 <a href="tel:+254703328938">+254 703 328 938</a></p>
                </div>
                
                <p style="margin-top: 24px; color: #6B7280; font-size: 13px;">Order #${order.orderNumber} • ${event?.title || 'Event'}</p>
                <p style="margin-top: 8px; color: #6B7280; font-size: 13px;">Keep this email for your records</p>
                
                <div style="margin-top: 20px; font-weight: 600; color: #3A7DFF; font-size: 16px;">Event-i</div>
                <p style="margin-top: 4px; color: #6B7280; font-size: 12px;">© ${new Date().getFullYear()} All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;

      const mailOptions = {
        from: `"Event-i Tickets" <${process.env.EMAIL_USER || 'noreply@event-i.com'}>`,
        to: customerEmail,
        subject: `🎫 Your Tickets & Receipt - ${event?.title || 'Event'} (Order #${order.orderNumber})`,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Merged ticket & receipt email sent:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };

    } catch (error) {
      console.error('❌ Error sending merged ticket & receipt email:', error);
      throw error;
    }
  }
}

module.exports = new MergedTicketReceiptService();

