/**
 * Abstract sending service for bulk communications.
 * Dispatches to email, SMS, or WhatsApp provider based on `provider`.
 * Extensible: add smsProvider and whatsappProvider later.
 */

const emailProvider = require("./emailProvider");

const PROVIDERS = {
  email: "email",
  sms: "sms",
  whatsapp: "whatsapp",
};

/**
 * Send a message via the specified provider.
 * @param {Object} opts
 * @param {string} opts.to - Email address or phone (depending on provider)
 * @param {string} [opts.subject] - Subject (email only)
 * @param {string} [opts.bodyHtml] - HTML body (email)
 * @param {string} [opts.body] - Plain text (SMS/WhatsApp)
 * @param {Array<{ filename, path, contentType? }>} [opts.attachments] - File refs (email)
 * @param {Array<{ cid, filename, path, contentType? }>} [opts.inlineImages] - Inline images for body (CID)
 * @param {string} [opts.provider='email'] - 'email' | 'sms' | 'whatsapp'
 * @returns {Promise<{ messageId?: string }>}
 */
async function send(opts) {
  const provider = (opts.provider || "email").toLowerCase();
  if (provider === PROVIDERS.email) {
    return emailProvider.sendEmail({
      to: opts.to,
      subject: opts.subject,
      bodyHtml: opts.bodyHtml,
      attachments: opts.attachments,
      inlineImages: opts.inlineImages,
    });
  }
  if (provider === PROVIDERS.sms) {
    // TODO: Twilio smsProvider.sendSms(opts)
    throw new Error("SMS provider not implemented yet");
  }
  if (provider === PROVIDERS.whatsapp) {
    // TODO: whatsappProvider.send(opts)
    throw new Error("WhatsApp provider not implemented yet");
  }
  throw new Error(`Unknown provider: ${provider}`);
}

module.exports = { send, PROVIDERS };
