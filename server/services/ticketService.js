const crypto = require('crypto');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

const DEFAULT_TTL_MS = parseInt(process.env.TICKET_QR_TTL_MS || '900000', 10);
const SECRET = process.env.TICKET_QR_SECRET || 'change-me-in-production';
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
  return crypto.createHmac('sha256', SECRET).update(payloadString).digest('hex');
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

    const payloadToSign = `${ticket._id.toString()}.${issuedAt.getTime()}.${nonce}.1`;
    const signature = sign(payloadToSign);

    ticket.qr = {
      nonce,
      issuedAt,
      expiresAt,
      signature
    };
    await ticket.save();

    const qrObj = {
      tid: ticket._id.toString(),
      ts: issuedAt.getTime(),
      nonce,
      v: 1,
      sig: signature
    };

    // Optionally encrypt payload (AES-256-GCM). Backward compatible if key absent.
    const encrypted = maybeEncryptPayload(qrObj);

    return {
      qr: encrypted || compactQrPayload(qrObj),
      expiresAt
    };
  }

  async verifyQr(compactQrString) {
    try {
      // Supports both plaintext compact JSON or encrypted format prefixed with E1.
      const data = maybeDecryptPayload(compactQrString) || parseQrPayloadToJson(compactQrString);
      const { tid, ts, nonce, v, sig } = data || {};
      if (!tid || !ts || !nonce || !v || !sig) {
        return { ok: false, code: 'INVALID_QR' };
      }

      const expected = sign(`${tid}.${ts}.${nonce}.${v}`);
      if (expected !== sig) {
        return { ok: false, code: 'INVALID_QR' };
      }

      const ticket = await Ticket.findById(tid);
      if (!ticket) {
        return { ok: false, code: 'TICKET_NOT_FOUND' };
      }

      // Ensure stored meta matches
      if (!ticket.qr || ticket.qr.nonce !== nonce || ticket.qr.signature !== sig) {
        return { ok: false, code: 'INVALID_QR' };
      }

      if (ticket.qr.expiresAt && new Date(ticket.qr.expiresAt).getTime() < Date.now()) {
        return { ok: false, code: 'QR_EXPIRED' };
      }

      const event = await Event.findById(ticket.eventId).select('organizer title dates');
      return { ok: true, ticket, event };
    } catch (e) {
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


