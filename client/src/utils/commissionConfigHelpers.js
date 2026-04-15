/** Shared commission config mapping for hub + admin commission setup. */

export function emptyProgram() {
  return {
    agency_id: '',
    pool_pct_of_ticket: 40,
    sub_seller_pct_of_ticket: 20,
    head_pct_of_ticket: 20
  };
}

export function mapProgramsFromApi(programs) {
  if (!Array.isArray(programs)) return [];
  return programs.map((p) => ({
    agency_id: p.agency_id != null ? String(p.agency_id) : '',
    pool_pct_of_ticket: Number(p.pool_pct_of_ticket) || 0,
    sub_seller_pct_of_ticket: Number(p.sub_seller_pct_of_ticket) || 0,
    head_pct_of_ticket: Number(p.head_pct_of_ticket) || 0
  }));
}

export function mapProgramsForApi(programs) {
  return mapProgramsFromApi(programs);
}

export function mapIndependentRatesForApi(rates) {
  if (!Array.isArray(rates)) return [];
  return rates
    .filter((r) => r.affiliate_id && String(r.affiliate_id).trim())
    .map((r) => ({
      affiliate_id: String(r.affiliate_id).trim(),
      pct_of_ticket: Number(r.pct_of_ticket) || 0
    }));
}

export function defaultCommissionConfig() {
  return {
    platform_fee_type: 'percentage',
    platform_fee_percentage: 5,
    platform_fee_fixed: 0,
    platform_fee_cap: null,
    primary_agency_id: '',
    primary_agency_commission_type: 'percentage',
    primary_agency_commission_rate: 0,
    primary_agency_commission_fixed: 0,
    affiliate_commission_enabled: true,
    affiliate_commission_type: 'percentage',
    affiliate_commission_rate: 15,
    affiliate_commission_fixed: 0,
    affiliate_commission_base: 'organizer_revenue',
    flat_affiliate_pct_of_ticket: null,
    agency_programs: [],
    independent_marketer_rates: [],
    use_event_commission_for_waterfall: true,
    enable_multi_tier: false,
    tier_2_commission_rate: 0,
    tier_3_commission_rate: 0,
    attribution_model: 'last_click',
    attribution_window_days: 30,
    allow_self_referral: false,
    allow_duplicate_conversions: false,
    payout_frequency: 'weekly',
    payout_delay_days: 7,
    minimum_payout_amount: 50
  };
}

export function formatCommissionApiError(err, fallback) {
  const data = err?.response?.data;
  if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
    const line = data.details
      .map((d) => d.msg || d.message || '')
      .filter(Boolean)
      .join(' · ');
    if (line) return line;
  }
  if (typeof data?.error === 'string' && data.error !== 'VALIDATION_ERROR') return data.error;
  if (data?.error === 'VALIDATION_ERROR') return 'Please check the form fields and try again.';
  if (typeof data?.message === 'string') return data.message;
  if (err?.message && !err.response) return err.message;
  return fallback;
}
