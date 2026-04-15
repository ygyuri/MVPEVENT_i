/**
 * Pure affiliate / platform split math for an event ticket.
 * Used by commission preview, conversion records, and organizer affiliate performance.
 */

const EPS = 0.02;

function validateAgencyPrograms(programs) {
  if (!programs || !Array.isArray(programs)) return;
  for (const p of programs) {
    const pool = Number(p.pool_pct_of_ticket) || 0;
    const sub = Number(p.sub_seller_pct_of_ticket) || 0;
    const head = Number(p.head_pct_of_ticket) || 0;
    if (Math.abs(sub + head - pool) > EPS) {
      const err = new Error(
        `Agency program split invalid: sub (${sub}%) + head (${head}%) must equal pool (${pool}%)`
      );
      err.statusCode = 400;
      throw err;
    }
  }
}

function calcPlatformFeeLegacy(ticketPrice, cfg) {
  let fee = 0;
  if (cfg.platform_fee_type === 'percentage') {
    fee = (ticketPrice * (cfg.platform_fee_percentage || 0)) / 100;
  } else if (cfg.platform_fee_type === 'fixed') {
    fee = cfg.platform_fee_fixed || 0;
  } else if (cfg.platform_fee_type === 'hybrid') {
    fee =
      (ticketPrice * (cfg.platform_fee_percentage || 0)) / 100 +
      (cfg.platform_fee_fixed || 0);
  }
  if (cfg.platform_fee_cap != null) fee = Math.min(fee, cfg.platform_fee_cap);
  return Math.max(0, Number(fee.toFixed(2)));
}

function pctOrFixed(base, type, rate, fixed) {
  if (type === 'percentage') {
    return Math.max(0, Number(((base * (rate || 0)) / 100).toFixed(2)));
  }
  return Math.max(0, Number((fixed || 0).toFixed(2)));
}

function getAffiliateBase(ticketPrice, platformFee, primaryAgencyCommission, cfg) {
  if (cfg.affiliate_commission_base === 'ticket_price') return ticketPrice;
  if (cfg.affiliate_commission_base === 'agency_revenue') {
    return primaryAgencyCommission;
  }
  return ticketPrice - platformFee;
}

function findAgencyProgram(cfg, link, marketer) {
  const programs = cfg.agency_programs || [];
  if (!programs.length) return null;
  const fromLink = link?.agency_id;
  const fromMarketer = marketer?.agency_id;
  const target = fromLink || fromMarketer;
  if (!target) return null;
  const sid = String(target);
  return programs.find((p) => String(p.agency_id) === sid) || null;
}

/**
 * @param {object} params
 * @param {number} params.ticketPrice
 * @param {number|null} params.eventCommissionRate - Event.commissionRate (0-100)
 * @param {object} params.cfg - EventCommissionConfig lean or doc
 * @param {object|null} params.link - ReferralLink lean
 * @param {object|null} params.marketer - AffiliateMarketer lean
 */
