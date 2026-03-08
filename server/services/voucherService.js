const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const ticketService = require("./ticketService");

const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Redeem a pre-verified ticket for its voucher value (second scan after entry).
 * Requires: ticket status='used', voucherRedeemedAt null, event has voucherAmount for this ticket type.
 * @param {Object} ticket - Mongoose ticket doc (must have eventId, ticketType, status, holder, metadata)
 * @param {Object} event - Mongoose event doc with ticketTypes, pricing
 */
async function redeemByTicket(ticket, event, user, { location } = {}) {

  const eventPopulated = event && event.ticketTypes ? event : await Event.findById(ticket.eventId).select("ticketTypes pricing");

  if (ticket.status === "cancelled" || ticket.status === "refunded") {
    return { ok: false, code: "TICKET_INVALID", message: "Ticket is cancelled or refunded" };
  }

  if (ticket.status !== "used") {
    return { ok: false, code: "NOT_ENTRY_USED", message: "Ticket must be scanned for entry first before voucher redemption" };
  }

  if (ticket.voucherRedeemedAt) {
    return { ok: false, code: "VOUCHER_ALREADY_REDEEMED", message: "Voucher already redeemed", voucherRedeemedAt: ticket.voucherRedeemedAt };
  }

  if (!eventPopulated) {
    return { ok: false, code: "EVENT_NOT_FOUND" };
  }

  const ticketTypeConfig = (eventPopulated.ticketTypes || []).find(
    (tt) => tt.name && String(tt.name).trim().toLowerCase() === String(ticket.ticketType || "").trim().toLowerCase()
  );

  const voucherAmount = ticketTypeConfig?.voucherAmount;
  if (voucherAmount == null || !Number.isFinite(voucherAmount) || voucherAmount <= 0) {
    return { ok: false, code: "NO_VOUCHER_CONFIGURED", message: "No voucher configured for this ticket type" };
  }

  const currency = ticketTypeConfig.currency || eventPopulated.pricing?.currency || "KES";

  // Validity window (same as entry scan)
  const now = new Date();
  const validFrom = ticket.metadata?.validFrom;
  const validUntil = ticket.metadata?.validUntil;
  if (validFrom && now < new Date(validFrom.getTime() - GRACE_PERIOD_MS)) {
    return { ok: false, code: "EVENT_NOT_STARTED", message: "Event has not started yet" };
  }
  if (validUntil && now > new Date(validUntil.getTime() + GRACE_PERIOD_MS)) {
    return { ok: false, code: "EVENT_ENDED", message: "Event has ended" };
  }

  const updateResult = await Ticket.updateOne(
    { _id: ticket._id, status: "used", voucherRedeemedAt: null },
    {
      $set: { voucherRedeemedAt: now, voucherRedeemedBy: user._id },
      $push: { scanHistory: { scannedAt: now, scannedBy: user._id, location: location || null, result: "voucher_redeemed" } },
    }
  );

  if (updateResult && updateResult.modifiedCount !== 1) {
    return { ok: false, code: "VOUCHER_ALREADY_REDEEMED", message: "Voucher could not be redeemed (may already be redeemed)" };
  }

  return {
    ok: true,
    voucherAmount,
    currency,
    ticketType: ticket.ticketType,
    holderName: ticket.holder ? `${ticket.holder.firstName || ""} ${ticket.holder.lastName || ""}`.trim() : "",
  };
}

/**
 * Redeem by QR string - verifies QR first then calls redeemByTicket.
 */
async function redeem(qrString, user, { location } = {}) {
  const verification = await ticketService.verifyQr(qrString);
  if (!verification.ok) {
    return { ok: false, code: verification.code };
  }
  return redeemByTicket(verification.ticket, verification.event, user, { location });
}

module.exports = { redeem, redeemByTicket };
