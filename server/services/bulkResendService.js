/**
 * Bulk Resend Tickets Service
 * 
 * Handles bulk resending of tickets with updated QR codes to all attendees
 * who have completed payments. Regenerates QR codes and sends updated ticket emails.
 * 
 * @module bulkResendService
 */

const QRCode = require("qrcode");
const ticketService = require("./ticketService");
const mergedTicketReceiptService = require("./mergedTicketReceiptService");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");

class BulkResendService {
  /**
   * Resend tickets for all paid/completed orders
   * 
   * @param {Object} options - Options for bulk resend
   * @param {string} [options.eventId] - Optional event ID to filter orders
   * @param {string} [options.organizerId] - Optional organizer ID to filter events
   * @param {number} [options.batchSize=50] - Number of orders to process per batch
   * @returns {Promise<Object>} Statistics about the bulk resend operation
   */
  async resendTicketsForOrders({ eventId, organizerId, batchSize = 50 } = {}) {
    const stats = {
      totalOrdersFound: 0,
      totalOrdersProcessed: 0,
      totalTicketsUpdated: 0,
      totalEmailsSent: 0,
      totalErrors: 0,
      errors: [],
      emailPreviewUrls: [], // Store Ethereal preview URLs
      startTime: new Date(),
      endTime: null,
    };

    try {
      // Build query for paid/completed orders
      const orderQuery = {
        status: { $in: ["completed", "paid"] },
        paymentStatus: "completed",
        "payment.status": "completed",
      };

      // Add event filter if provided (orders have eventId in items array)
      if (eventId) {
        orderQuery["items.eventId"] = eventId;
      }

      // If organizerId is provided, we need to filter by events owned by that organizer
      if (organizerId && !eventId) {
        const organizerEvents = await Event.find({ organizer: organizerId }).select("_id");
        const eventIds = organizerEvents.map((e) => e._id);
        if (eventIds.length === 0) {
          return {
            ...stats,
            endTime: new Date(),
            message: "No events found for this organizer",
          };
        }
        orderQuery["items.eventId"] = { $in: eventIds };
      }

      // Count total orders matching criteria
      stats.totalOrdersFound = await Order.countDocuments(orderQuery);
      console.log(`📊 Found ${stats.totalOrdersFound} paid/completed orders to process`);

      if (stats.totalOrdersFound === 0) {
        return {
          ...stats,
          endTime: new Date(),
          message: "No paid/completed orders found",
        };
      }

      // Process orders in batches to avoid memory issues
      let skip = 0;
      const totalBatches = Math.ceil(stats.totalOrdersFound / batchSize);

      for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
        console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}...`);

        // Fetch batch of orders (no populate needed - customer info is in order.customer)
        const orders = await Order.find(orderQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(batchSize)
          .lean();

        if (orders.length === 0) {
          break;
        }

        // Process each order in the batch
        for (const order of orders) {
          try {
            await this._processOrder(order, stats);
            stats.totalOrdersProcessed++;
          } catch (error) {
            stats.totalErrors++;
            stats.errors.push({
              orderId: order._id,
              orderNumber: order.orderNumber,
              error: error.message,
              stack: error.stack,
            });
            console.error(
              `❌ Error processing order ${order.orderNumber}:`,
              error.message
            );
            // Continue processing other orders even if one fails
          }
        }

        skip += batchSize;
      }

      stats.endTime = new Date();
      const duration = (stats.endTime - stats.startTime) / 1000;

      console.log(`\n✅ Bulk resend completed in ${duration.toFixed(2)}s`);
      console.log(`   Orders processed: ${stats.totalOrdersProcessed}/${stats.totalOrdersFound}`);
      console.log(`   Tickets updated: ${stats.totalTicketsUpdated}`);
      console.log(`   Emails sent: ${stats.totalEmailsSent}`);
      console.log(`   Errors: ${stats.totalErrors}`);
      
      // Display Ethereal preview URLs if available
      if (stats.emailPreviewUrls.length > 0) {
        console.log(`\n📧 Email Preview URLs (Ethereal):`);
        stats.emailPreviewUrls.forEach((email, index) => {
          console.log(`   ${index + 1}. ${email.customerEmail} (${email.orderNumber})`);
          console.log(`      ${email.previewUrl}`);
        });
      }

      return stats;
    } catch (error) {
      stats.endTime = new Date();
      stats.totalErrors++;
      stats.errors.push({
        error: error.message,
        stack: error.stack,
      });
      console.error("❌ Bulk resend failed:", error);
      throw error;
    }
  }

  /**
   * Process a single order: regenerate QR codes and send email
   * 
   * @private
   * @param {Object} order - Order document (can be lean)
   * @param {Object} stats - Statistics object to update
   */
  async _processOrder(order, stats) {
    // Fetch full order document (customer info is already in order.customer)
    const fullOrder = await Order.findById(order._id);

    if (!fullOrder) {
      throw new Error(`Order ${order._id} not found`);
    }

    // Get all tickets for this order with event populated
    const tickets = await Ticket.find({ orderId: fullOrder._id })
      .populate("eventId");

    if (tickets.length === 0) {
      console.log(`⚠️  No tickets found for order ${fullOrder.orderNumber}`);
      return;
    }

    // Get the event from the first ticket (assuming all tickets are for the same event)
    // If multiple events, we'll use the first one for the email
    const event = tickets[0].eventId;
    if (!event) {
      throw new Error(`Event not found for tickets in order ${fullOrder.orderNumber}`);
    }

    console.log(
      `\n🎫 Processing order ${fullOrder.orderNumber} (${tickets.length} ticket(s))...`
    );

    // Regenerate QR codes for all tickets
    const updatedTickets = [];
    for (const ticket of tickets) {
      try {
        // Generate new QR code using ticketService.issueQr with rotate: true
        const qrResult = await ticketService.issueQr(ticket._id.toString(), {
          rotate: true, // Force regeneration of QR code
        });

        // Generate QR code image (base64) for email
        const qrCodeDataURL = await QRCode.toDataURL(qrResult.qr, {
          errorCorrectionLevel: "H", // Highest error correction for reliability
          type: "image/png",
          width: 350, // Optimized size for mobile viewing
          margin: 3, // Good margin for better scanning
          color: {
            dark: "#000000", // Pure black for maximum contrast
            light: "#FFFFFF", // Pure white for maximum contrast
          },
        });

        // Update ticket with new QR code data
        ticket.qrCode = qrResult.qr; // New format string
        ticket.qrCodeUrl = qrCodeDataURL; // High quality image for email
        // ticket.qr is already updated by ticketService.issueQr()
        // Includes: nonce, issuedAt, expiresAt, signature

        await ticket.save();
        updatedTickets.push(ticket);
        stats.totalTicketsUpdated++;

        console.log(
          `  ✅ QR code regenerated for ticket ${ticket.ticketNumber}`
        );
      } catch (error) {
        console.error(
          `  ❌ Error updating QR code for ticket ${ticket.ticketNumber}:`,
          error.message
        );
        throw error; // Re-throw to be caught by outer try-catch
      }
    }

    // Send email with updated tickets
    try {
      const customerEmail =
        fullOrder.customer?.email ||
        fullOrder.customer?.userId?.email ||
        fullOrder.customerEmail;
      const customerName =
        fullOrder.customer?.firstName && fullOrder.customer?.lastName
          ? `${fullOrder.customer.firstName} ${fullOrder.customer.lastName}`
          : fullOrder.customer?.userId?.name ||
            fullOrder.customerName ||
            "Customer";

      const emailResult = await mergedTicketReceiptService.sendTicketAndReceipt({
        order: fullOrder,
        tickets: updatedTickets,
        customerEmail,
        customerName,
        event: event,
      });

      stats.totalEmailsSent++;
      
      // Capture Ethereal preview URL if available
      if (emailResult.previewUrl) {
        stats.emailPreviewUrls.push({
          orderNumber: fullOrder.orderNumber,
          customerEmail: customerEmail,
          previewUrl: emailResult.previewUrl,
        });
        console.log(`  ✅ Email sent to ${customerEmail}`);
        console.log(`  📧 Preview: ${emailResult.previewUrl}`);
      } else {
        console.log(`  ✅ Email sent to ${customerEmail}`);
      }
    } catch (error) {
      console.error(
        `  ❌ Error sending email for order ${fullOrder.orderNumber}:`,
        error.message
      );
      // Don't throw here - we've already updated the QR codes, so continue
      // The error will be logged in stats.errors
      stats.totalErrors++;
      stats.errors.push({
        orderId: fullOrder._id,
        orderNumber: fullOrder.orderNumber,
        error: `Email send failed: ${error.message}`,
      });
    }
  }
}

module.exports = new BulkResendService();

