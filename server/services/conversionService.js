const crypto = require('crypto');
const ReferralClick = require('../models/ReferralClick');
const ReferralLink = require('../models/ReferralLink');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const ReferralConversion = require('../models/ReferralConversion');
const Event = require('../models/Event');
const AffiliateMarketer = require('../models/AffiliateMarketer');
const Order = require('../models/Order');
const { computeTicketAffiliateSplit } = require('./affiliateSplitCalculator');

function getKey() {
  const b64 = process.env.TICKET_QR_ENC_KEY || '';
  try {
    const key = Buffer.from(b64, 'base64');
    if (key.length === 32) return key;
  } catch (_) {}
  return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'dev').digest();
}

function decryptCookie(enc) {
  const buf = Buffer.from(enc, 'base64url');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

function ms(days) {
  return days * 24 * 60 * 60 * 1000;
}

function pickAttribution(clicks, model, conversionTimeMs, windowDays) {
  const windowStart = conversionTimeMs - ms(windowDays || 30);
  const inWindow = clicks.filter(
    (c) =>
      c.clicked_at.getTime() >= windowStart &&
      c.clicked_at.getTime() <= conversionTimeMs
  );
  if (inWindow.length === 0) return null;
  if (model === 'first_click') {
    const first = inWindow.slice().sort((a, b) => a.clicked_at - b.clicked_at)[0];
    return [{ click: first, weight: 1.0 }];
  }
  if (model === 'linear') {
    const w = 1 / inWindow.length;
    return inWindow.map((c) => ({ click: c, weight: w }));
  }
  if (model === 'time_decay') {
    const halfLife = ms(7);
    const withW = inWindow.map((c) => {
      const dt = conversionTimeMs - c.clicked_at.getTime();
      const w = Math.exp(-dt / halfLife);
      return { click: c, w };
    });
    const sum = withW.reduce((s, x) => s + x.w, 0) || 1;
    return withW.map((x) => ({ click: x.click, weight: x.w / sum }));
  }
  const last = inWindow.slice().sort((a, b) => b.clicked_at - a.clicked_at)[0];
  return [{ click: last, weight: 1.0 }];
}

async function buildSplitForLinkTicket(link, ticket, cfg) {
  const price = Number(ticket.price || ticket.pricing?.total || 0);
  const eventDoc = await Event.findById(link.event_id).lean();
  const marketer = link.affiliate_id
    ? await AffiliateMarketer.findById(link.affiliate_id).lean()
    : null;
  const cfgObj = cfg.toObject ? cfg.toObject() : { ...cfg };
  const linkObj = link.toObject ? link.toObject() : link;
  return computeTicketAffiliateSplit({
    ticketPrice: price,
    eventCommissionRate: eventDoc?.commissionRate,
    cfg: cfgObj,
    link: linkObj,
    marketer
  });
}

class ConversionService {
  decryptReferralCookie(enc) {
    return decryptCookie(enc);
  }

  /**
   * When buyer used referral code but never got attribution cookie (manual code / direct API).
   * Call after ticket exists and order is paid (e.g. DEV skip payment path).
   */
  async processConversionManualForTicket(ticket) {
    try {
      if (!ticket?.orderId || !ticket?.eventId) return null;
      const existing = await ReferralConversion.findOne({ ticket_id: ticket._id });
      if (existing) return existing;

      const order = await Order.findById(ticket.orderId);
      if (!order?.hasAffiliateTracking?.()) return null;
      const code = order.affiliateTracking?.referralCode;
      if (!code) return null;

      const link = await ReferralLink.findOne({
        referral_code: code,
        event_id: ticket.eventId,
        status: 'active',
        deleted_at: null
      });
      if (!link) return null;

      const cfg = await EventCommissionConfig.findOne({ event_id: link.event_id });
      if (!cfg) return null;

      const split = await buildSplitForLinkTicket(link, ticket, cfg);

      const breakdown = {
        ...split.calculation_breakdown,
        organizer_revenue: split.organizer_revenue,
        primary_agency_calc: {
          amount: split.primary_agency_commission
        },
        affiliate_calc: { amount: split.affiliate_commission }
      };

      const conversion = await ReferralConversion.create({
        click_id: null,
        link_id: link._id,
        attribution_source: 'manual_code',
        event_id: link.event_id,
        ticket_id: ticket._id,
        affiliate_id: link.affiliate_id || null,
        agency_id: link.agency_id || null,
        attribution_model_used: 'manual_code',
        attributed_clicks: [],
        customer_id: ticket.ownerUserId || null,
        customer_email: ticket.holder?.email || null,
        ticket_price: split.ticket_price,
        platform_fee: split.platform_fee,
        organizer_revenue: split.organizer_revenue,
        primary_agency_commission: split.primary_agency_commission,
        affiliate_commission: split.affiliate_commission,
        tier_2_affiliate_commission: split.tier_2_affiliate_commission,
        organizer_net: split.organizer_net,
        commission_config_snapshot: cfg.toJSON(),
        calculation_breakdown: breakdown,
        conversion_status: 'confirmed'
      });

      return conversion;
    } catch (e) {
      console.warn('processConversionManualForTicket:', e?.message);
      return null;
    }
  }

  async processConversion({ req, ticket }) {
    try {
      const cookieName = '_event_i_ref';
      const enc = req?.cookies?.[cookieName] || null;
      if (!enc) return null;
      let cookie;
      try {
        cookie = decryptCookie(enc);
      } catch (_) {
        return null;
      }
      const { link_id } = cookie || {};
      if (!link_id) return null;

      const link = await ReferralLink.findById(link_id);
      if (!link || link.status !== 'active') return null;

      const cfg = await EventCommissionConfig.findOne({ event_id: link.event_id });
      if (!cfg) return null;

      const now = Date.now();
      const windowDays = cfg.attribution_window_days || 30;
      const clicks = await ReferralClick.find({ link_id: link._id, event_id: link.event_id }).sort({
        clicked_at: 1
      });
      const attributions = pickAttribution(
        clicks,
        cfg.attribution_model || 'last_click',
        now,
        windowDays
      );
      if (!attributions || attributions.length === 0) return null;

      const split = await buildSplitForLinkTicket(link, ticket, cfg);

      const breakdown = {
        ...split.calculation_breakdown,
        organizer_revenue: split.organizer_revenue,
        primary_agency_calc: {
          amount: split.primary_agency_commission
        },
        affiliate_calc: { amount: split.affiliate_commission }
      };

      const conversion = await ReferralConversion.create({
        click_id: attributions[0].click._id,
        link_id: link._id,
        attribution_source: 'link_click',
        event_id: link.event_id,
        ticket_id: ticket._id,
        affiliate_id: link.affiliate_id || null,
        agency_id: link.agency_id || null,
        attribution_model_used: (cfg.attribution_model || 'last_click').replace('-', '_'),
        attributed_clicks: attributions.map((a) => ({
          click_id: a.click._id,
          weight: a.weight,
          clicked_at: a.click.clicked_at
        })),
        customer_id: ticket.ownerUserId || null,
        customer_email: ticket.holder?.email || null,
        ticket_price: split.ticket_price,
        platform_fee: split.platform_fee,
        organizer_revenue: split.organizer_revenue,
        primary_agency_commission: split.primary_agency_commission,
        affiliate_commission: split.affiliate_commission,
        tier_2_affiliate_commission: split.tier_2_affiliate_commission,
        organizer_net: split.organizer_net,
        commission_config_snapshot: cfg.toJSON(),
        calculation_breakdown: breakdown,
        conversion_status: 'confirmed'
      });

      await ReferralClick.updateOne(
        { _id: attributions[0].click._id },
        { $set: { converted: true, conversion_id: conversion._id } }
      );

      return conversion;
    } catch (e) {
      return null;
    }
  }
}

module.exports = new ConversionService();
