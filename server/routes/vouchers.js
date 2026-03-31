const express = require("express");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { verifyToken, requireRole } = require("../middleware/auth");
const voucherService = require("../services/voucherService");
const ticketService = require("../services/ticketService");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const EventStaff = require("../models/EventStaff");
const ScanLog = require("../models/ScanLog");

const scanLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: "Validation failed", details: errors.array() });
  }
  return null;
}

// POST /api/vouchers/scan - redeem ticket for voucher (organizer/admin/staff)
router.post(
  "/scan",
  scanLimiter,
  verifyToken,
  requireRole(["organizer", "admin"]),
  [
    body("qr").isString().trim().notEmpty().withMessage("QR data is required"),
    body("location").optional().isString(),
    body("device").optional().isObject(),
  ],
  async (req, res) => {
    const v = handleValidation(req, res);
    if (v) return v;

    try {
      const { qr, location, device } = req.body;
      const qrTrimmed = typeof qr === "string" ? qr.trim() : String(qr);

      const verification = await ticketService.verifyQr(qrTrimmed);
      if (!verification.ok) {
        return res.status(400).json({
          success: false,
          valid: false,
          code: verification.code,
        });
      }

      const { ticket, event } = verification;
      const isOrganizer = event && String(event.organizer) === String(req.user._id);
      const isAdmin = req.user.role === "admin";
      let isEventStaff = false;
      if (!isOrganizer && !isAdmin && event) {
        const staff = await EventStaff.findOne({
          eventId: event._id,
          userId: req.user._id,
          isActive: true,
        });
        isEventStaff = !!staff;
      }
      if (!isOrganizer && !isAdmin && !isEventStaff) {
        await ScanLog.create({
          ticketId: ticket._id,
          eventId: event?._id,
          scannedBy: req.user._id,
          location: location || null,
          result: "denied",
          device,
        });
        return res.status(403).json({ success: false, valid: false, code: "ACCESS_DENIED" });
      }

      const result = await voucherService.redeemByTicket(ticket, event, req.user, { location });

      if (!result.ok) {
        await ScanLog.create({
          ticketId: ticket._id,
          eventId: ticket.eventId,
          scannedBy: req.user._id,
          location: location || null,
          result: result.code === "VOUCHER_ALREADY_REDEEMED" ? "already_used" : "invalid",
          device,
        });
        const statusMap = {
          NOT_ENTRY_USED: 400,
          VOUCHER_ALREADY_REDEEMED: 409,
          NO_VOUCHER_CONFIGURED: 400,
          TICKET_INVALID: 400,
          EVENT_NOT_STARTED: 400,
          EVENT_ENDED: 400,
        };
        const status = statusMap[result.code] || 400;
        return res.status(status).json({
          success: false,
          valid: false,
          code: result.code,
          message: result.message,
          voucherRedeemedAt: result.voucherRedeemedAt,
        });
      }

      await ScanLog.create({
        ticketId: ticket._id,
        eventId: ticket.eventId,
        scannedBy: req.user._id,
        location: location || null,
        result: "voucher_redeemed",
        device,
      });

      return res.json({
        success: true,
        valid: true,
        voucherAmount: result.voucherAmount,
        currency: result.currency,
        ticketType: result.ticketType,
        holderName: result.holderName,
      });
    } catch (error) {
      console.error("Voucher scan error:", error);
      return res.status(500).json({ success: false, error: "Voucher scan failed" });
    }
  }
);

// GET /api/vouchers/stats - organizer voucher redemption stats
router.get(
  "/stats",
  verifyToken,
  requireRole(["organizer", "admin"]),
  async (req, res) => {
    try {
      const isAdmin = req.user.role === "admin";
      let eventFilter = {};
      if (!isAdmin) {
        eventFilter = { organizer: req.user._id };
      }

      const events = await Event.find(eventFilter)
        .select("title slug ticketTypes pricing")
        .lean();

      const stats = [];
      for (const ev of events) {
        const ticketTypes = ev.ticketTypes || [];
        const hasAnyVoucher = ticketTypes.some((tt) => tt.voucherAmount != null && tt.voucherAmount > 0);
        if (!hasAnyVoucher) continue;

        const typeNames = ticketTypes.filter((tt) => tt.voucherAmount > 0).map((tt) => tt.name);
        const redeemed = await Ticket.aggregate([
          { $match: { eventId: ev._id, status: "used", voucherRedeemedAt: { $ne: null } } },
          { $group: { _id: "$ticketType", count: { $sum: 1 } } },
        ]);

        const byType = {};
        for (const r of redeemed) {
          byType[r._id] = r.count;
        }

        let totalValue = 0;
        const breakdown = ticketTypes
          .filter((tt) => tt.voucherAmount > 0)
          .map((tt) => {
            const count = byType[tt.name] || 0;
            const value = count * (tt.voucherAmount || 0);
            totalValue += value;
            return {
              ticketType: tt.name,
              voucherAmount: tt.voucherAmount,
              currency: tt.currency || ev.pricing?.currency || "KES",
              redeemedCount: count,
              totalValue: value,
            };
          });

        stats.push({
          eventId: ev._id,
          eventTitle: ev.title,
          eventSlug: ev.slug,
          totalRedeemed: redeemed.reduce((s, r) => s + r.count, 0),
          totalVoucherValue: totalValue,
          breakdown,
        });
      }

      return res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Voucher stats error:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch voucher stats" });
    }
  }
);

module.exports = router;
