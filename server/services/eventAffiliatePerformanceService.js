const mongoose = require('mongoose');
const Order = require('../models/Order');
const Event = require('../models/Event');
const ReferralLink = require('../models/ReferralLink');
const AffiliateMarketer = require('../models/AffiliateMarketer');
const EventCommissionConfig = require('../models/EventCommissionConfig');
const { computeTicketAffiliateSplit } = require('./affiliateSplitCalculator');

const PAID_STATUSES = ['paid', 'confirmed', 'completed'];
const PAID_PAYMENT = ['completed', 'paid'];

class EventAffiliatePerformanceService {
  async assertEventAccess(eventId, userId, isAdmin) {
    const event = await Event.findById(eventId);
    if (!event) {
      const e = new Error('Event not found');
      e.statusCode = 404;
      throw e;
    }
    if (!isAdmin && String(event.organizer) !== String(userId)) {
      const e = new Error('ACCESS_DENIED');
      e.statusCode = 403;
      throw e;
    }
    return event;
  }

  /**
   * Aggregate paid orders with affiliate tracking for one event.
   */
  async performanceForEvent({ eventId, userId, isAdmin = false }) {
    await this.assertEventAccess(eventId, userId, isAdmin);

    const cfg = await EventCommissionConfig.findOne({ event_id: eventId });
    const eventDoc = await Event.findById(eventId).lean();

    const orders = await Order.find({
      'items.eventId': new mongoose.Types.ObjectId(eventId),
      status: { $in: PAID_STATUSES },
      paymentStatus: { $in: PAID_PAYMENT },
      'affiliateTracking.referralCode': { $ne: null }
    }).lean();

    const byAffiliate = new Map();

    for (const order of orders) {
      const item = (order.items || []).find(
        (i) => String(i.eventId) === String(eventId)
      );
      if (!item) continue;

      const affId = order.affiliateTracking?.affiliateId;
      const code = order.affiliateTracking?.referralCode;
      const key = affId ? String(affId) : `code:${code}`;

      const unit = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      const lineGross = unit * qty;

      let link = null;
      let marketer = null;
      if (code) {
        link = await ReferralLink.findOne({
          referral_code: code,
          event_id: eventId
        }).lean();
      }
      if (affId) {
        marketer = await AffiliateMarketer.findById(affId).lean();
      }

      const split = cfg
        ? computeTicketAffiliateSplit({
            ticketPrice: unit,
            eventCommissionRate: eventDoc?.commissionRate,
            cfg: cfg.toObject(),
            link: link || { affiliate_id: affId, agency_id: null },
            marketer
          })
        : {
            affiliate_commission: 0,
            tier_2_affiliate_commission: null
          };

      const commissionPerTicket =
        (split.affiliate_commission || 0) +
        (split.tier_2_affiliate_commission || 0);
      const totalCommission = commissionPerTicket * qty;

      if (!byAffiliate.has(key)) {
        byAffiliate.set(key, {
          affiliate_id: affId || null,
          referral_code: code || null,
          tickets_sold: 0,
          gross_attributed: 0,
          estimated_commission_total: 0,
          estimated_sub_commission: 0,
          estimated_head_commission: 0
        });
      }
      const row = byAffiliate.get(key);
      row.tickets_sold += qty;
      row.gross_attributed += lineGross;
      row.estimated_commission_total += totalCommission;
      row.estimated_sub_commission += (split.affiliate_commission || 0) * qty;
      row.estimated_head_commission +=
        (split.tier_2_affiliate_commission || 0) * qty;
    }

    const rows = Array.from(byAffiliate.values()).sort(
      (a, b) => b.gross_attributed - a.gross_attributed
    );

    for (const r of rows) {
      if (r.affiliate_id) {
        const m = await AffiliateMarketer.findById(r.affiliate_id)
          .select('first_name last_name email referral_code')
          .lean();
        r.marketer = m || null;
      }
    }

    return {
      event_id: eventId,
      rows,
      event_commission_rate: eventDoc?.commissionRate ?? null
    };
  }
}

module.exports = new EventAffiliatePerformanceService();
