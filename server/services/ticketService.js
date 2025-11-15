const crypto = require('crypto');
const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

const DEFAULT_TTL_MS = parseInt(process.env.TICKET_QR_TTL_MS || '900000', 10);
// Use TICKET_QR_SECRET (matches original implementation used for production tickets)
const QR_SECRET = process.env.TICKET_QR_SECRET || 'change-me-in-production';
const AUTO_ROTATE_MS = parseInt(process.env.TICKET_QR_AUTO_ROTATE_MS || '0', 10); // 0 disables
const ENC_KEY_B64 = process.env.TICKET_QR_ENC_KEY || '';

function base64UrlEncode(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecodeToBuffer(str) {
  const pad = 4 - (str.length % 4);
  const padded = str + (pad < 4 ? '='.repeat(pad) : '');
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payloadString) {
  return crypto.createHmac('sha256', QR_SECRET).update(payloadString).digest('hex');
}

// ——— OLD Format Encryption/Decryption (AES-256-CBC) ———
// Matches the format used in payhero.js for production tickets

/**
 * Encrypt QR payload using AES-256-CBC (OLD format)
 * @param {Object} payload - Payload object to encrypt
 * @param {string} secret - Encryption secret (defaults to QR_SECRET)
 * @returns {string} Encrypted string in format "iv_hex:encrypted_hex"
 */
function encryptQrPayloadOldFormat(payload, secret = QR_SECRET) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secret, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Combine IV and encrypted data: "iv_hex:encrypted_hex"
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt QR payload from OLD format (AES-256-CBC)
 * @param {string} encryptedData - Encrypted string in format "iv_hex:encrypted_hex"
 * @param {string} secret - Encryption secret (defaults to QR_SECRET)
 * @returns {Object|null} Decrypted payload object or null on error
 */
function decryptQrPayloadOldFormat(encryptedData, secret = QR_SECRET) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
      return null;
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      return null;
    }

    const ivHex = parts[0];
    const encryptedHex = parts[1];
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = crypto.scryptSync(secret, 'salt', 32);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    return null;
  }
}

function compactQrPayload(obj) {
  // Minimal compact JSON to keep string short
  const json = JSON.stringify(obj);
  return base64UrlEncode(json);
}

function parseQrPayloadToJson(compact) {
  const buf = base64UrlDecodeToBuffer(compact);
  const json = buf.toString('utf8');
  return JSON.parse(json);
}

class TicketService {
  async issueQr(ticketId, { rotate = false, ttlMs = DEFAULT_TTL_MS } = {}) {
    const ticket = await Ticket.findById(ticketId).populate('eventId', 'qrSettings');
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const now = Date.now();
    const shouldIssue = rotate || !ticket.qr?.nonce || !ticket.qr?.signature || (ticket.qr?.expiresAt && new Date(ticket.qr.expiresAt).getTime() < now);

    const issuedAt = new Date();
    const perEventTtl = ticket.eventId?.qrSettings?.ttlMs && Number(ticket.eventId.qrSettings.ttlMs) > 0
      ? Number(ticket.eventId.qrSettings.ttlMs)
      : ttlMs;
    const expiresAt = new Date(issuedAt.getTime() + perEventTtl);
    const nonce = shouldIssue ? crypto.randomBytes(16).toString('hex') : ticket.qr.nonce;

    // Generate OLD format payload (matching payhero.js)
    const qrPayload = {
      ticketId: ticket._id.toString(),
      eventId: ticket.eventId._id.toString(),
      userId: ticket.ownerUserId ? ticket.ownerUserId.toString() : '',
      ticketNumber: ticket.ticketNumber || '',
      timestamp: issuedAt.getTime(),
    };

    // Encrypt using AES-256-CBC (OLD format)
    const encryptedQRData = encryptQrPayloadOldFormat(qrPayload, QR_SECRET);

    // Generate QR code image as base64 data URL
    const qrCodeDataURL = await QRCode.toDataURL(encryptedQRData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    // Calculate signature (HMAC-SHA256 of encryptedQRData, not the payload)
    const signature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(encryptedQRData)
      .digest('hex');

    // Update ticket with QR code data
    ticket.qrCode = encryptedQRData;
    ticket.qrCodeUrl = qrCodeDataURL;
    ticket.qr = {
      nonce,
      issuedAt,
      expiresAt,
      signature
    };

    await ticket.save();

    return {
      qr: encryptedQRData,
      qrCodeUrl: qrCodeDataURL,
      expiresAt
    };
  }

  async verifyQr(compactQrString) {
    try {
      // OLD format: AES-256-CBC encrypted "iv:encrypted" format
      // Check if input contains ':' which indicates OLD format
      if (!compactQrString || typeof compactQrString !== 'string') {
        return { ok: false, code: 'INVALID_QR' };
      }

      // Decrypt OLD format
      const qrPayload = decryptQrPayloadOldFormat(compactQrString, QR_SECRET);
      
      if (!qrPayload || !qrPayload.ticketId) {
        return { ok: false, code: 'INVALID_QR' };
      }

      const { ticketId, eventId, userId, ticketNumber, timestamp } = qrPayload;

      // Look up ticket
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return { ok: false, code: 'TICKET_NOT_FOUND' };
      }

      // Verify stored QR code matches scanned string
      if (ticket.qrCode !== compactQrString) {
        return { ok: false, code: 'INVALID_QR' };
      }

      // Verify signature if stored
      if (ticket.qr?.signature) {
        const expectedSignature = crypto
          .createHmac('sha256', QR_SECRET)
          .update(compactQrString)
          .digest('hex');
        
        if (ticket.qr.signature !== expectedSignature) {
          return { ok: false, code: 'INVALID_QR' };
        }
      }

      // Check ticket status
      if (ticket.status !== 'active') {
        return { ok: false, code: 'TICKET_NOT_ACTIVE', ticketStatus: ticket.status };
      }

      // Check expiration
      if (ticket.qr?.expiresAt && new Date(ticket.qr.expiresAt).getTime() < Date.now()) {
        return { ok: false, code: 'QR_EXPIRED' };
      }

      // Check validity window
      const now = new Date();
      if (ticket.metadata?.validFrom && now < new Date(ticket.metadata.validFrom)) {
        return { ok: false, code: 'TICKET_OUT_OF_VALIDITY_WINDOW' };
      }
      if (ticket.metadata?.validUntil && now > new Date(ticket.metadata.validUntil)) {
        return { ok: false, code: 'TICKET_OUT_OF_VALIDITY_WINDOW' };
      }

      const event = await Event.findById(ticket.eventId).select('organizer title dates');
      return { ok: true, ticket, event };
    } catch (e) {
      console.error('❌ QR verification error:', e.message);
      return { ok: false, code: 'INVALID_QR' };
    }
  }

