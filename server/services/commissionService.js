const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const {
  validateAgencyPrograms,
  computeTicketAffiliateSplit
} = require('./affiliateSplitCalculator');

function assert(condition, message, code = 400) {
  if (!condition) {
    const e = new Error(message);
    e.statusCode = code;
    throw e;
  }
}

function sumAgencyPoolsPct(cfg) {
  const programs = cfg.agency_programs || [];
  return programs.reduce((s, p) => s + (Number(p.pool_pct_of_ticket) || 0), 0);
}

/**
 * Persistable agency programs: drop blank rows; coerce IDs; require agency when any % is set.
 */
function normalizeAgencyProgramsForPersistence(programs) {
  if (!Array.isArray(programs)) return [];
  const out = [];
  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    const pool = Number(p.pool_pct_of_ticket) || 0;
    const sub = Number(p.sub_seller_pct_of_ticket) || 0;
    const head = Number(p.head_pct_of_ticket) || 0;
    const sid = p.agency_id != null ? String(p.agency_id).trim() : '';
    const hasNumbers = pool > 0 || sub > 0 || head > 0;
    if (!sid && !hasNumbers) continue;
    if (!sid || !mongoose.Types.ObjectId.isValid(sid)) {
      const err = new Error(`Agency program ${i + 1}: select a marketing agency`);
      err.statusCode = 400;
      throw err;
    }
    out.push({
      agency_id: new mongoose.Types.ObjectId(sid),
      pool_pct_of_ticket: pool,
      sub_seller_pct_of_ticket: sub,
      head_pct_of_ticket: head
    });
  }
  return out;
}