function computeTicketAffiliateSplit({
  ticketPrice,
  eventCommissionRate,
  cfg,
  link,
  marketer
}) {
  const price = Number(ticketPrice);
  if (!price || price <= 0) {
    return {
      ticket_price: 0,
      platform_fee: 0,
      organizer_revenue: 0,
      primary_agency_commission: 0,
      affiliate_commission: 0,
      tier_2_affiliate_commission: null,
      organizer_net: 0,
      calculation_breakdown: {},
      split_mode: 'none'
    };
  }

  let platform_fee;
  if (cfg.use_event_commission_for_waterfall !== false && eventCommissionRate != null) {
    const pct = Number(eventCommissionRate) || 0;
    platform_fee = Number(((price * pct) / 100).toFixed(2));
  } else {
    platform_fee = calcPlatformFeeLegacy(price, cfg);
  }

  const organizer_revenue = Number((price - platform_fee).toFixed(2));

  const primary_agency_commission = cfg.primary_agency_id
    ? pctOrFixed(
        price,
        cfg.primary_agency_commission_type,
        cfg.primary_agency_commission_rate,
        cfg.primary_agency_commission_fixed
      )
    : 0;

  const program = findAgencyProgram(cfg, link, marketer);
  let affiliate_commission = 0;
  let tier_2_affiliate_commission = null;
  let split_mode = 'legacy';

  /** Independent path: no agency on the marketer (or marketer record missing). */
  const eligibleIndependent =
    link?.affiliate_id &&
    (!marketer ||
      marketer.agency_id == null ||
      marketer.agency_id === undefined ||
      String(marketer.agency_id) === '');

  if (program && link?.affiliate_id) {
    split_mode = marketer?.parent_affiliate_id ? 'agency_sub_seller' : 'agency_direct';
    const poolPct = Number(program.pool_pct_of_ticket) || 0;
    const subPct = Number(program.sub_seller_pct_of_ticket) || 0;
    const headPct = Number(program.head_pct_of_ticket) || 0;

    if (marketer?.parent_affiliate_id) {
      affiliate_commission = Number(((price * subPct) / 100).toFixed(2));
      tier_2_affiliate_commission = Number(((price * headPct) / 100).toFixed(2));
    } else {
      affiliate_commission = Number(((price * poolPct) / 100).toFixed(2));
      tier_2_affiliate_commission = null;
    }
  } else if (
    eligibleIndependent &&
    Array.isArray(cfg.independent_marketer_rates) &&
    cfg.independent_marketer_rates.length > 0
  ) {
    const row = cfg.independent_marketer_rates.find(
      (r) => r.affiliate_id && String(r.affiliate_id) === String(link.affiliate_id)
    );
    if (row != null && row.pct_of_ticket != null) {
      split_mode = 'independent_marketer';
      affiliate_commission = Number(
        ((price * (Number(row.pct_of_ticket) || 0)) / 100).toFixed(2)
      );
    }
  }

  if (
    split_mode === 'legacy' &&
    cfg.affiliate_commission_enabled &&
    link?.affiliate_id
  ) {
    split_mode = 'flat';
    if (cfg.flat_affiliate_pct_of_ticket != null) {
      affiliate_commission = Number(
        ((price * Number(cfg.flat_affiliate_pct_of_ticket)) / 100).toFixed(2)
      );
    } else {
      const base = getAffiliateBase(
        price,
        platform_fee,
        primary_agency_commission,
        cfg
      );
      affiliate_commission = pctOrFixed(
        base,
        cfg.affiliate_commission_type,
        cfg.affiliate_commission_rate,
        cfg.affiliate_commission_fixed
      );
    }
    if (cfg.enable_multi_tier && cfg.tier_2_commission_rate != null) {
      tier_2_affiliate_commission = Number(
        ((affiliate_commission * cfg.tier_2_commission_rate) / 100).toFixed(2)
      );
    }
  }

  const organizer_net = Number(
    (
      organizer_revenue -
      primary_agency_commission -
      affiliate_commission -
      (tier_2_affiliate_commission || 0)
    ).toFixed(2)
  );

  const calculation_breakdown = {
    ticket_price: price,
    platform_fee_source:
      cfg.use_event_commission_for_waterfall !== false && eventCommissionRate != null
        ? 'event_commission_rate'
        : 'commission_config_platform',
    affiliate_split_mode: split_mode,
    agency_program_id: program ? String(program.agency_id) : null
  };

  return {
    ticket_price: price,
    platform_fee,
    organizer_revenue,
    primary_agency_commission,
    affiliate_commission,
    tier_2_affiliate_commission,
    organizer_net,
    calculation_breakdown,
    split_mode
  };
}

module.exports = {
  EPS,
  validateAgencyPrograms,
  findAgencyProgram,
  computeTicketAffiliateSplit,
  calcPlatformFeeLegacy,
  pctOrFixed,
  getAffiliateBase
};
