const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Create transporter using environment variables
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
}

module.exports = new EmailService();