function normalizePrimaryAgencyId(value) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const s = String(value).trim();
  if (!s || !mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

/** Final pass so Mongo never sees "" on ObjectId paths (avoids BSON CastError). */
function coerceCommissionDocForMongo(merged, eventId, organizerId) {
  const out = { ...merged };
  out.primary_agency_id = normalizePrimaryAgencyId(out.primary_agency_id);
  if (out.primary_agency_id === '' || out.primary_agency_id === undefined) {
    out.primary_agency_id = null;
  }
  const eid = eventId != null ? String(eventId) : '';
  if (eid && mongoose.Types.ObjectId.isValid(eid)) {
    out.event_id = new mongoose.Types.ObjectId(eid);
  }
  const org = organizerId && organizerId._id ? organizerId._id : organizerId;
  if (org != null && mongoose.Types.ObjectId.isValid(String(org))) {
    out.organizer_id = new mongoose.Types.ObjectId(String(org));
  }
  return out;
}

function validateWaterfallTotals(cfg, eventCommissionRate) {
  const platformPct =
    cfg.use_event_commission_for_waterfall !== false && eventCommissionRate != null
      ? Number(eventCommissionRate) || 0
      : cfg.platform_fee_type === 'percentage'
        ? cfg.platform_fee_percentage || 0
        : 0;
  const maxAgencyPools = 100 - platformPct;
  const poolSum = sumAgencyPoolsPct(cfg);
  if (poolSum > maxAgencyPools + 0.05) {
    const err = new Error(
      `Agency program pools (${poolSum.toFixed(2)}%) plus platform (${platformPct}%) exceed 100% of ticket`
    );
    err.statusCode = 400;
    throw err;
  }
  const flatPct =
    cfg.flat_affiliate_pct_of_ticket != null
      ? Number(cfg.flat_affiliate_pct_of_ticket)
      : cfg.affiliate_commission_enabled && cfg.affiliate_commission_type === 'percentage'
        ? cfg.affiliate_commission_rate || 0
        : 0;
  if (flatPct + platformPct > 100 + 0.05) {
    const err = new Error('Flat affiliate % plus platform % cannot exceed 100%');
    err.statusCode = 400;
    throw err;
  }
}

class CommissionService {
  async getConfig(eventId) {
    return EventCommissionConfig.findOne({ event_id: eventId }).lean();
  }

  async setConfig(eventId, userId, payload, { isAdmin: isAdminUser = false } = {}) {
    const event = await Event.findById(eventId);
    assert(event, 'Event not found', 404);
    assert(
      String(event.organizer) === String(userId) || isAdminUser,
      'ACCESS_DENIED',
      403
    );

    const cfgExisting = await EventCommissionConfig.findOne({ event_id: eventId }).lean();

    const defaults = {
      platform_fee_type: 'percentage',
      platform_fee_percentage: Number(
        process.env.AFFILIATE_COMMISSION_DEFAULT_PLATFORM_FEE || 5.0
      ),
      platform_fee_fixed: 0,
      platform_fee_cap: null,
      affiliate_commission_base: 'organizer_revenue',
      attribution_model: 'last_click',
      attribution_window_days: 30,
      payout_frequency: 'weekly',
      payout_delay_days: 7,
      minimum_payout_amount: 50,
      agency_programs: [],
      use_event_commission_for_waterfall: true,
      affiliate_commission_enabled: true,
      affiliate_commission_type: 'percentage',
      affiliate_commission_rate: 0,
      affiliate_commission_fixed: 0
    };

    const { forceByAdmin: _fa, event_commission_rate: ecrFieldIn, ...rawRest } = payload;
    delete rawRest._id;
    delete rawRest.__v;
    delete rawRest.createdAt;
    delete rawRest.updatedAt;

    let ecrField = ecrFieldIn;
    if (!isAdminUser) {
      ecrField = undefined;
      delete rawRest.use_event_commission_for_waterfall;
      delete rawRest.platform_fee_type;
      delete rawRest.platform_fee_percentage;
      delete rawRest.platform_fee_fixed;
      delete rawRest.platform_fee_cap;
    }

    let merged;
    if (cfgExisting) {
      merged = { ...cfgExisting, ...rawRest };
    } else {
      merged = { ...defaults, ...rawRest };
    }
    delete merged._id;
    delete merged.__v;

    merged.primary_agency_id = normalizePrimaryAgencyId(merged.primary_agency_id);

    if (merged.agency_programs != null) {
      merged.agency_programs = normalizeAgencyProgramsForPersistence(merged.agency_programs);
      validateAgencyPrograms(merged.agency_programs);
    }

    const eventCommissionRate =
      ecrField !== undefined && ecrField !== null
        ? Number(ecrField)
        : event.commissionRate;
    validateWaterfallTotals(merged, eventCommissionRate);

    merged.event_id = eventId;
    merged.organizer_id = event.organizer;

    if (isAdminUser && ecrField !== undefined && ecrField !== null) {
      event.commissionRate = Number(ecrField);
      await event.save();
    }

    const forMongo = coerceCommissionDocForMongo(merged, eventId, event.organizer);

    const cfg = await EventCommissionConfig.findOneAndUpdate(
      { event_id: eventId },
      { $set: forMongo },
      { upsert: true, new: true }
    );
    return cfg;
  }

  async preview(eventId, userId, { ticket_price, scenario = 'flat' }) {
    const event = await Event.findById(eventId);
    assert(event, 'Event not found', 404);
    const cfg = await this.getConfig(eventId);
    assert(cfg, 'Commission config not set', 404);

    const price = Number(ticket_price);
    assert(!Number.isNaN(price) && price > 0, 'Invalid ticket_price');

    const cfgObj = cfg;
    const eventRate = event.commissionRate;

    const dummySeller = new mongoose.Types.ObjectId();
    const dummyParent = new mongoose.Types.ObjectId();
    let linkStub = { affiliate_id: dummySeller, agency_id: null };
    let marketerStub = { parent_affiliate_id: null, agency_id: null };

    const programs = cfgObj.agency_programs || [];
    const first = programs[0];

    if (scenario === 'agency_sub' && first) {
      linkStub = { affiliate_id: dummySeller, agency_id: first.agency_id };
      marketerStub = {
        parent_affiliate_id: dummyParent,
        agency_id: first.agency_id
      };
    } else if (scenario === 'agency_head' && first) {
      linkStub = { affiliate_id: dummySeller, agency_id: first.agency_id };
      marketerStub = { parent_affiliate_id: null, agency_id: first.agency_id };
    } else if (cfgObj.primary_agency_id) {
      linkStub = {
        affiliate_id: dummySeller,
        agency_id: cfgObj.primary_agency_id
      };
    }

    const split = computeTicketAffiliateSplit({
      ticketPrice: price,
      eventCommissionRate: eventRate,
      cfg: cfgObj,
      link: linkStub,
      marketer: marketerStub
    });

    return {
      ticket_price: price,
      event_commission_rate: eventRate,
      platform_fee: split.platform_fee,
      organizer_revenue: split.organizer_revenue,
      primary_agency_commission: split.primary_agency_commission,
      affiliate_commission: split.affiliate_commission,
      tier_2_affiliate_commission: split.tier_2_affiliate_commission,
      organizer_net: split.organizer_net,
      split_mode: split.split_mode,
      scenario
    };
  }
}

module.exports = new CommissionService();
