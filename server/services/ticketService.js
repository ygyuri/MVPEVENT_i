const crypto = require('crypto');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

const DEFAULT_TTL_MS = parseInt(process.env.TICKET_QR_TTL_MS || '900000', 10);
const SECRET = process.env.TICKET_QR_SECRET || 'change-me-in-production';
const AUTO_ROTATE_MS = parseInt(process.env.TICKET_QR_AUTO_ROTATE_MS || '0', 10); // 0 disables

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
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const now = Date.now();
    const shouldIssue = rotate || !ticket.qr?.nonce || !ticket.qr?.signature || (ticket.qr?.expiresAt && new Date(ticket.qr.expiresAt).getTime() < now);

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + ttlMs);
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

    return {
      qr: compactQrPayload(qrObj),
      expiresAt
    };
  }

  async verifyQr(compactQrString) {
    try {
      const data = parseQrPayloadToJson(compactQrString);
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
    if (ticket.status === 'used') {
      ticket.scanHistory = ticket.scanHistory || [];
      ticket.scanHistory.push({ scannedAt: new Date(), scannedBy: user._id, location, result: 'already_used' });
      await ticket.save();
      return { alreadyUsed: true };
    }

    ticket.status = 'used';
    ticket.usedAt = new Date();
    ticket.usedBy = user._id;
    ticket.scanHistory = ticket.scanHistory || [];
    ticket.scanHistory.push({ scannedAt: new Date(), scannedBy: user._id, location, result: 'success' });
    await ticket.save();
    return { alreadyUsed: false };
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


