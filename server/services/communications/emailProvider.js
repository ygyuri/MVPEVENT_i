/**
 * Email provider for bulk communications.
 * Uses Nodemailer with SMTP from env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
 * Throws on failure so queue can retry.
 */

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const templateService = require("./templateService");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const isSecure = smtpPort === 465;
  transporter = nodemailer.createTransport({
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
  return transporter;
}

/**
 * Wrap body in premium shell (table-based layout) and get plain text. Uses templateService.
 */
function wrapWithTemplate(bodyHtml) {
  const { html, text } = templateService.wrapInPremiumShell({
    bodyHtml,
    logoUrl: process.env.EMAIL_LOGO_URL,
    unsubscribeUrl: process.env.EMAIL_UNSUBSCRIBE_URL || process.env.APP_URL,
    viewInBrowserUrl: process.env.APP_URL,
  });
  return { html, text };
}

/**
 * Send a single email.
 * @param {Object} opts - { to, subject, bodyHtml, attachments?: [...], inlineImages?: [{ cid, filename, path, contentType? }] }
 * @returns {Promise<{ messageId }>}
 * @throws on send failure
 */
async function sendEmail(opts) {
  const { to, subject, bodyHtml, attachments: attachmentRefs = [], inlineImages: inlineRefs = [] } = opts;
  const transport = getTransporter();
  const from = `"Event-i" <${process.env.SMTP_USER}>`;

  const attachments = [];
  for (const ref of attachmentRefs) {
    const filePath = ref.path && path.isAbsolute(ref.path) ? ref.path : path.join(process.cwd(), ref.path);
    if (fs.existsSync(filePath)) {
      attachments.push({
        filename: ref.filename,
        content: fs.readFileSync(filePath),
        contentType: ref.contentType || "application/octet-stream",
      });
    } else {
      console.warn("📎 [EMAIL] Attachment file not found, skipping:", { filename: ref.filename, path: ref.path, resolved: filePath });
    }
  }
  for (const ref of inlineRefs) {
    const filePath = ref.path && path.isAbsolute(ref.path) ? ref.path : path.join(process.cwd(), ref.path);
    if (fs.existsSync(filePath)) {
      attachments.push({
        filename: ref.filename,
        content: fs.readFileSync(filePath),
        contentType: ref.contentType || "image/jpeg",
        cid: ref.cid,
      });
    } else {
      console.warn("📎 [EMAIL] Inline image not found, skipping:", { cid: ref.cid, filename: ref.filename, path: ref.path });
    }
  }
  if (attachmentRefs.length > 0 || inlineRefs.length > 0) {
    console.log("📎 [EMAIL] Attachments:", attachmentRefs.length, "refs | Inline images:", inlineRefs.length, "refs,", attachments.length, "total attached");
  }

  const { html, text } = wrapWithTemplate(bodyHtml);
  const mailOptions = {
    from,
    to,
    subject: subject || "(No subject)",
    html,
    text,
    attachments: attachments.length ? attachments : undefined,
    headers: {
      "X-Mailer": "Event-i Bulk Communications",
      "X-Auto-Response-Suppress": "All",
      Precedence: "bulk",
    },
  };

  const result = await transport.sendMail(mailOptions);
  if (!result.messageId) throw new Error("Send returned no messageId");
  return { messageId: result.messageId };
}

module.exports = { sendEmail, getTransporter };
