/**
 * Email provider for bulk communications.
 * Uses Nodemailer with SMTP from env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
 * Throws on failure so queue can retry.
 */

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

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
 * Wrap body in a minimal HTML document for consistent rendering (charset, viewport, basic styles).
 */
function wrapHtmlBody(bodyHtml) {
  let body = (bodyHtml || "").trim();
  if (!body) return "<p></p>";
  // If already a full document, return as-is
  if (/^\s*<!DOCTYPE/i.test(body) || /^\s*<html/i.test(body)) return body;
  // Plain text: escape HTML and convert newlines to <br>
  if (!/<[a-z]/i.test(body)) {
    body = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>\n");
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event-i</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 1rem; }
    p { margin: 0 0 1rem; }
    a { color: #2563eb; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
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

  const html = wrapHtmlBody(bodyHtml);
  const mailOptions = {
    from,
    to,
    subject: subject || "(No subject)",
    html,
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
