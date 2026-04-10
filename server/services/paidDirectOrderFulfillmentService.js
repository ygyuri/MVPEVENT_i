/**
 * After a direct-checkout order is marked paid (PayHero callback or dev skip),
 * generate ticket QRs, send account-creation email for auto-provisioned users,
 * and send the merged ticket + receipt email.
 */
const QRCode = require("qrcode");
const ticketService = require("./ticketService");
const emailService = require("./emailService");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
async function fulfillPaidDirectOrder(orderRef) {
  const order = await Order.findById(orderRef._id || orderRef);
  if (!order) {
    console.warn("fulfillPaidDirectOrder: order not found");
    return;
  }

  const ps = order.paymentStatus;
  if (ps !== "completed" && ps !== "paid") {
    console.warn(
      `fulfillPaidDirectOrder: skip order ${order.orderNumber} paymentStatus=${ps}`
    );
    return;
  }

  try {
    const tickets = await Ticket.find({ orderId: order._id });
    console.log(
      `🎫 [fulfill-paid-direct] Processing ${tickets.length} tickets for QR generation...`
    );

    for (const ticket of tickets) {
      try {
        const qrResult = await ticketService.issueQr(ticket._id.toString(), {
          rotate: false,
        });

        const qrCodeDataURL = await QRCode.toDataURL(qrResult.qr, {
          errorCorrectionLevel: "M",
          type: "image/png",
          width: 400,
          margin: 4,
          color: { dark: "#000000", light: "#FFFFFF" },
        });

        ticket.qrCode = qrResult.qr;
        ticket.qrCodeUrl = qrCodeDataURL;
        await ticket.save();
        console.log(
          `✅ QR code generated for ticket: ${ticket.ticketNumber} (wallet format)`
        );
      } catch (ticketQrError) {
        console.error(
          `❌ Failed to generate QR for ticket ${ticket.ticketNumber}:`,
          ticketQrError
        );
      }
    }

    console.log(
      `✅ All ${tickets.length} QR codes processed for order ${order.orderNumber}`
    );
  } catch (qrError) {
    console.error("❌ QR code generation failed:", qrError);
  }

  if (order.isGuestOrder && order.customer.userId) {
    try {
      const user = await User.findById(order.customer.userId).select(
        "+tempPassword"
      );

      if (
        user &&
        user.accountStatus === "pending_activation" &&
        user.tempPassword &&
        !user.welcomeEmailSent
      ) {
        await emailService.sendAccountCreationEmail({
          email: user.email,
          firstName: user.firstName,
          tempPassword: user.tempPassword,
          orderNumber: order.orderNumber,
        });

        user.welcomeEmailSent = true;
        await user.save();

        console.log("✅ Welcome email sent to new user:", user.email);
      } else if (user?.welcomeEmailSent) {
        console.log("ℹ️  Welcome email already sent to:", user.email);
      }
    } catch (emailError) {
      console.error("❌ Failed to send welcome email:", emailError);
    }
  }

  try {
    const tickets = await Ticket.find({ orderId: order._id }).populate(
      "eventId",
      "title dates location"
    );

    if (!tickets || tickets.length === 0) {
      console.warn(
        `⚠️  No tickets found for order ${order.orderNumber}. Email will not be sent.`
      );
    } else if (
      order.paymentStatus !== "completed" &&
      order.paymentStatus !== "paid"
    ) {
      console.warn(
        `⚠️  Order ${order.orderNumber} is not fully paid. Email will not be sent.`
      );
    } else if (!order.customer?.email) {
      console.warn(
        `⚠️  No customer email for order ${order.orderNumber}. Email cannot be sent.`
      );
    } else {
      await emailService.sendTicketEmail({
        order,
        tickets,
        customerEmail: order.customer.email,
        customerName:
          `${order.customer.firstName || ""} ${
            order.customer.lastName || ""
          }`.trim() ||
          order.customer.name ||
          "Customer",
      });

      console.log(
        `✅ Ticket email with payment receipt sent to: ${order.customer.email} (${tickets.length} tickets)`
      );
    }
  } catch (emailError) {
    console.error("❌ Failed to send ticket email:", emailError);
    console.error("❌ Error details:", emailError.message, emailError.stack);
  }
}

module.exports = {
  fulfillPaidDirectOrder,
};
