const crypto = require('crypto');
const ReferralClick = require('../models/ReferralClick');
const ReferralLink = require('../models/ReferralLink');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const ReferralConversion = require('../models/ReferralConversion');

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
  const inWindow = clicks.filter(c => c.clicked_at.getTime() >= windowStart && c.clicked_at.getTime() <= conversionTimeMs);
  if (inWindow.length === 0) return null;
  if (model === 'first_click') {
    const first = inWindow.slice().sort((a,b) => a.clicked_at - b.clicked_at)[0];
    return [{ click: first, weight: 1.0 }];
  }
  if (model === 'linear') {
    const w = 1 / inWindow.length;
    return inWindow.map(c => ({ click: c, weight: w }));
  }
  if (model === 'time_decay') {
    const halfLife = ms(7);
    const withW = inWindow.map(c => {
      const dt = conversionTimeMs - c.clicked_at.getTime();
      const w = Math.exp(-dt / halfLife);
      return { click: c, w };
    });
    const sum = withW.reduce((s, x) => s + x.w, 0) || 1;
    return withW.map(x => ({ click: x.click, weight: x.w / sum }));
  }
  // default last_click
  const last = inWindow.slice().sort((a,b) => b.clicked_at - a.clicked_at)[0];
  return [{ click: last, weight: 1.0 }];
}

function calcPlatformFee(price, cfg) {
  let fee = 0;
  if (cfg.platform_fee_type === 'percentage') fee = price * (cfg.platform_fee_percentage || 0) / 100;
  else if (cfg.platform_fee_type === 'fixed') fee = cfg.platform_fee_fixed || 0;
  else if (cfg.platform_fee_type === 'hybrid') fee = price * (cfg.platform_fee_percentage || 0) / 100 + (cfg.platform_fee_fixed || 0);
  if (cfg.platform_fee_cap != null) fee = Math.min(fee, cfg.platform_fee_cap);
  return Number(fee.toFixed(2));
}

function pctOrFixed(base, type, rate, fixed) {
  if (type === 'percentage') return Number(((base * (rate || 0)) / 100).toFixed(2));
  return Number((fixed || 0).toFixed(2));
}

class ConversionService {
  decryptReferralCookie(enc) {
    return decryptCookie(enc);
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
      const clicks = await ReferralClick.find({ link_id: link._id, event_id: link.event_id }).sort({ clicked_at: 1 });
      const attributions = pickAttribution(clicks, (cfg.attribution_model || 'last_click'), now, windowDays);
      if (!attributions || attributions.length === 0) return null;

      // Compute commissions based on single-ticket purchase
      const price = Number(ticket.price || ticket.pricing?.total || 0);
      const platform_fee = calcPlatformFee(price, cfg);
      const organizer_revenue = Number((price - platform_fee).toFixed(2));
      const primary_agency_commission = link.agency_id ? pctOrFixed(organizer_revenue, cfg.primary_agency_commission_type, cfg.primary_agency_commission_rate, cfg.primary_agency_commission_fixed) : 0;
      let affiliate_base = organizer_revenue;
      if (cfg.affiliate_commission_base === 'ticket_price') affiliate_base = price;
      if (cfg.affiliate_commission_base === 'agency_revenue') affiliate_base = primary_agency_commission;
      const affiliate_commission = (cfg.affiliate_commission_enabled && link.affiliate_id)
        ? pctOrFixed(affiliate_base, cfg.affiliate_commission_type, cfg.affiliate_commission_rate, cfg.affiliate_commission_fixed)
        : 0;
      const tier_2_affiliate_commission = (cfg.enable_multi_tier && cfg.tier_2_commission_rate != null) ? Number(((affiliate_commission * cfg.tier_2_commission_rate) / 100).toFixed(2)) : null;
      const organizer_net = Number((organizer_revenue - primary_agency_commission - affiliate_commission - (tier_2_affiliate_commission || 0)).toFixed(2));

      const breakdown = {
        ticket_price: price,
        platform_fee_calc: { type: cfg.platform_fee_type, amount: platform_fee },
        organizer_revenue,
        primary_agency_calc: { base: organizer_revenue, rate: cfg.primary_agency_commission_rate, amount: primary_agency_commission },
        affiliate_calc: { base: affiliate_base, rate: cfg.affiliate_commission_rate, amount: affiliate_commission }
      };

      const conversion = await ReferralConversion.create({
        click_id: attributions[0].click._id,
        link_id: link._id,
        event_id: link.event_id,
        ticket_id: ticket._id,
        affiliate_id: link.affiliate_id || null,
        agency_id: link.agency_id || null,
        attribution_model_used: (cfg.attribution_model || 'last_click').replace('-', '_'),
        attributed_clicks: attributions.map(a => ({ click_id: a.click._id, weight: a.weight, clicked_at: a.click.clicked_at })),
        customer_id: ticket.ownerUserId || null,
        customer_email: ticket.holder?.email || null,
        ticket_price: price,
        platform_fee,
        organizer_revenue,
        primary_agency_commission,
        affiliate_commission,
        tier_2_affiliate_commission,
        organizer_net,
        commission_config_snapshot: cfg.toJSON(),
        calculation_breakdown: breakdown,
        conversion_status: 'confirmed'
      });

      // Mark click converted
      await ReferralClick.updateOne({ _id: attributions[0].click._id }, { $set: { converted: true, conversion_id: conversion._id } });

      return conversion;
    } catch (e) {
      return null;
    }
  }
}

module.exports = new ConversionService();


