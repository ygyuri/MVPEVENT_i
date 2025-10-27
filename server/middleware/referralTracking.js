const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const ReferralLink = require('../models/ReferralLink');
const ReferralClick = require('../models/ReferralClick');

const COOKIE_NAME = '_event_i_ref';

function getCookieKey() {
  const b64 = process.env.TICKET_QR_ENC_KEY || '';
  try {
    const key = Buffer.from(b64, 'base64');
    if (key.length === 32) return key;
  } catch (_) {}
  // Fallback deterministic key for dev/test (DO NOT USE IN PROD)
  return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'dev').digest();
}

function encryptCookieJson(obj) {
  const key = getCookieKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

function parseUserAgent(ua) {
  ua = (ua || '').toLowerCase();
  const isMobile = /mobile|android|iphone|ipad/.test(ua);
  const isTablet = /ipad|tablet/.test(ua);
  const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macos';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('iphone') || ua.includes('ios')) os = 'ios';
  return { device_type, browser, os };
}

function isBot(ua) {
  const s = (ua || '').toLowerCase();
  return /headless|puppeteer|bot|crawler|spider|httpclient/.test(s);
}

function referrerSuspicious(referrer) {
  if (!referrer) return false;
  const bad = ['://localhost', '://127.0.0.1', '://0.0.0.0'];
  return bad.some(x => referrer.includes(x));
}

function visitorFingerprint(ip, ua) {
  return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 40);
}

// Rate limiter: More lenient in development to avoid issues with hot reload
const clickLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 in dev, 100 in prod
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development on localhost
    return process.env.NODE_ENV !== 'production' &&
           (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  }
});

async function logClickAndSetCookie(req, res, next) {
  try {
    const { ref } = req.query;
    if (!ref) return next();

    const link = await ReferralLink.findOne({ referral_code: ref, status: 'active' });
    if (!link) return next();

    const ua = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress || '';
    const visitor_id = visitorFingerprint(ip, ua);
    const { device_type, browser, os } = parseUserAgent(ua);
    const referrer_url = req.get('referer') || req.get('referrer') || null;
    const landing_page_url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Duplicate click within 1 hour check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dup = await ReferralClick.findOne({ link_id: link._id, visitor_id, clicked_at: { $gt: oneHourAgo } });
    if (!dup && !isBot(ua) && !referrerSuspicious(referrer_url)) {
      await ReferralClick.create({
        link_id: link._id,
        event_id: link.event_id,
        affiliate_id: link.affiliate_id || null,
        agency_id: link.agency_id || null,
        visitor_id,
        user_id: req.user?._id || null,
        ip_address: ip,
        user_agent: ua,
        referrer_url,
        landing_page_url,
        country: 'ZZ',
        region: null,
        city: null,
        device_type,
        browser,
        os
      });
    }

    // Set cookie
    const expiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
    const payload = {
      ref_code: link.referral_code,
      affiliate_id: link.affiliate_id ? String(link.affiliate_id) : null,
      link_id: String(link._id),
      clicked_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    };
    const enc = encryptCookieJson(payload);
    res.cookie(COOKIE_NAME, enc, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    return next();
  } catch (e) {
    return next();
  }
}

module.exports = { logClickAndSetCookie, clickLimiter };


