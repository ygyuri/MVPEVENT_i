const mongoose = require('mongoose');
const {
  validateAgencyPrograms,
  computeTicketAffiliateSplit
} = require('../services/affiliateSplitCalculator');

describe('affiliateSplitCalculator', () => {
  test('validateAgencyPrograms rejects sub+head !== pool', () => {
    expect(() =>
      validateAgencyPrograms([
        {
          agency_id: new mongoose.Types.ObjectId(),
          pool_pct_of_ticket: 40,
          sub_seller_pct_of_ticket: 20,
          head_pct_of_ticket: 15
        }
      ])
    ).toThrow(/must equal pool/);
  });

  test('validateAgencyPrograms accepts sub+head === pool', () => {
    expect(() =>
      validateAgencyPrograms([
        {
          agency_id: new mongoose.Types.ObjectId(),
          pool_pct_of_ticket: 40,
          sub_seller_pct_of_ticket: 20,
          head_pct_of_ticket: 20
        }
      ])
    ).not.toThrow();
  });

  test('agency sub split: 6% platform, 40% pool as 20+20 on $100', () => {
    const agencyId = new mongoose.Types.ObjectId();
    const cfg = {
      use_event_commission_for_waterfall: true,
      platform_fee_type: 'percentage',
      platform_fee_percentage: 5,
      primary_agency_commission_type: 'percentage',
      primary_agency_commission_rate: 0,
      affiliate_commission_enabled: true,
      affiliate_commission_type: 'percentage',
      affiliate_commission_rate: 10,
      affiliate_commission_base: 'organizer_revenue',
      agency_programs: [
        {
          agency_id: agencyId,
          pool_pct_of_ticket: 40,
          sub_seller_pct_of_ticket: 20,
          head_pct_of_ticket: 20
        }
      ]
    };
    const link = {
      affiliate_id: new mongoose.Types.ObjectId(),
      agency_id: agencyId
    };
    const marketer = { parent_affiliate_id: new mongoose.Types.ObjectId(), agency_id: agencyId };

    const out = computeTicketAffiliateSplit({
      ticketPrice: 100,
      eventCommissionRate: 6,
      cfg,
      link,
      marketer
    });

    expect(out.platform_fee).toBe(6);
    expect(out.organizer_revenue).toBe(94);
    expect(out.affiliate_commission).toBe(20);
    expect(out.tier_2_affiliate_commission).toBe(20);
    expect(out.split_mode).toBe('agency_sub_seller');
  });

  test('agency direct seller gets full pool', () => {
    const agencyId = new mongoose.Types.ObjectId();
    const cfg = {
      use_event_commission_for_waterfall: true,
      platform_fee_type: 'percentage',
      platform_fee_percentage: 5,
      primary_agency_commission_type: 'percentage',
      primary_agency_commission_rate: 0,
      affiliate_commission_enabled: true,
      agency_programs: [
        {
          agency_id: agencyId,
          pool_pct_of_ticket: 40,
          sub_seller_pct_of_ticket: 20,
          head_pct_of_ticket: 20
        }
      ]
    };
    const link = {
      affiliate_id: new mongoose.Types.ObjectId(),
      agency_id: agencyId
    };
    const marketer = { parent_affiliate_id: null, agency_id: agencyId };

    const out = computeTicketAffiliateSplit({
      ticketPrice: 100,
      eventCommissionRate: 6,
      cfg,
      link,
      marketer
    });

    expect(out.affiliate_commission).toBe(40);
    expect(out.tier_2_affiliate_commission).toBeNull();
    expect(out.split_mode).toBe('agency_direct');
  });

  test('flat_affiliate_pct_of_ticket % of ticket', () => {
    const cfg = {
      use_event_commission_for_waterfall: true,
      affiliate_commission_enabled: true,
      flat_affiliate_pct_of_ticket: 15,
      affiliate_commission_type: 'percentage',
      affiliate_commission_rate: 99,
      affiliate_commission_base: 'organizer_revenue',
      primary_agency_commission_type: 'percentage',
      primary_agency_commission_rate: 0
    };
    const out = computeTicketAffiliateSplit({
      ticketPrice: 100,
      eventCommissionRate: 6,
      cfg,
      link: { affiliate_id: new mongoose.Types.ObjectId(), agency_id: null },
      marketer: null
    });
    expect(out.affiliate_commission).toBe(15);
    expect(out.split_mode).toBe('flat');
  });

  test('primary agency commission is zero when primary_agency_id is unset', () => {
    const cfg = {
      use_event_commission_for_waterfall: true,
      primary_agency_id: null,
      primary_agency_commission_type: 'percentage',
      primary_agency_commission_rate: 25,
      affiliate_commission_enabled: true,
      affiliate_commission_type: 'percentage',
      affiliate_commission_rate: 10,
      affiliate_commission_base: 'organizer_revenue'
    };
    const out = computeTicketAffiliateSplit({
      ticketPrice: 100,
      eventCommissionRate: 6,
      cfg,
      link: { affiliate_id: new mongoose.Types.ObjectId(), agency_id: null },
      marketer: null
    });
    expect(out.primary_agency_commission).toBe(0);
    expect(out.split_mode).toBe('flat');
  });

  test('independent_marketer_rates: pct of ticket for matching link affiliate', () => {
    const affId = new mongoose.Types.ObjectId();
    const cfg = {
      use_event_commission_for_waterfall: true,
      primary_agency_id: null,
      affiliate_commission_enabled: true,
      affiliate_commission_rate: 99,
      independent_marketer_rates: [{ affiliate_id: affId, pct_of_ticket: 12 }]
    };
    const out = computeTicketAffiliateSplit({
      ticketPrice: 100,
      eventCommissionRate: 6,
      cfg,
      link: { affiliate_id: affId, agency_id: null },
      marketer: { agency_id: null, parent_affiliate_id: null }
    });
    expect(out.split_mode).toBe('independent_marketer');
    expect(out.affiliate_commission).toBe(12);
    expect(out.tier_2_affiliate_commission).toBeNull();
  });
});
