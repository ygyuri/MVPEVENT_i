const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const {
  getBrandColors,
  getEmailHeader,
  getEmailFooter,
  wrapEmailTemplate,
} = require("./emailBranding");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Create transporter using environment variables
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    // Port 465 uses SSL, other ports use STARTTLS
    const isSecure = smtpPort === 465;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  /**
   * Generate security headers for emails
   * Improves deliverability and reduces spam marking
   */
  getSecurityHeaders() {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const supportEmail = process.env.SMTP_USER || "noreply@event-i.com";

    return {
      "X-Mailer": "Event-i Platform v1.0",
      "X-Auto-Response-Suppress": "All",
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Precedence: "bulk",
      "List-Id": "<event-tickets.event-i.com>",
      "List-Unsubscribe": `<${frontendUrl}/unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "Return-Path": supportEmail,
      Sender: supportEmail,
      "Message-ID": `<${Date.now()}@event-i.com>`,
      "X-Entity-Ref-ID": `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(orderData, paymentData) {
    try {
      const {
        customerInfo,
        items,
        totalAmount,
        feeBreakdown,
        paymentReference,
      } = orderData;
      const { mpesaReceiptNumber, phone } = paymentData;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: customerInfo.email || customerInfo.phone + "@example.com", // Fallback if no email
        subject: `Payment Receipt - Order ${paymentReference}`,
        html: this.generateReceiptHTML(orderData, paymentData),
        headers: this.getSecurityHeaders(),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Payment receipt email sent:", result.messageId);
      return result;
    } catch (error) {
      console.error("Error sending payment receipt:", error);
      throw error;
    }
  }

  /**
   * Generate HTML receipt template
   */
  generateReceiptHTML(orderData, paymentData) {
    const {
      customerInfo,
      items,
      totalAmount,
      feeBreakdown,
      paymentReference,
      createdAt,
    } = orderData;
    const { mpesaReceiptNumber, phone } = paymentData;
    const colors = getBrandColors();

    const content = `
      ${getEmailHeader("🎉 Payment Successful!", "Thank you for your purchase")}
          
          <div class="content">
        <div class="badge badge-success" style="display: inline-block; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 20px 0;">
              ✅ Payment Completed Successfully
            </div>
            
        <div class="card">
              <h3>Receipt Details</h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Receipt Number:</td>
              <td style="padding: 8px 0; color: ${
                colors.text
              };">${paymentReference}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">MPESA Receipt:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${
      mpesaReceiptNumber || "N/A"
    }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Date:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${new Date(
      createdAt
    ).toLocaleDateString("en-KE")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Time:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${new Date(
      createdAt
    ).toLocaleTimeString("en-KE")}</td>
            </tr>
          </table>
            </div>
            
        <div class="card">
              <h3>Customer Information</h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Name:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${
      customerInfo.name
    }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Phone:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${phone}</td>
            </tr>
            ${
              customerInfo.email
                ? `
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${colors.textMuted};">Email:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${customerInfo.email}</td>
            </tr>
            `
                : ""
            }
          </table>
            </div>
            
        <div class="card">
              <h3>Order Items</h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            ${items
              .map(
                (item) => `
              <tr>
                <td style="padding: 12px 0;">
                  <strong style="color: ${colors.text};">${
                  item.eventTitle
                }</strong><br>
                  <small style="color: ${colors.textMuted};">${
                  item.ticketType
                } x ${item.quantity}</small>
                </td>
                <td style="padding: 12px 0; text-align: right; font-weight: 600; color: ${
                  colors.text
                };">
                  KES ${item.subtotal.toFixed(2)}
                </td>
              </tr>
            `
              )
              .join("")}
          </table>
            </div>
            
        <div class="card">
              <h3>Payment Summary</h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 12px 0; color: ${
                colors.textSecondary
              };">Subtotal:</td>
              <td style="padding: 12px 0; text-align: right; color: ${
                colors.textSecondary
              };">
                KES ${feeBreakdown?.subtotal?.toFixed(2) || "0.00"}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: ${
                colors.textSecondary
              };">Processing Fee:</td>
              <td style="padding: 12px 0; text-align: right; color: ${
                colors.textSecondary
              };">
                KES ${feeBreakdown?.processingFee?.toFixed(2) || "0.00"}
              </td>
            </tr>
            ${
              feeBreakdown?.fixedFee > 0
                ? `
            <tr>
              <td style="padding: 12px 0; color: ${
                colors.textSecondary
              };">Fixed Fee:</td>
              <td style="padding: 12px 0; text-align: right; color: ${
                colors.textSecondary
              };">
                KES ${feeBreakdown.fixedFee.toFixed(2)}
              </td>
            </tr>
            `
                : ""
            }
            <tr style="border-top: 2px solid ${colors.primary};">
              <td style="padding: 16px 0; font-weight: 700; font-size: 18px; color: ${
                colors.primary
              };">
                Total Paid:
              </td>
              <td style="padding: 16px 0; text-align: right; font-weight: 700; font-size: 18px; color: ${
                colors.primary
              };">
                KES ${totalAmount.toFixed(2)}
              </td>
            </tr>
          </table>
              </div>
            </div>
            
      ${getEmailFooter()}
    `;

    return wrapEmailTemplate(content, "Payment Receipt - Event-i");
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderData) {
    try {
      const { customerInfo, items, totalAmount, paymentReference } = orderData;

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: customerInfo.email || customerInfo.phone + "@example.com",
        subject: `Order Confirmation - ${paymentReference}`,
        html: this.generateOrderConfirmationHTML(orderData),
        headers: this.getSecurityHeaders(),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Order confirmation email sent:", result.messageId);
      return result;
    } catch (error) {
      console.error("Error sending order confirmation:", error);
      throw error;
    }
  }

  /**
   * Generate order confirmation HTML
   */
  generateOrderConfirmationHTML(orderData) {
    const { customerInfo, items, totalAmount, paymentReference, createdAt } =
      orderData;
    const colors = getBrandColors();

    const content = `
      ${getEmailHeader("🎫 Order Confirmed!", "Your tickets are ready")}
          
          <div class="content">
        <div class="card">
              <h3>Order Information</h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Order Number:</td>
              <td style="padding: 8px 0; color: ${
                colors.text
              };">${paymentReference}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Date:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${new Date(
      createdAt
    ).toLocaleDateString("en-KE")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Customer:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${
      customerInfo.name
    }</td>
            </tr>
          </table>
            </div>
            
        <div class="card">
              <h3>Event Tickets</h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            ${items
              .map(
                (item) => `
              <tr>
                <td style="padding: 12px 0;">
                  <strong style="color: ${colors.text};">${
                  item.eventTitle
                }</strong><br>
                  <small style="color: ${colors.textMuted};">${
                  item.ticketType
                } x ${item.quantity}</small>
                </td>
                <td style="padding: 12px 0; text-align: right; font-weight: 600; color: ${
                  colors.text
                };">
                  KES ${item.subtotal.toFixed(2)}
                </td>
              </tr>
            `
              )
              .join("")}
            <tr style="border-top: 2px solid ${colors.primary};">
              <td style="padding: 16px 0; font-weight: 700; font-size: 18px; color: ${
                colors.primary
              };">
                Total:
              </td>
              <td style="padding: 16px 0; text-align: right; font-weight: 700; font-size: 18px; color: ${
                colors.primary
              };">
                KES ${totalAmount.toFixed(2)}
              </td>
            </tr>
          </table>
            </div>
            
        <div class="highlight-box">
          <p style="margin: 0; color: ${colors.textSecondary};">
            Your tickets will be sent to your email shortly. Keep an eye on your inbox!
          </p>
            </div>
          </div>
      
      ${getEmailFooter()}
    `;

    return wrapEmailTemplate(content, "Order Confirmation - Event-i");
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      console.log("Email configuration is valid");
      return true;
    } catch (error) {
      console.error("Email configuration error:", error);
      return false;
    }
  }

  /**
   * Send individual ticket email with deep-link to wallet and optional QR
   */
  async sendTicketEmail(ticket, event) {
    const to = ticket.holder?.email;
    if (!to) return;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
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
        <h2>Your Ticket for ${event?.title || "Event"}</h2>
        <div class="card">
          <p><strong>Holder:</strong> ${ticket.holder?.firstName} ${
      ticket.holder?.lastName
    }</p>
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
      const dataUrl = await QRCode.toDataURL(walletUrl, {
        margin: 1,
        width: 240,
      });
      const base64 = dataUrl.split(",")[1];
      attachments.push({
        filename: "ticket-qr.png",
        content: Buffer.from(base64, "base64"),
        contentType: "image/png",
      });
    } catch {}

    const mailOptions = {
      from: `"Event-i" <${process.env.SMTP_USER}>`,
      to,
      subject: `Your Ticket • ${event?.title || "Event"}`,
      html,
      attachments,
      headers: this.getSecurityHeaders(),
    };

    // Best-effort retry (non-persistent) up to 3 attempts with backoff
    const trySend = async (attempt = 1) => {
      try {
        const res = await this.transporter.sendMail(mailOptions);
        if (res?.messageId) return res;
        throw new Error("sendMail did not return messageId");
      } catch (err) {
        if (attempt >= 3) throw err;
        const delayMs = 500 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delayMs));
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

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const eventUrl = `${frontendUrl}/events/${event.slug}`;
    const dashboardUrl = `${frontendUrl}/organizer`;
    const colors = getBrandColors();

    const content = `
      ${getEmailHeader(
        "🎉 Event Published Successfully!",
        "Your event is now live and ready for attendees"
      )}
            
            <div class="content">
        <div class="greeting">Congratulations, ${organizer.firstName}!</div>
        
        <p class="intro-text">
          Your event <strong>"${
            event.title
          }"</strong> has been successfully published and is now visible to potential attendees.
        </p>
        
        <div class="card">
                <h3>📅 Event Details</h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Title:</td>
              <td style="padding: 8px 0; color: ${colors.text};">${
      event.title
    }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Date:</td>
              <td style="padding: 8px 0; color: ${colors.text};">
                ${new Date(event.dates.startDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Time:</td>
              <td style="padding: 8px 0; color: ${colors.text};">
                ${new Date(event.dates.startDate).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })} - ${new Date(event.dates.endDate).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    )}
              </td>
            </tr>
            ${
              event.location?.venueName
                ? `
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Location:</td>
              <td style="padding: 8px 0; color: ${colors.text};">
                ${event.location.venueName}${
                    event.location.city ? `, ${event.location.city}` : ""
                  }
              </td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Status:</td>
              <td style="padding: 8px 0; color: ${
                colors.success
              }; font-weight: 600;">
                ✅ Published & Live
              </td>
            </tr>
          </table>
              </div>
              
        <div class="highlight-box">
                <h4>🚀 What's Next?</h4>
          <ul style="margin: 0; padding-left: 20px; color: ${
            colors.textSecondary
          };">
                  <li>Share your event link with potential attendees</li>
                  <li>Monitor registrations in your organizer dashboard</li>
                  <li>Prepare for your event day</li>
                  <li>Check in with attendees as the event approaches</li>
                </ul>
              </div>
              
        <div class="btn-container">
                <a href="${eventUrl}" class="btn">View Your Event</a>
                <a href="${dashboardUrl}" class="btn btn-secondary">Go to Dashboard</a>
              </div>
            </div>
            
      ${getEmailFooter()}
    `;

    const html = wrapEmailTemplate(content, `Event Published: ${event.title}`);

    const mailOptions = {
      from: `"Event-i" <${process.env.SMTP_USER}>`,
      to,
      subject: `🎉 Event Published: ${event.title}`,
      html,
      headers: this.getSecurityHeaders(),
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send event published notification to admin for review
   */
  async sendEventPublishedAdminNotification(event, organizer) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@event-i.com";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
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
                <p><strong>Name:</strong> ${organizer.firstName} ${
      organizer.lastName
    }</p>
                <p><strong>Email:</strong> ${organizer.email}</p>
                <p><strong>User ID:</strong> ${organizer._id}</p>
              </div>
              
              <div class="event-card">
                <h3>📅 Event Details</h3>
                <p><strong>Title:</strong> ${event.title}</p>
                <p><strong>Description:</strong> ${event.description?.substring(
                  0,
                  200
                )}${event.description?.length > 200 ? "..." : ""}</p>
                <p><strong>Date:</strong> ${new Date(
                  event.dates.startDate
                ).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</p>
                <p><strong>Time:</strong> ${new Date(
                  event.dates.startDate
                ).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })} - ${new Date(event.dates.endDate).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    )}</p>
                ${
                  event.location?.venueName
                    ? `<p><strong>Location:</strong> ${event.location.venueName}, ${event.location.city}</p>`
                    : ""
                }
                <p><strong>Capacity:</strong> ${
                  event.capacity || "Unlimited"
                }</p>
                <p><strong>Pricing:</strong> ${
                  event.pricing?.isFree
                    ? "Free"
                    : `$${event.pricing?.price || 0}`
                }</p>
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
      html,
      headers: this.getSecurityHeaders(),
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send welcome email to new users on registration
   */
  async sendWelcomeEmail({ email, firstName, name, role = "customer" }) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || "https://event-i.co.ke";
      const colors = getBrandColors();
      const userName = firstName || name?.split(" ")[0] || "there";

      const content = `
        ${getEmailHeader(
          "🎉 Welcome to Event-i!",
          "We're excited to have you join us!"
        )}
        
        <div class="content">
          <div class="greeting">Hi ${userName},</div>
          
          <p class="intro-text">
            Thank you for joining Event-i! We're thrilled to have you as part of our community. 
            You're now ready to discover amazing events and create unforgettable experiences.
          </p>
          
          <div class="card">
            <h3>🚀 Get Started</h3>
            <p style="margin: 0 0 12px 0; color: ${colors.textSecondary};">
              Here's what you can do with your new account:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: ${
              colors.textSecondary
            };">
              <li>Browse and discover events near you</li>
              <li>Purchase tickets for your favorite events</li>
              <li>Manage your tickets in your wallet</li>
              <li>Receive event reminders and updates</li>
              ${
                role === "organizer"
                  ? "<li>Create and manage your own events</li>"
                  : ""
              }
            </ul>
          </div>
          
          <div class="highlight-box">
            <h4>✨ What Makes Event-i Special?</h4>
            <ul style="margin: 0; padding-left: 20px; color: ${
              colors.textSecondary
            };">
              <li>Secure payment processing</li>
              <li>Digital tickets with QR codes</li>
              <li>Event reminders so you never miss out</li>
              <li>Easy event discovery and booking</li>
            </ul>
          </div>
          
          <div class="btn-container">
            <a href="${frontendUrl}/events" class="btn">Browse Events</a>
            ${
              role === "organizer"
                ? `<a href="${frontendUrl}/organizer" class="btn btn-secondary">Create Event</a>`
                : ""
            }
          </div>
          
          <p class="intro-text" style="margin-top: 24px;">
            Need help? Our support team is here for you. Don't hesitate to reach out if you have any questions.
          </p>
        </div>
        
        ${getEmailFooter()}
      `;

      const html = wrapEmailTemplate(content, "Welcome to Event-i");

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "🎉 Welcome to Event-i!",
        html,
        headers: this.getSecurityHeaders(),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Welcome email sent:", result.messageId);
      return result;
    } catch (error) {
      console.error("❌ Error sending welcome email:", error);
      throw error;
    }
  }

  /**
   * Send account creation email with temporary credentials
   * For auto-created accounts during direct checkout
   */
  async sendAccountCreationEmail({
    email,
    firstName,
    tempPassword,
    orderNumber,
  }) {
    try {
      // Get app URL from environment (matches production config)
      const appUrl =
        process.env.FRONTEND_URL ||
        process.env.CLIENT_URL ||
        process.env.BASE_URL ||
        "http://localhost:3001";
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
            padding: 20px 0;
          }
          .container { 
            max-width: 560px; 
            margin: 0 auto; 
            background: #FFFFFF; 
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          }
          
          /* Header with brand colors */
          .header { 
            background: linear-gradient(135deg, #3A7DFF 0%, #8A4FFF 100%); 
            color: #FFFFFF; 
            padding: 28px 24px; 
            text-align: center; 
          }
          .header-icon {
            font-size: 64px;
            line-height: 1;
            margin-bottom: 16px;
          }
          .header h1 { 
            margin: 0 0 6px 0; 
            font-size: 24px; 
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 0;
            font-size: 14px;
            opacity: 0.9;
            font-weight: 400;
          }
          
          /* Content area */
          .content { 
            padding: 24px 20px; 
          }
          .greeting {
            font-size: 16px;
            font-weight: 600;
            color: #1A1A1A;
            margin-bottom: 12px;
          }
          .intro-text {
            font-size: 14px;
            color: #4B4B4B;
            margin-bottom: 20px;
            line-height: 1.6;
          }
          
          /* Credentials box - Updated with brand colors */
          .credentials-box { 
            background: linear-gradient(135deg, rgba(58, 125, 255, 0.05) 0%, rgba(138, 79, 255, 0.05) 100%);
            border: 2px solid #3A7DFF;
            border-radius: 8px;
            padding: 16px; 
            margin: 20px 0; 
          }
          .credentials-box h3 {
            margin: 0 0 12px 0;
            color: #3A7DFF;
            font-size: 14px;
            font-weight: 700;
          }
          .credential-item { 
            margin: 10px 0; 
            padding: 12px; 
            background: #FFFFFF; 
            border-radius: 6px;
            border: 1px solid #E5E7EB;
          }
          .credential-label {
            font-size: 10px;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .credential-value {
            font-size: 14px;
            font-weight: 600;
            color: #1A1A1A;
            font-family: 'Courier New', Courier, monospace;
            word-break: break-all;
          }
          
          /* CTA Button - Brand colors */
          .btn-container {
            text-align: center;
            margin: 20px 0;
          }
          .btn { 
            display: inline-block; 
            padding: 12px 28px; 
            background: linear-gradient(135deg, #3A7DFF 0%, #8A4FFF 100%);
            color: #FFFFFF; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(58, 125, 255, 0.3);
            transition: all 0.3s ease;
          }
          .btn:hover {
            box-shadow: 0 6px 16px rgba(58, 125, 255, 0.4);
            transform: translateY(-2px);
          }
          
          /* Quick tips box */
          .tips-box {
            background: #F8FAFC;
            border-left: 3px solid #16A34A;
            border-radius: 6px;
            padding: 14px;
            margin: 20px 0;
          }
          .tips-box h3 {
            margin: 0 0 8px 0;
            color: #16A34A;
            font-size: 13px;
            font-weight: 700;
          }
          .tips-box ul {
            margin: 0;
            padding-left: 18px;
          }
          .tips-box li {
            margin: 6px 0;
            color: #4B4B4B;
            font-size: 13px;
          }
          
          /* Security notice - Subtle */
          .security-notice {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 6px;
            padding: 12px;
            margin: 16px 0;
          }
          .security-notice-header {
            font-weight: 600;
            color: #92400E;
            font-size: 12px;
            margin-bottom: 6px;
          }
          .security-notice p {
            margin: 0;
            font-size: 12px;
            color: #78350F;
          }
          
          /* Footer - Brand colors */
          .footer { 
            background: linear-gradient(135deg, #F8FAFC 0%, #F2F4F7 100%);
            padding: 20px; 
            text-align: center;
          }
          .footer-content {
            border-top: 1px solid #E5E7EB;
            padding-top: 16px;
          }
          .footer p {
            margin: 6px 0;
            color: #6B7280; 
            font-size: 12px; 
            line-height: 1.5;
          }
          .footer-contact {
            margin-top: 12px;
            padding: 12px;
            background: rgba(58, 125, 255, 0.05);
            border-radius: 6px;
            display: inline-block;
          }
          .footer-contact p {
            margin: 3px 0;
            color: #4B4B4B;
            font-size: 12px;
          }
          .footer-contact a {
            color: #3A7DFF;
            text-decoration: none;
            font-weight: 600;
          }
          .footer-brand {
            margin-top: 12px;
            font-weight: 600;
            color: #3A7DFF;
            font-size: 14px;
          }
          
          /* Responsive */
          @media only screen and (max-width: 600px) {
            .content { padding: 20px 16px; }
            .header { padding: 24px 16px; }
            .header h1 { font-size: 20px; }
            .btn { padding: 10px 20px; font-size: 13px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>Your Event-i Account</h1>
              <p>Login credentials for order #${orderNumber}</p>
            </div>
            
            <!-- Content -->
            <div class="content">
              <div class="greeting">Hi ${firstName},</div>
              
              <p class="intro-text">
                We've created an account for you. Use these credentials to access your tickets and event information.
              </p>
              
              <!-- Login Credentials -->
              <div class="credentials-box">
                <h3>
                  <span>Login Details</span>
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
                  <span>Security</span>
                </div>
                <p>Please change this temporary password when you log in.</p>
              </div>
              
              <!-- CTA Button -->
              <div class="btn-container">
                <a href="${loginUrl}" class="btn">Log In</a>
              </div>
              
              <!-- Quick Tips -->
              <div class="tips-box">
                <h3>What's Included</h3>
                <ul>
                  <li>Ticket access with QR codes</li>
                  <li>Event reminders</li>
                  <li>Order history</li>
                </ul>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="footer-content">
                <div class="footer-contact">
                  <p><strong>Support</strong></p>
                  <p><a href="mailto:gideonyuri15@gmail.com">gideonyuri15@gmail.com</a></p>
                  <p><a href="tel:+254703328938">+254 703 328 938</a></p>
                </div>
                
                <p style="margin-top: 24px;">Account created for order #${orderNumber}</p>
                <p>If you didn't make this purchase, contact us immediately.</p>
                
                <div class="footer-brand">Event-i</div>
                <p style="margin-top: 4px;">© ${new Date().getFullYear()}</p>
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
        html,
        headers: this.getSecurityHeaders(),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Account creation email sent:", result.messageId);
      return result;
    } catch (error) {
      console.error("❌ Error sending account creation email:", error);
      throw error;
    }
  }

  /**
   * Send ticket email with QR codes after successful payment
   */
  async sendTicketEmail({ order, tickets, customerEmail, customerName }) {
    try {
      const colors = getBrandColors();

      // Prepare attachments array for QR code images
      const attachments = [];

      // Generate ticket HTML rows with QR code references
      const ticketRows = tickets
        .map((ticket, index) => {
          const event = ticket.eventId;
          const eventDate = event?.dates?.startDate
            ? new Date(event.dates.startDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Date TBD";

          // Format location
          let locationText = "TBD";
          if (event?.location) {
            if (typeof event.location === "string") {
              locationText = event.location;
            } else {
              const parts = [];
              if (event.location.venueName)
                parts.push(event.location.venueName);
              if (event.location.address) parts.push(event.location.address);
              if (event.location.city) parts.push(event.location.city);
              locationText = parts.length > 0 ? parts.join(", ") : "TBD";
            }
          }

          // Generate unique Content-ID for this ticket's QR code
          const qrCid = `ticket-qr-${ticket._id || index}`;

          // Convert base64 data URL to Buffer and add as attachment
          if (ticket.qrCodeUrl) {
            try {
              // Extract base64 data from data URL (format: "data:image/png;base64,<base64-data>")
              const base64Match = ticket.qrCodeUrl.match(/^data:image\/(\w+);base64,(.+)$/);
              if (base64Match) {
                const imageType = base64Match[1] || "png";
                const base64Data = base64Match[2];
                
                // Convert base64 to Buffer
                const imageBuffer = Buffer.from(base64Data, "base64");
                
                // Add as inline attachment with Content-ID
                attachments.push({
                  filename: `qr-${ticket.ticketNumber || index}.${imageType}`,
                  content: imageBuffer,
                  contentType: `image/${imageType}`,
                  cid: qrCid, // Content-ID for inline embedding
                });
              }
            } catch (qrError) {
              console.error(`Error processing QR code for ticket ${ticket.ticketNumber}:`, qrError);
            }
          }

          return `
          <div class="card" style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; color: ${
              colors.primary
            }; font-size: 14px; font-weight: 700;">
              ${ticket.ticketNumber}
            </h3>
            <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: ${
              colors.text
            };">
              ${event?.title || "Event"}
            </p>
            <p style="margin: 0 0 12px 0; color: ${
              colors.textSecondary
            }; font-size: 13px;">
              ${ticket.ticketType}
            </p>
            
            <div style="background: ${
              colors.backgroundLight
            }; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid ${
            colors.border
          };">
              <p style="margin: 4px 0; color: ${
                colors.textSecondary
              }; font-size: 12px;"><strong>Date:</strong> ${eventDate}</p>
              <p style="margin: 4px 0; color: ${
                colors.textSecondary
              }; font-size: 12px;"><strong>Venue:</strong> ${locationText}</p>
              <p style="margin: 4px 0; color: ${
                colors.textSecondary
              }; font-size: 12px;"><strong>Attendee:</strong> ${
            ticket.holder?.firstName || ""
          } ${ticket.holder?.lastName || ""}</p>
            </div>
            
            <div style="text-align: center; background: ${
              colors.backgroundLight
            }; padding: 16px; border-radius: 6px; border: 1px solid ${
            colors.border
          };">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: ${
                colors.text
              }; font-size: 13px;">Entry QR Code</p>
              ${
                ticket.qrCodeUrl
                  ? `<img src="cid:${qrCid}" alt="QR Code for ${ticket.ticketNumber}" style="max-width: 180px; border: 2px solid ${colors.primary}; border-radius: 6px; padding: 8px; background: white; display: block; margin: 0 auto;" />`
                  : `<p style="color: ${colors.textMuted}; font-size: 12px;">QR Code pending</p>`
              }
              <p style="margin: 12px 0 0 0; font-size: 11px; color: ${
                colors.textMuted
              };">
                Show this code at the entrance
              </p>
            </div>
          </div>
        `;
        })
        .join("");

      const frontendUrl =
        process.env.FRONTEND_URL ||
        process.env.CLIENT_URL ||
        process.env.BASE_URL ||
        "https://event-i.co.ke";

      // Build content using branding functions
      const content = `
        ${getEmailHeader(
          "🎫 Your Event Tickets",
          `Order #${order.orderNumber}`
        )}
        
        <div class="content">
          <div class="greeting">Hi ${customerName},</div>
          
          <p class="intro-text">
            Your tickets are attached below. Present the QR code at the event entrance for entry.
          </p>
          
          <div class="card">
            <h3 style="margin: 0 0 12px 0; color: ${
              colors.primary
            }; font-size: 16px; font-weight: 700;">
              Order Details
            </h3>
            <p style="margin: 4px 0; color: ${
              colors.textSecondary
            }; font-size: 13px;">
              <strong>Order #:</strong> ${order.orderNumber}
            </p>
            ${
              order.payment?.mpesaReceiptNumber
                ? `<p style="margin: 4px 0; color: ${colors.textSecondary}; font-size: 13px;">
                    <strong>M-PESA Receipt:</strong> ${order.payment.mpesaReceiptNumber}
                   </p>`
                : ""
            }
            <p style="margin: 4px 0; color: ${
              colors.textSecondary
            }; font-size: 13px;">
              <strong>Amount Paid:</strong> ${
                order.pricing?.currency || "KES"
              } ${(
        order.totalAmount ||
        order.pricing?.total ||
        0
      ).toLocaleString()}
            </p>
            <p style="margin: 4px 0; color: ${
              colors.textSecondary
            }; font-size: 13px;">
              <strong>Tickets:</strong> ${tickets.length} × ${
        tickets[0]?.ticketType || "Ticket"
      }
            </p>
          </div>
          
          <h2 style="color: ${
            colors.primary
          }; margin: 24px 0 16px 0; font-size: 18px; font-weight: 700;">
            Your Tickets
          </h2>
          
          ${ticketRows}
          
          <div class="highlight-box">
            <h4>Entry Instructions</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: ${
              colors.textSecondary
            }; line-height: 1.8;">
              <li>Present your QR code at the entrance</li>
              <li>Have your ticket number ready as backup</li>
              <li>Each ticket allows one entry</li>
              <li>Arrive on time for the best experience</li>
            </ul>
          </div>
          
          <div class="btn-container">
            <a href="${frontendUrl}/wallet" class="btn">
              View Tickets Online
            </a>
          </div>
          
          <p class="intro-text" style="margin-top: 24px;">
            Questions about your tickets? Contact our support team using the details below.
          </p>
        </div>
        
        ${getEmailFooter()}
      `;

      const html = wrapEmailTemplate(
        content,
        `Your Tickets - Order #${order.orderNumber}`
      );

      const mailOptions = {
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `Your Tickets - Order #${order.orderNumber}`,
        html,
        attachments: attachments.length > 0 ? attachments : undefined,
        headers: this.getSecurityHeaders(),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Ticket email sent with ${attachments.length} QR code(s):`, result.messageId);
      return result;
    } catch (error) {
      console.error("❌ Error sending ticket email:", error);
      throw error;
    }
  }
}

module.exports = new EmailService();