  async markUsed(ticket, user, { location } = {}) {
    // Atomic state transition to prevent double-use race conditions
    const now = new Date();
    const updateResult = await Ticket.updateOne(
      { _id: ticket._id, status: 'active' },
      {
        $set: { status: 'used', usedAt: now, usedBy: user._id },
        $push: { scanHistory: { scannedAt: now, scannedBy: user._id, location, result: 'success' } }
      }
    );

    if (updateResult && updateResult.modifiedCount === 1) {
      const updated = await Ticket.findById(ticket._id).select('status usedAt usedBy holder ticketType eventId');
      return { alreadyUsed: false, ticket: updated };
    }

    // If not modified, either already used or not active. Log attempt and return alreadyUsed
    await Ticket.updateOne(
      { _id: ticket._id },
      { $push: { scanHistory: { scannedAt: now, scannedBy: user._id, location, result: 'already_used' } } }
    );
    const updated = await Ticket.findById(ticket._id).select('status usedAt usedBy holder ticketType eventId');
    return { alreadyUsed: true, ticket: updated };
  }

  async getUserTickets(userId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      Ticket.find({ ownerUserId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('eventId', 'title dates location'),
      Ticket.countDocuments({ ownerUserId: userId })
    ]);

    return {
      tickets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }
}

module.exports = new TicketService();

// Optional auto-rotation job
if (AUTO_ROTATE_MS > 0) {
  const svc = module.exports;
  const Ticket = require('../models/Ticket');
  setInterval(async () => {
    try {
      const soon = new Date(Date.now() + Math.max(DEFAULT_TTL_MS / 2, 60000));
      const expiring = await Ticket.find({ 'qr.expiresAt': { $lte: soon }, status: 'active' }).select('_id');
      for (const t of expiring) {
        await svc.issueQr(t._id, { rotate: true });
      }
    } catch (e) {
      // swallow to avoid crashing
    }
  }, AUTO_ROTATE_MS).unref();
}

// ——— Encryption helpers (optional) ———
function getEncryptionKeyBuffer() {
  if (!ENC_KEY_B64) return null;
  try {
    const key = Buffer.from(ENC_KEY_B64, 'base64');
    if (key.length !== 32) return null; // must be 256-bit
    return key;
  } catch {
    return null;
  }
}

function maybeEncryptPayload(obj) {
  const key = getEncryptionKeyBuffer();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `E1.${base64UrlEncode(iv)}.${base64UrlEncode(ciphertext)}.${base64UrlEncode(tag)}`;
}

function maybeDecryptPayload(s) {
  if (!s || typeof s !== 'string' || !s.startsWith('E1.')) return null;
  const key = getEncryptionKeyBuffer();
  if (!key) return null; // cannot decrypt without key
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  const iv = base64UrlDecodeToBuffer(parts[1]);
  const ciphertext = base64UrlDecodeToBuffer(parts[2]);
  const tag = base64UrlDecodeToBuffer(parts[3]);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    return null;
  }
}


