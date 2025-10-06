const Event = require('../models/Event');
const EventCommissionConfig = require('../models/EventCommissionConfig');

function assert(condition, message, code = 400) {
  if (!condition) {
    const e = new Error(message);
    e.statusCode = code;
    throw e;
  }
}

function calculatePlatformFee(ticketPrice, cfg) {
  let fee = 0;
  if (cfg.platform_fee_type === 'percentage') {
    fee = (ticketPrice * (cfg.platform_fee_percentage || 0)) / 100;
  } else if (cfg.platform_fee_type === 'fixed') {
    fee = cfg.platform_fee_fixed || 0;
  } else if (cfg.platform_fee_type === 'hybrid') {
    const p = (ticketPrice * (cfg.platform_fee_percentage || 0)) / 100;
    fee = p + (cfg.platform_fee_fixed || 0);
  }
  if (cfg.platform_fee_cap != null) fee = Math.min(fee, cfg.platform_fee_cap);
  return Math.max(0, Number(fee.toFixed(2)));
}

function getAffiliateBase(ticketPrice, platformFee, primaryAgencyCommission, cfg) {
  if (cfg.affiliate_commission_base === 'ticket_price') return ticketPrice;
  if (cfg.affiliate_commission_base === 'agency_revenue') return primaryAgencyCommission;
  return ticketPrice - platformFee; // organizer_revenue
}

function pctOrFixed(base, type, rate, fixed) {
  if (type === 'percentage') return Math.max(0, Number(((base * (rate || 0)) / 100).toFixed(2)));
  return Math.max(0, Number((fixed || 0).toFixed(2)));
}

class CommissionService {
  async getConfig(eventId) {
    const cfg = await EventCommissionConfig.findOne({ event_id: eventId });
    return cfg;
  }

  async setConfig(eventId, organizerId, payload) {
    const event = await Event.findById(eventId);
    assert(event, 'Event not found', 404);
    assert(String(event.organizer) === String(organizerId) || payload.forceByAdmin, 'ACCESS_DENIED', 403);

    const defaults = {
      platform_fee_type: 'percentage',
      platform_fee_percentage: Number(process.env.AFFILIATE_COMMISSION_DEFAULT_PLATFORM_FEE || 5.0),
      platform_fee_fixed: 0,
      platform_fee_cap: null,
      affiliate_commission_base: 'organizer_revenue',
      attribution_model: 'last_click',
      attribution_window_days: 30,
      payout_frequency: 'weekly',
      payout_delay_days: 7,
      minimum_payout_amount: 50
    };

    const update = { ...defaults, ...payload, event_id: eventId, organizer_id: organizerId };
    const cfg = await EventCommissionConfig.findOneAndUpdate(
      { event_id: eventId },
      { $set: update },
      { upsert: true, new: true }
    );
    return cfg;
  }

  async preview(eventId, organizerId, { ticket_price }) {
    const event = await Event.findById(eventId);
    assert(event, 'Event not found', 404);
    const cfg = await this.getConfig(eventId);
    assert(cfg, 'Commission config not set', 404);

    const price = Number(ticket_price);
    assert(!Number.isNaN(price) && price > 0, 'Invalid ticket_price');

    const platform_fee = calculatePlatformFee(price, cfg);
    const organizer_revenue = Number((price - platform_fee).toFixed(2));

    const primary_agency_commission = pctOrFixed(
      organizer_revenue,
      cfg.primary_agency_commission_type,
      cfg.primary_agency_commission_rate,
      cfg.primary_agency_commission_fixed
    );

    let affiliate_commission = 0;
    let tier_2_affiliate_commission = null;
    if (cfg.affiliate_commission_enabled) {
      const base = getAffiliateBase(price, platform_fee, primary_agency_commission, cfg);
      affiliate_commission = pctOrFixed(base, cfg.affiliate_commission_type, cfg.affiliate_commission_rate, cfg.affiliate_commission_fixed);
      if (cfg.enable_multi_tier && cfg.tier_2_commission_rate != null) {
        tier_2_affiliate_commission = Number(((affiliate_commission * cfg.tier_2_commission_rate) / 100).toFixed(2));
      }
    }

    const organizer_net = Number((organizer_revenue - primary_agency_commission - affiliate_commission - (tier_2_affiliate_commission || 0)).toFixed(2));

    return {
      ticket_price: price,
      platform_fee,
      organizer_revenue,
      primary_agency_commission,
      affiliate_commission,
      tier_2_affiliate_commission,
      organizer_net
    };
  }
}

module.exports = new CommissionService();


