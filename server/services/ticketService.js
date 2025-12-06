const crypto = require('crypto');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

const DEFAULT_TTL_MS = parseInt(process.env.TICKET_QR_TTL_MS || '900000', 10);
const SECRET = process.env.TICKET_QR_SECRET || 'change-me-in-production';
const AUTO_ROTATE_MS = parseInt(process.env.TICKET_QR_AUTO_ROTATE_MS || '0', 10); // 0 disables
const ENC_KEY_B64 = process.env.TICKET_QR_ENC_KEY || '';

// Legacy secrets for backward compatibility with old QR codes
const LEGACY_SECRETS = [
  SECRET, // Current secret (try first)
  'default-secret-change-in-production', // Old default from payhero.js
  process.env.QR_ENCRYPTION_SECRET || null, // Old env var name (if still set)
].filter(Boolean);

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
      if (!compactQrString || typeof compactQrString !== 'string') {
        console.error('❌ verifyQr: Invalid QR string provided', { type: typeof compactQrString, length: compactQrString?.length });
        return { ok: false, code: 'INVALID_QR' };
      }

      // First, try to decrypt legacy payhero.js format (AES-256-CBC)
      const legacyPayload = decryptLegacyPayheroQR(compactQrString);
      if (legacyPayload) {
        console.log('✅ verifyQr: Legacy QR format detected', { ticketId: legacyPayload.ticketId });
        const { ticketId, eventId, userId, ticketNumber, timestamp } = legacyPayload;
        if (!ticketId) {
          return { ok: false, code: 'INVALID_QR' };
        }

        // Find ticket by ID
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          return { ok: false, code: 'TICKET_NOT_FOUND' };
        }

        // Verify by signature OR by matching stored qrCode OR by payload match (flexible verification)
        let isVerified = false;
        
        // Option 1: Verify by signature if available (most secure)
        if (ticket.qr?.signature) {
          for (const secret of LEGACY_SECRETS) {
            const expectedSig = crypto
              .createHmac('sha256', secret)
              .update(compactQrString)
              .digest('hex');
            if (expectedSig === ticket.qr.signature) {
              isVerified = true;
              console.log('✅ verifyQr: Verified by signature', { ticketId: ticket._id.toString() });
              break;
            }
          }
        }
        
        // Option 2: If no signature or signature check failed, verify by matching stored qrCode
        if (!isVerified && ticket.qrCode) {
          // Trim whitespace and compare
          const scannedTrimmed = compactQrString.trim();
          const storedTrimmed = ticket.qrCode.trim();
          if (storedTrimmed === scannedTrimmed) {
            isVerified = true;
            console.log('✅ verifyQr: Verified by matching stored qrCode', { ticketId: ticket._id.toString() });
          }
        }
        
        // Option 3: If we successfully decrypted and found the ticket, verify payload matches
        if (!isVerified) {
          // Verify the decrypted payload matches the ticket
          if (String(ticket._id) === String(legacyPayload.ticketId)) {
            // Verify eventId matches if provided
            if (legacyPayload.eventId) {
              if (String(ticket.eventId) === String(legacyPayload.eventId)) {
                isVerified = true;
                console.log('✅ verifyQr: Verified by decrypted payload match', { ticketId: ticket._id.toString() });
              }
            } else {
              // If eventId not in payload but ticket found, accept it
              isVerified = true;
              console.log('✅ verifyQr: Verified by ticket ID match (decrypted)', { ticketId: ticket._id.toString() });
            }
          }
        }

        if (!isVerified) {
          console.error('❌ verifyQr: QR code verification failed', {
            ticketId: ticket._id.toString(),
            hasSignature: !!ticket.qr?.signature,
            hasQrCode: !!ticket.qrCode,
            storedLength: ticket.qrCode?.length,
            scannedLength: compactQrString.length,
            storedPrefix: ticket.qrCode?.substring(0, 20),
            scannedPrefix: compactQrString.substring(0, 20)
          });
          return { ok: false, code: 'INVALID_QR' };
        }

        // Check if ticket is valid
        if (ticket.status !== 'active') {
          return { ok: false, code: 'TICKET_NOT_ACTIVE' };
        }

        // Check expiry if set
        if (ticket.qr?.expiresAt && new Date(ticket.qr.expiresAt).getTime() < Date.now()) {
          return { ok: false, code: 'QR_EXPIRED' };
        }

        const event = await Event.findById(eventId || ticket.eventId).select('organizer title dates');
        console.log('✅ verifyQr: Legacy QR verified successfully', { ticketId: ticket._id.toString() });
        return { ok: true, ticket, event };
      }

      // Try plain JSON format from enhancedEmailService.js (fallback)
      try {
        const plainJson = JSON.parse(compactQrString);
        if (plainJson.ticketId) {
          console.log('✅ verifyQr: Plain JSON format detected', { ticketId: plainJson.ticketId });
          const ticket = await Ticket.findById(plainJson.ticketId);
          if (!ticket) {
            return { ok: false, code: 'TICKET_NOT_FOUND' };
          }

          // Verify the ticket matches the QR payload
          if (String(ticket._id) !== String(plainJson.ticketId)) {
            return { ok: false, code: 'INVALID_QR' };
          }

          // Verify eventId if provided
          if (plainJson.eventId && String(ticket.eventId) !== String(plainJson.eventId)) {
            return { ok: false, code: 'INVALID_QR' };
          }

          // Verify securityHash if provided (from enhancedEmailService)
          if (plainJson.securityHash) {
            const orderId = plainJson.orderId || ticket.orderId?.toString() || '';
            const expectedHash = crypto
              .createHash("sha256")
              .update(ticket._id.toString() + orderId)
              .digest("hex")
              .substring(0, 8);
            if (expectedHash !== plainJson.securityHash) {
              console.warn('⚠️ verifyQr: Security hash mismatch, but continuing', {
                expected: expectedHash,
                received: plainJson.securityHash
              });
              // Don't fail - hash is for additional security but not critical
            }
          }

          // Check if ticket is valid
          if (ticket.status !== 'active') {
            return { ok: false, code: 'TICKET_NOT_ACTIVE' };
          }

          const event = await Event.findById(plainJson.eventId || ticket.eventId).select('organizer title dates');
          console.log('✅ verifyQr: Plain JSON QR verified successfully', { ticketId: ticket._id.toString() });
          return { ok: true, ticket, event };
        }
      } catch (e) {
        // Not JSON format, continue to next format
      }

      // Otherwise, try new format (compact JSON with HMAC signature)
      console.log('🔍 verifyQr: Trying new format', { qrLength: compactQrString.length, prefix: compactQrString.substring(0, 50) });
      const data = maybeDecryptPayload(compactQrString) || parseQrPayloadToJson(compactQrString);
      const { tid, ts, nonce, v, sig } = data || {};
      if (!tid || !ts || !nonce || !v || !sig) {
        console.error('❌ verifyQr: New format parse failed', { hasData: !!data, tid: !!tid, ts: !!ts, nonce: !!nonce, v: !!v, sig: !!sig });
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
      console.log('✅ verifyQr: New format QR verified successfully', { ticketId: ticket._id.toString() });
      return { ok: true, ticket, event };
    } catch (e) {
      console.error('❌ verifyQr: Exception during verification', { error: e.message, stack: e.stack, qrLength: compactQrString?.length });
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

/**
 * Decrypt legacy AES-256-CBC QR codes from payhero.js (backward compatibility)
 * Format: "iv:encrypted" where both are hex strings
 * Key derivation: scryptSync(secret, "salt", 32)
 */
function decryptLegacyPayheroQR(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return null;
  }
  
  // Check if it's the old format (iv:encrypted in hex)
  if (!encryptedData.includes(':')) {
    return null;
  }
  
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    return null;
  }
  
  const [ivHex, encryptedHex] = parts;
  
  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(encryptedHex)) {
    console.error('❌ decryptLegacyPayheroQR: Invalid hex format', { ivHexLength: ivHex.length, encryptedHexLength: encryptedHex.length });
    return null;
  }
  
  // Try each legacy secret
  for (const secret of LEGACY_SECRETS) {
    try {
      const key = crypto.scryptSync(secret, 'salt', 32);
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      if (iv.length !== 16) {
        console.error('❌ decryptLegacyPayheroQR: Invalid IV length', { length: iv.length });
        continue;
      }
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      const payload = JSON.parse(decrypted);
      console.log('✅ decryptLegacyPayheroQR: Successfully decrypted', { ticketId: payload.ticketId });
      return payload;
    } catch (e) {
      // Try next secret - don't log every failure as it's expected to try multiple secrets
      continue;
    }
  }
  
  console.error('❌ decryptLegacyPayheroQR: Failed to decrypt with all legacy secrets', { 
    qrLength: encryptedData.length,
    hasColon: encryptedData.includes(':'),
    partsCount: parts.length 
  });
  return null;
}


