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
   * Delay between email sends to avoid rate limiting (ms)
   * Gmail: ~100 emails/day for free, ~500/day for workspace
   * Adjust based on your SMTP provider
   */
  EMAIL_DELAY_MS = parseInt(process.env.BULK_EMAIL_DELAY_MS || "150", 10);

  /**
   * Max retry attempts for failed email sends
   */
  MAX_EMAIL_RETRIES = parseInt(process.env.BULK_EMAIL_MAX_RETRIES || "2", 10);

  /**
   * Delay before retrying failed email (ms)
   */
  RETRY_DELAY_MS = parseInt(process.env.BULK_EMAIL_RETRY_DELAY_MS || "1000", 10);

  /**
   * Flag to track if MongoDB supports transactions
   * Detected once at service initialization
   * @private
   */
  _transactionsSupported = null;

  /**
   * Flag to track if transaction warning has been shown
   * @private
   */
  _transactionWarningShown = false;

  /**
   * Sleep utility for rate limiting
   * @private
   */
  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Detect if MongoDB supports transactions (requires replica set)
   * This is called once and cached to avoid repeated checks
   * @private
   */
  async _detectTransactionSupport() {
    // Return cached result if already detected
    if (this._transactionsSupported !== null) {
      return this._transactionsSupported;
    }

    let session = null;
    try {
      // Try to start a session and transaction with an actual database operation
      // This is the only reliable way to test if transactions work
      session = await Order.startSession();
      await session.startTransaction();

      // Perform a test query with the session - this will fail on standalone MongoDB
      await Order.findOne().session(session).lean();

      // If we get here, transactions are fully supported
      await session.abortTransaction();
      session.endSession();

      this._transactionsSupported = true;
      console.log('✅ MongoDB transactions are supported (replica set detected)');
      return true;
    } catch (error) {
      // Transactions not supported (standalone MongoDB)
      if (session) {
        try {
          session.endSession();
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      this._transactionsSupported = false;
      console.log('ℹ️  MongoDB transactions not supported (standalone mode) - bulk resend will continue without atomicity guarantees');
      return false;
    }
  }
  /**
   * Resend tickets for all paid/completed orders
   *
   * @param {Object} options - Options for bulk resend
   * @param {string} [options.eventId] - Optional event ID to filter orders
   * @param {string} [options.organizerId] - Optional organizer ID to filter events
   * @param {string} [options.startDate] - Optional start date (ISO8601) to filter orders by createdAt
   * @param {string} [options.endDate] - Optional end date (ISO8601) to filter orders by createdAt
   * @param {number} [options.batchSize=50] - Number of orders to process per batch
   * @param {boolean} [options.skipRecentlyResent=true] - Skip orders resent recently
   * @param {number} [options.recentWindowMinutes=30] - Window in minutes for recent resends
   * @param {Function} [options.progressCallback] - Callback for real-time progress updates
   * @param {boolean} [options.dryRun=false] - If true, simulate without sending emails or saving changes
   * @returns {Promise<Object>} Statistics about the bulk resend operation
   */
  async resendTicketsForOrders({
    eventId,
    organizerId,
    startDate,
    endDate,
    batchSize = 50,
    skipRecentlyResent = true,
    recentWindowMinutes = 30,
    progressCallback,
    dryRun = false,
  } = {}) {
    const stats = {
      totalOrdersFound: 0,
      totalOrdersProcessed: 0,
      totalOrdersSkipped: 0,
      totalTicketsUpdated: 0,
      totalEmailsSent: 0,
      totalEmailRetries: 0,
      totalErrors: 0,
      errors: [],
      emailPreviewUrls: [], // Store Ethereal preview URLs
      startTime: new Date(),
      endTime: null,
    };

    // Log dry run mode if enabled
    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE ENABLED - No emails will be sent, no changes will be saved\n');
    }

    // Detect transaction support once at the start
    await this._detectTransactionSupport();

    try {
      // Build query for paid/completed orders
      // Accept orders where payment.status is completed (most reliable indicator)
      // and status is either completed or paid
      const orderQuery = {
        status: { $in: ["completed", "paid"] },
        "payment.status": "completed",
      };

      // Skip orders that were recently resent (duplicate prevention)
      if (skipRecentlyResent && recentWindowMinutes > 0) {
        const recentCutoff = new Date(
          Date.now() - recentWindowMinutes * 60 * 1000
        );
        orderQuery.$or = [
          { "metadata.lastBulkResendAt": { $exists: false } },
          { "metadata.lastBulkResendAt": { $lt: recentCutoff } },
        ];
        console.log(
          `⏭️  Skipping orders resent within last ${recentWindowMinutes} minutes`
        );
      }

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

      // Add date range filter if provided
      if (startDate || endDate) {
        orderQuery.createdAt = {};
        if (startDate) {
          orderQuery.createdAt.$gte = new Date(startDate);
          console.log(`📅 Filtering orders from: ${new Date(startDate).toISOString()}`);
        }
        if (endDate) {
          orderQuery.createdAt.$lte = new Date(endDate);
          console.log(`📅 Filtering orders until: ${new Date(endDate).toISOString()}`);
        }
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
        for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          try {
            await this._processOrder(order, stats, dryRun);
            stats.totalOrdersProcessed++;

            // Emit progress update if callback provided
            if (progressCallback && typeof progressCallback === 'function') {
              const percentage = Math.round((stats.totalOrdersProcessed / stats.totalOrdersFound) * 100);
              progressCallback({
                status: 'in_progress',
                progress: {
                  current: stats.totalOrdersProcessed,
                  total: stats.totalOrdersFound,
                  percentage,
                },
                stats: {
                  totalOrdersFound: stats.totalOrdersFound,
                  ordersProcessed: stats.totalOrdersProcessed,
                  ordersSkipped: stats.totalOrdersSkipped,
                  ticketsUpdated: stats.totalTicketsUpdated,
                  emailsSent: stats.totalEmailsSent,
                  emailRetries: stats.totalEmailRetries,
                  errors: stats.totalErrors,
                },
                currentOrder: {
                  orderNumber: order.orderNumber,
                  customerEmail: order.customer?.email || order.customerEmail,
                },
                timestamp: new Date(),
              });
            }

            // Rate limiting: Add delay between emails to avoid SMTP rate limits
            // Skip delay for the last order in the last batch
            const isLastOrder =
              batchNum === totalBatches && i === orders.length - 1;
            if (!isLastOrder && this.EMAIL_DELAY_MS > 0) {
              await this._sleep(this.EMAIL_DELAY_MS);
            }
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
      console.log(
        `   Orders processed: ${stats.totalOrdersProcessed}/${stats.totalOrdersFound}`
      );
      if (stats.totalOrdersSkipped > 0) {
        console.log(`   Orders skipped: ${stats.totalOrdersSkipped}`);
      }
      console.log(`   Tickets updated: ${stats.totalTicketsUpdated}`);
      console.log(`   Emails sent: ${stats.totalEmailsSent}`);
      if (stats.totalEmailRetries > 0) {
        console.log(`   Email retries: ${stats.totalEmailRetries}`);
      }
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
   * Uses MongoDB transactions to ensure atomicity - QR codes are only saved if email succeeds
   * Falls back to non-transactional mode if running on standalone MongoDB
   *
   * @private
   * @param {Object} order - Order document (can be lean)
   * @param {Object} stats - Statistics object to update
   * @param {boolean} dryRun - If true, simulate without sending emails or saving changes
   */
  async _processOrder(order, stats, dryRun = false) {
    // Use transactions only if supported (detected at service startup)
    let session = null;

    if (!dryRun && this._transactionsSupported === true) {
      // Transactions are supported - use them for atomicity
      session = await Order.startSession();
      await session.startTransaction();
    }

    try {
      // Fetch full order document (customer info is already in order.customer)
      const query = Order.findById(order._id);
      const fullOrder = session ? await query.session(session) : await query;

      if (!fullOrder) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        throw new Error(`Order ${order._id} not found`);
      }

      // Get all tickets for this order with event populated
      const ticketQuery = Ticket.find({ orderId: fullOrder._id }).populate("eventId");
      const tickets = session ? await ticketQuery.session(session) : await ticketQuery;

      if (tickets.length === 0) {
        console.log(`⚠️  No tickets found for order ${fullOrder.orderNumber}`);
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return;
      }

      // Get the event from the first ticket (assuming all tickets are for the same event)
      // If multiple events, we'll use the first one for the email
      const event = tickets[0].eventId;
      if (!event) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        throw new Error(`Event not found for tickets in order ${fullOrder.orderNumber}`);
      }

      console.log(
        `\n🎫 Processing order ${fullOrder.orderNumber} (${tickets.length} ticket(s))...`
      );

      // Regenerate QR codes for all tickets (IN MEMORY - don't save yet)
      const ticketUpdates = [];
      for (const ticket of tickets) {
        try {
          // Generate new QR code using ticketService.issueQr with rotate: true
          const qrResult = await ticketService.issueQr(ticket._id.toString(), {
            rotate: true, // Force regeneration of QR code
          });

          // Generate QR code image (base64) for email - optimized for easy scanning
          const qrCodeDataURL = await QRCode.toDataURL(qrResult.qr, {
            errorCorrectionLevel: "M", // Medium error correction - easier to scan than "H"
            type: "image/png",
            width: 400, // Larger size for better scanning
            margin: 4, // Larger margin for better scanning
            color: {
              dark: "#000000", // Pure black for maximum contrast
              light: "#FFFFFF", // Pure white for maximum contrast
            },
          });

          // Store update data in memory (don't save to DB yet)
          ticketUpdates.push({
            ticket,
            qrCode: qrResult.qr,
            qrCodeUrl: qrCodeDataURL,
          });

          console.log(
            `  ✅ QR code generated for ticket ${ticket.ticketNumber}`
          );
        } catch (error) {
          console.error(
            `  ❌ Error generating QR code for ticket ${ticket.ticketNumber}:`,
            error.message
          );
          if (session) {
            await session.abortTransaction();
            session.endSession();
          }
          throw error;
        }
      }

      // Prepare email data
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

      // Validate email address before attempting to send
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!customerEmail || !emailRegex.test(customerEmail)) {
        console.warn(
          `  ⚠️  Invalid or missing email for order ${fullOrder.orderNumber}: ${customerEmail || "N/A"}`
        );
        stats.totalOrdersSkipped++;
        stats.totalErrors++;
        stats.errors.push({
          orderId: fullOrder._id,
          orderNumber: fullOrder.orderNumber,
          error: `Invalid or missing email address: ${customerEmail || "N/A"}`,
        });
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return; // Skip this order
      }

      // Prepare tickets with updated QR data for email (not yet saved to DB)
      const ticketsForEmail = ticketUpdates.map((update) => ({
        ...update.ticket.toObject(),
        qrCode: update.qrCode,
        qrCodeUrl: update.qrCodeUrl,
      }));

      let emailSent = false;
      let lastError = null;

      // DRY RUN: Skip email sending, just simulate
      if (dryRun) {
        console.log(`  🔍 DRY RUN: Would send email to ${customerEmail} with ${ticketsForEmail.length} ticket(s)`);
        emailSent = true;
        stats.totalEmailsSent++;
      } else {
        // Retry email sending up to MAX_EMAIL_RETRIES times
        for (let attempt = 1; attempt <= this.MAX_EMAIL_RETRIES; attempt++) {
          try {
            const emailResult =
              await mergedTicketReceiptService.sendTicketAndReceipt({
                order: fullOrder,
                tickets: ticketsForEmail,
                customerEmail,
                customerName,
                event: event,
              });

          emailSent = true;
          stats.totalEmailsSent++;

          // Track retries
          if (attempt > 1) {
            stats.totalEmailRetries += attempt - 1;
          }

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
            console.log(
              `  ✅ Email sent to ${customerEmail}${attempt > 1 ? ` (retry ${attempt - 1})` : ""}`
            );
          }

          break; // Success - exit retry loop
        } catch (error) {
          lastError = error;
          console.error(
            `  ⚠️  Email attempt ${attempt}/${this.MAX_EMAIL_RETRIES} failed for order ${fullOrder.orderNumber}:`,
            error.message
          );

          // Wait before retrying (except on last attempt)
          if (attempt < this.MAX_EMAIL_RETRIES) {
            await this._sleep(this.RETRY_DELAY_MS);
          }
        }
        }
      } // End of dry run else block

      // If email sending succeeded, save tickets and commit transaction
      if (emailSent) {
        if (dryRun) {
          // DRY RUN: Simulate ticket updates without saving
          console.log(`  🔍 DRY RUN: Would update ${ticketUpdates.length} ticket(s) with new QR codes`);
          stats.totalTicketsUpdated += ticketUpdates.length;
        } else {
          // NOW save the tickets with updated QR codes to database
          for (const update of ticketUpdates) {
            update.ticket.qrCode = update.qrCode;
            update.ticket.qrCodeUrl = update.qrCodeUrl;
            // Save with session if transactions are supported
            if (session) {
              await update.ticket.save({ session });
            } else {
              await update.ticket.save();
            }
            stats.totalTicketsUpdated++;
          }

          // Update order metadata with last bulk resend timestamp
          fullOrder.metadata = fullOrder.metadata || {};
          fullOrder.metadata.lastBulkResendAt = new Date();
          if (session) {
            await fullOrder.save({ session });
          } else {
            await fullOrder.save();
          }

          // Commit transaction if using transactions
          if (session) {
            await session.commitTransaction();
            session.endSession();
            console.log(
              `  ✅ Transaction committed: ${ticketUpdates.length} ticket(s) updated`
            );
          } else {
            console.log(
              `  ✅ Changes saved: ${ticketUpdates.length} ticket(s) updated`
            );
          }
        }
      } else {
        // Email failed - rollback transaction (no DB changes)
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }

        console.error(
          `  ❌ All email attempts failed for order ${fullOrder.orderNumber} - transaction rolled back`
        );
        stats.totalErrors++;
        stats.errors.push({
          orderId: fullOrder._id,
          orderNumber: fullOrder.orderNumber,
          error: `Email send failed after ${this.MAX_EMAIL_RETRIES} attempts: ${lastError?.message}`,
        });
      }
    } catch (error) {
      // Unexpected error - rollback transaction
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw error;
    }
  }

}

module.exports = new BulkResendService();

