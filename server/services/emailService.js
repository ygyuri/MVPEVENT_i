const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Send ticket purchase receipt
  async sendPurchaseReceipt(order, tickets) {
    try {
      const { customer, items, pricing, orderNumber } = order;
      
      const itemsList = items.map(item => 
        `${item.eventTitle} - ${item.ticketType} x${item.quantity} @ KES ${item.unitPrice}`
      ).join('\n');

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">🎫 Event-i</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Your tickets are confirmed!</p>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #333;">Order Confirmation</h2>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${customer.firstName} ${customer.lastName}</p>
            <p><strong>Email:</strong> ${customer.email}</p>
            
            <h3 style="color: #333; margin-top: 30px;">Tickets Purchased:</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
              ${itemsList.split('\n').map(item => `<p style="margin: 5px 0;">${item}</p>`).join('')}
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">Payment Summary:</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Subtotal:</strong> KES ${pricing.subtotal}</p>
              <p><strong>Service Fee:</strong> KES ${pricing.serviceFee}</p>
              <p><strong>Total:</strong> KES ${pricing.total}</p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #e8f5e8; border-radius: 5px;">
              <h4 style="color: #2d5a2d; margin: 0;">Your tickets have been sent to your email!</h4>
              <p style="color: #2d5a2d; margin: 10px 0 0 0;">Please check your inbox for individual ticket details.</p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>Thank you for choosing Event-i!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: customer.email,
        subject: `🎫 Ticket Confirmation - Order ${orderNumber}`,
        html: emailContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Purchase receipt email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Failed to send purchase receipt email:', error.message);
      throw new Error('Failed to send receipt email');
    }
  }

  // Send individual ticket email
  async sendTicketEmail(ticket, event) {
    try {
      const { holder, ticketNumber, ticketType, price } = ticket;
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">🎫 Event Ticket</h1>
            <p style="color: #666; margin: 10px 0 0 0;">${event.title}</p>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #333;">Ticket Details</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${new Date(event.dates.startDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(event.dates.startDate).toLocaleTimeString()}</p>
              <p><strong>Venue:</strong> ${event.location.venueName || 'TBD'}</p>
              <p><strong>Ticket Type:</strong> ${ticketType}</p>
              <p><strong>Price:</strong> KES ${price}</p>
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">Attendee Information</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Name:</strong> ${holder.firstName} ${holder.lastName}</p>
              <p><strong>Email:</strong> ${holder.email}</p>
              <p><strong>Phone:</strong> ${holder.phone}</p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px;">
              <h4 style="color: #856404; margin: 0;">Important Information</h4>
              <ul style="color: #856404; margin: 10px 0;">
                <li>Please arrive 15 minutes before the event starts</li>
                <li>Bring a valid ID for verification</li>
                <li>This ticket is non-transferable</li>
                <li>QR code will be scanned at entry</li>
              </ul>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>Thank you for choosing Event-i!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: holder.email,
        subject: `🎫 Your Ticket - ${event.title}`,
        html: emailContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Ticket email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Failed to send ticket email:', error.message);
      throw new Error('Failed to send ticket email');
    }
  }

  // Send payment failure notification
  async sendPaymentFailureEmail(order, errorMessage) {
    try {
      const { customer, orderNumber } = order;
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8d7da; padding: 20px; text-align: center;">
            <h1 style="color: #721c24; margin: 0;">⚠️ Payment Failed</h1>
            <p style="color: #721c24; margin: 10px 0 0 0;">Order ${orderNumber}</p>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #333;">Payment Issue</h2>
            <p>We're sorry, but your payment for order <strong>${orderNumber}</strong> was not successful.</p>
            
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Error:</strong> ${errorMessage}</p>
            </div>
            
            <h3 style="color: #333;">What to do next:</h3>
            <ul>
              <li>Check your MPESA balance</li>
              <li>Ensure your phone number is correct</li>
              <li>Try the payment again</li>
              <li>Contact our support if the issue persists</li>
            </ul>
            
            <div style="margin-top: 30px; padding: 15px; background: #d1ecf1; border-radius: 5px;">
              <h4 style="color: #0c5460; margin: 0;">Need Help?</h4>
              <p style="color: #0c5460; margin: 10px 0 0 0;">Our support team is here to help you complete your purchase.</p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>Thank you for choosing Event-i!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: customer.email,
        subject: `⚠️ Payment Failed - Order ${orderNumber}`,
        html: emailContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Payment failure email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Failed to send payment failure email:', error.message);
      throw new Error('Failed to send payment failure email');
    }
  }
}

module.exports = new EmailService();
