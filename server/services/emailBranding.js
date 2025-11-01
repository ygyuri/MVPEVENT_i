/**
 * Email Branding Helper
 * Provides consistent branding, colors, and styling for all Event-i emails
 */

const getBrandColors = () => ({
  primary: "#4f0f69",
  secondary: "#6b1a8a",
  primaryLight: "#6b1a8a",
  gradient: "linear-gradient(135deg, #4f0f69 0%, #6b1a8a 100%)",
  text: "#1A1A1A",
  textSecondary: "#4B4B4B",
  textMuted: "#6B7280",
  background: "#FFFFFF",
  backgroundLight: "#F9FAFB",
  border: "#E5E7EB",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#EF4444",
});

const getEmailBaseStyles = () => {
  const colors = getBrandColors();
  return `
    <style>
      /* Reset styles */
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: ${colors.text};
        background-color: ${colors.backgroundLight};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Container */
      .email-wrapper {
        width: 100%;
        background-color: ${colors.backgroundLight};
        padding: 20px 0;
      }
      
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: ${colors.background};
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      /* Header with logo and brand colors */
      .header {
        background: ${colors.gradient};
        color: #FFFFFF;
        padding: 32px 24px;
        text-align: center;
      }
      
      .logo {
        max-width: 180px;
        height: auto;
        margin-bottom: 16px;
      }
      
      .header h1 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: #FFFFFF;
      }
      
      .header p {
        margin: 0;
        font-size: 14px;
        opacity: 0.95;
        font-weight: 400;
        color: #FFFFFF;
      }
      
      /* Content area */
      .content {
        padding: 32px 24px;
        background: ${colors.background};
      }
      
      .greeting {
        font-size: 16px;
        font-weight: 600;
        color: ${colors.text};
        margin-bottom: 16px;
      }
      
      .intro-text {
        font-size: 14px;
        color: ${colors.textSecondary};
        margin-bottom: 20px;
        line-height: 1.7;
      }
      
      /* Cards and boxes */
      .card {
        background: ${colors.backgroundLight};
        border: 1px solid ${colors.border};
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      
      .card h3 {
        margin: 0 0 12px 0;
        color: ${colors.primary};
        font-size: 16px;
        font-weight: 700;
      }
      
      /* Buttons */
      .btn {
        display: inline-block;
        padding: 14px 32px;
        background: ${colors.gradient};
        color: #FFFFFF;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(79, 15, 105, 0.3);
        transition: all 0.3s ease;
      }
      
      .btn:hover {
        box-shadow: 0 6px 16px rgba(79, 15, 105, 0.4);
      }
      
      .btn-secondary {
        background: ${colors.textMuted};
        box-shadow: 0 4px 12px rgba(107, 114, 128, 0.2);
      }
      
      .btn-container {
        text-align: center;
        margin: 24px 0;
      }
      
      /* Badges and highlights */
      .badge {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        margin: 8px 4px;
      }
      
      .badge-success {
        background: ${colors.success};
        color: #FFFFFF;
      }
      
      .badge-warning {
        background: ${colors.warning};
        color: #FFFFFF;
      }
      
      .highlight-box {
        background: rgba(79, 15, 105, 0.05);
        border-left: 4px solid ${colors.primary};
        border-radius: 8px;
        padding: 16px;
        margin: 20px 0;
      }
      
      .highlight-box h4 {
        margin: 0 0 12px 0;
        color: ${colors.primary};
        font-size: 14px;
        font-weight: 700;
      }
      
      /* Footer */
      .footer {
        background: ${colors.backgroundLight};
        padding: 24px;
        text-align: center;
        border-top: 1px solid ${colors.border};
      }
      
      .footer p {
        margin: 6px 0;
        color: ${colors.textMuted};
        font-size: 12px;
        line-height: 1.6;
      }
      
      .footer-brand {
        margin-top: 16px;
        font-weight: 700;
        color: ${colors.primary};
        font-size: 16px;
      }
      
      .footer-logo {
        max-width: 120px;
        height: auto;
        margin: 12px 0;
      }
      
      /* Table styles */
      .table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
      }
      
      .table th,
      .table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid ${colors.border};
      }
      
      .table th {
        background: ${colors.backgroundLight};
        font-weight: 600;
        color: ${colors.text};
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .table td {
        font-size: 14px;
        color: ${colors.textSecondary};
      }
      
      /* Responsive */
      @media only screen and (max-width: 600px) {
        .content {
          padding: 24px 16px;
        }
        .header {
          padding: 24px 16px;
        }
        .header h1 {
          font-size: 20px;
        }
        .btn {
          padding: 12px 24px;
          font-size: 13px;
        }
      }
    </style>
  `;
};

const getEmailHeader = (title, subtitle = "") => {
  const frontendUrl = process.env.FRONTEND_URL || "https://event-i.co.ke";
  // Use dark mode logo (white logo) for purple gradient background
  const logoUrl = `${frontendUrl}/logos/event-i_dark_mode_logo.png`;

  return `
    <div class="header">
      <img src="${logoUrl}" alt="Event-i Logo" class="logo" style="max-width: 180px; height: auto; margin-bottom: 16px;" />
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
  `;
};

const getEmailFooter = () => {
  const frontendUrl = process.env.FRONTEND_URL || "https://event-i.co.ke";
  const logoUrl = `${frontendUrl}/logos/event-i_light_mode_logo.png`;
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.SMTP_USER ||
    "support@event-i.co.ke";
  const supportPhone = process.env.SUPPORT_PHONE || "+254 703 328 938";

  return `
    <div class="footer">
      <img src="${logoUrl}" alt="Event-i" class="footer-logo" style="max-width: 120px; height: auto; margin: 12px 0;" />
      <div class="footer-brand">Event-i</div>
      <p>Your trusted event management platform</p>
      <p style="margin-top: 12px;">
        <strong>Support:</strong><br>
        <a href="mailto:${supportEmail}" style="color: #4f0f69; text-decoration: none;">${supportEmail}</a><br>
        <a href="tel:${supportPhone}" style="color: #4f0f69; text-decoration: none;">${supportPhone}</a>
      </p>
      <p style="margin-top: 16px;">
        <a href="${frontendUrl}" style="color: #4f0f69; text-decoration: none; font-weight: 600;">Visit Website</a> |
        <a href="${frontendUrl}/preferences/reminders" style="color: #4f0f69; text-decoration: none; font-weight: 600;">Manage Preferences</a>
      </p>
      <p style="margin-top: 16px; font-size: 11px;">
        © ${new Date().getFullYear()} Event-i. All rights reserved.
      </p>
      <p style="font-size: 11px; margin-top: 8px;">
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  `;
};

const wrapEmailTemplate = (content, title = "Event-i") => {
  const frontendUrl = process.env.FRONTEND_URL || "https://event-i.co.ke";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title}</title>
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
      </style>
      <![endif]-->
      ${getEmailBaseStyles()}
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          ${content}
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  getBrandColors,
  getEmailBaseStyles,
  getEmailHeader,
  getEmailFooter,
  wrapEmailTemplate,
};
