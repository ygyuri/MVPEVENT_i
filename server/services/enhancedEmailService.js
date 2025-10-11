const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const crypto = require('crypto');

class EnhancedEmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.EMAIL_PASS || 'ethereal.pass'
      }
    });
  }

  /**
   * Generate unique QR code for ticket
   */
  async generateTicketQRCode(ticket, order) {
    try {
      // Create secure QR payload
      const qrPayload = {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        eventId: order.eventId._id.toString(),
        orderId: order._id.toString(),
        eventTitle: order.eventId.title,
        holderName: `${order.customer.firstName} ${order.customer.lastName}`,
        issuedAt: new Date().toISOString(),
        securityHash: crypto.createHash('sha256')
          .update(ticket._id.toString() + order._id.toString())
          .digest('hex').substring(0, 8)
      };

      // Generate QR code image
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#1a202c',
          light: '#ffffff'
        }
      });

      return {
        qrCodeDataURL,
        qrPayload
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Enhanced Ticket Email Template
   */
  async sendEnhancedTicketEmail({ order, tickets, customerEmail, customerName }) {
    try {
      // Generate QR codes for all tickets
      const ticketsWithQR = await Promise.all(
        tickets.map(async (ticket) => {
          const qrData = await this.generateTicketQRCode(ticket, order);
          return {
            ...ticket.toObject(),
            qrCodeDataURL: qrData.qrCodeDataURL,
            qrPayload: qrData.qrPayload
          };
        })
      );

      const event = order.eventId;
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

      const venueInfo = event?.location ? 
        `${event.location.venueName}, ${event.location.city}` : 
        'Venue TBD';

      // Generate ticket cards HTML
      const ticketCards = ticketsWithQR.map((ticket, index) => `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 30px;
          margin: 25px 0;
          color: white;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
        ">
          <!-- Decorative elements -->
          <div style="
            position: absolute;
            top: -20px;
            right: -20px;
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
          "></div>
          <div style="
            position: absolute;
            bottom: -30px;
            left: -30px;
            width: 100px;
            height: 100px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 50%;
          "></div>
          
          <!-- Ticket Header -->
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 25px; position: relative; z-index: 1;">
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold;">
                🎫 Ticket #${index + 1}
              </h3>
              <p style="margin: 0; font-size: 18px; font-weight: 600; opacity: 0.9;">
                ${ticket.ticketNumber}
              </p>
              <div style="
                background: rgba(255, 255, 255, 0.2);
                padding: 6px 12px;
                border-radius: 20px;
                display: inline-block;
                margin-top: 8px;
                font-size: 14px;
                font-weight: 500;
              ">
                ${ticket.ticketType}
              </div>
            </div>
            
            <div style="
              background: rgba(255, 255, 255, 0.2);
              padding: 12px 20px;
              border-radius: 25px;
              text-align: center;
              backdrop-filter: blur(10px);
            ">
              <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">STATUS</div>
              <div style="font-size: 16px; font-weight: bold;">${ticket.status.toUpperCase()}</div>
            </div>
          </div>
          
          <!-- Event Details -->
          <div style="
            background: rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
            backdrop-filter: blur(10px);
            position: relative;
            z-index: 1;
          ">
            <h4 style="margin: 0 0 15px 0; font-size: 20px; font-weight: bold;">
              ${event?.title || 'Event'}
            </h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">📅 DATE & TIME</div>
                <div style="font-size: 16px; font-weight: 600;">${eventDate}</div>
              </div>
              <div>
                <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">📍 VENUE</div>
                <div style="font-size: 16px; font-weight: 600;">${venueInfo}</div>
              </div>
            </div>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
              <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">👤 TICKET HOLDER</div>
              <div style="font-size: 16px; font-weight: 600;">${ticket.holder.firstName} ${ticket.holder.lastName}</div>
            </div>
          </div>
          
          <!-- QR Code Section -->
          <div style="
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            position: relative;
            z-index: 1;
          ">
            <h4 style="
              margin: 0 0 15px 0; 
              font-size: 18px; 
              font-weight: bold; 
              color: #1a202c;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            ">
              <span style="
                background: #667eea;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
              ">📱</span>
              Entry QR Code
            </h4>
            
            <div style="
              background: white;
              border: 3px solid #667eea;
              border-radius: 12px;
              padding: 15px;
              display: inline-block;
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            ">
              <img src="${ticket.qrCodeDataURL}" alt="QR Code" style="
                width: 200px;
                height: 200px;
                display: block;
              " />
            </div>
            
            <p style="
              margin: 15px 0 0 0;
              font-size: 14px;
              color: #4a5568;
              font-weight: 500;
            ">
              Present this QR code at the event entrance for scanning
            </p>
            
            <div style="
              margin-top: 12px;
              padding: 8px 16px;
              background: #f7fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              font-size: 12px;
              color: #718096;
            ">
              <strong>Security Hash:</strong> ${ticket.qrPayload.securityHash}
            </div>
          </div>
          
          <!-- Important Notice -->
          <div style="
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 193, 7, 0.2);
            border-radius: 8px;
            border-left: 4px solid #ffc107;
            position: relative;
            z-index: 1;
          ">
            <p style="margin: 0; font-size: 14px; font-weight: 500;">
              ⚠️ <strong>Important:</strong> Keep this ticket secure. Each QR code is unique and can only be used once.
            </p>
          </div>
        </div>
      `).join('');

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Event Tickets - ${event?.title || 'Event'}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background: #f8fafc;
          }
          .container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 50px 40px; 
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
            animation: float 20s infinite linear;
          }
          @keyframes float {
            0% { transform: translateX(-50%) translateY(-50%) rotate(0deg); }
            100% { transform: translateX(-50%) translateY(-50%) rotate(360deg); }
          }
          .header-content {
            position: relative;
            z-index: 1;
          }
          .content { 
            padding: 50px 40px; 
          }
          .footer { 
            text-align: center; 
            padding: 40px; 
            color: #666; 
            font-size: 14px; 
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
          .order-summary {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            border: 1px solid #dee2e6;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .summary-item {
            text-align: center;
          }
          .summary-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .summary-value {
            font-size: 18px;
            font-weight: bold;
            color: #495057;
          }
          .instructions {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
          }
          .instructions h4 {
            margin: 0 0 15px 0;
            color: #1976d2;
            font-size: 18px;
          }
          .instructions ul {
            margin: 0;
            padding-left: 20px;
          }
          .instructions li {
            margin-bottom: 8px;
            color: #1565c0;
          }
          @media (max-width: 600px) {
            .container { margin: 0; }
            .header, .content, .footer { padding: 30px 20px; }
            .summary-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="header-content">
              <h1 style="margin: 0 0 15px 0; font-size: 32px; font-weight: bold;">
                🎫 Your Tickets Are Ready!
              </h1>
              <p style="margin: 0; font-size: 18px; opacity: 0.9;">
                ${event?.title || 'Event'} - ${eventDate}
              </p>
            </div>
          </div>
          
          <!-- Content -->
          <div class="content">
            <p style="font-size: 18px; color: #495057; margin-bottom: 30px;">
              Hi <strong>${customerName}</strong>,<br><br>
              Great news! Your tickets for <strong>${event?.title || 'the event'}</strong> are ready. 
              Each ticket includes a unique QR code for secure entry.
            </p>
            
            <!-- Order Summary -->
            <div class="order-summary">
              <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #495057; text-align: center;">
                📋 Order Summary
              </h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Order Number</div>
                  <div class="summary-value" style="font-family: monospace; font-size: 16px;">
                    ${order.orderNumber}
                  </div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Tickets</div>
                  <div class="summary-value">${tickets.length}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Amount</div>
                  <div class="summary-value">${order.pricing?.currency || 'KES'} ${order.totalAmount?.toLocaleString() || '0'}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Payment Status</div>
                  <div class="summary-value" style="color: #28a745;">✅ Paid</div>
                </div>
              </div>
            </div>
            
            <!-- Tickets -->
            ${ticketCards}
            
            <!-- Instructions -->
            <div class="instructions">
              <h4>📱 How to Use Your Tickets</h4>
              <ul>
                <li><strong>Save This Email:</strong> Keep this email accessible on your phone</li>
                <li><strong>QR Code Access:</strong> Show the QR code at the event entrance</li>
                <li><strong>Arrive Early:</strong> We recommend arriving 30 minutes before the event starts</li>
                <li><strong>Valid ID:</strong> Bring a valid ID that matches the ticket holder name</li>
                <li><strong>One-Time Use:</strong> Each QR code can only be scanned once</li>
              </ul>
            </div>
            
            <!-- Contact Info -->
            <div style="
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              margin-top: 30px;
              text-align: center;
            ">
              <h4 style="margin: 0 0 10px 0; color: #495057;">Need Help?</h4>
              <p style="margin: 0; color: #6c757d;">
                Contact us at <a href="mailto:support@event-i.com" style="color: #667eea; text-decoration: none;">support@event-i.com</a><br>
                or visit our support center for assistance.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 10px 0;">
              <strong>Event-i</strong> - Your Premier Event Platform
            </p>
            <p style="margin: 0; font-size: 12px; color: #adb5bd;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
      `;

      const mailOptions = {
        from: `"Event-i" <${process.env.EMAIL_USER || 'noreply@event-i.com'}>`,
        to: customerEmail,
        subject: `🎫 Your Tickets - ${event?.title || 'Event'} - ${order.orderNumber}`,
        html: html,
        attachments: []
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Enhanced ticket email sent:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };

    } catch (error) {
      console.error('❌ Error sending enhanced ticket email:', error);
      throw error;
    }
  }

  /**
   * Enhanced Receipt Email
   */
  async sendEnhancedReceiptEmail({ order, customerEmail, customerName, event }) {
    try {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt - ${order.orderNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px; text-align: center; }
          .content { padding: 40px; }
          .receipt { background: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0; }
          .receipt-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
          .receipt-item:last-child { border-bottom: none; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; padding: 30px; color: #666; font-size: 14px; background: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎉 Payment Successful!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your purchase</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 30px;">
              Hi <strong>${customerName}</strong>,<br><br>
              Your payment has been processed successfully. Here's your receipt:
            </p>
            
            <div class="receipt">
              <h3 style="margin: 0 0 20px 0; text-align: center;">📄 Payment Receipt</h3>
              
              <div class="receipt-item">
                <span>Receipt Number:</span>
                <span style="font-family: monospace;">${order.orderNumber}</span>
              </div>
              <div class="receipt-item">
                <span>M-PESA Receipt:</span>
                <span style="font-family: monospace;">${order.payment?.mpesaReceiptNumber || 'N/A'}</span>
              </div>
              <div class="receipt-item">
                <span>Date:</span>
                <span>${new Date(order.payment?.paidAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <div class="receipt-item">
                <span>Time:</span>
                <span>${new Date(order.payment?.paidAt || Date.now()).toLocaleTimeString()}</span>
              </div>
              <div class="receipt-item">
                <span>Event:</span>
                <span>${event?.title || 'N/A'}</span>
              </div>
              <div class="receipt-item">
                <span>Amount Paid:</span>
                <span style="color: #28a745; font-weight: bold;">
                  ${order.pricing?.currency || 'KES'} ${order.totalAmount?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
            
            <p style="text-align: center; margin-top: 30px; color: #28a745; font-weight: bold;">
              ✅ Payment completed successfully
            </p>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">Thank you for choosing Event-i!</p>
          </div>
        </div>
      </body>
      </html>
      `;

      const mailOptions = {
        from: `"Event-i" <${process.env.EMAIL_USER || 'noreply@event-i.com'}>`,
        to: customerEmail,
        subject: `📄 Payment Receipt - ${order.orderNumber}`,
        html: html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Enhanced receipt email sent:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };

    } catch (error) {
      console.error('❌ Error sending enhanced receipt email:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedEmailService();
