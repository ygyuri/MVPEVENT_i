const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const QRCode = require("qrcode");
const payheroService = require("../services/payheroService");
const emailService = require("../services/emailService");
const enhancedEmailService = require("../services/enhancedEmailService");
const mergedTicketReceiptService = require("../services/mergedTicketReceiptService");
const orderStatusNotifier = require("../services/orderStatusNotifier");
const payheroResultMapper = require("../services/payheroResultMapper");
const ticketService = require("../services/ticketService");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Event = require("../models/Event");
const ReferralClick = require("../models/ReferralClick");
const ReferralConversion = require("../models/ReferralConversion");
const EventCommissionConfig = require("../models/EventCommissionConfig");
const { body, validationResult } = require("express-validator");
const {
  logWebhookRequest,
  validateCallbackPayload,
  ensureIdempotency,
} = require("../middleware/payheroSecurity");

/**
 * @route GET /api/payhero/wallet-balance
 * @desc Get service wallet balance
 * @access Private (Admin only)
 */
router.get("/wallet-balance", async (req, res) => {
  try {
    const balance = await payheroService.getServiceWalletBalance();
    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error("Wallet balance error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch wallet balance",
    });
  }
});

/**
 * @route GET /api/payhero/payments-balance/:channelId
 * @desc Get payments wallet balance
 * @access Private (Admin only)
 */
router.get("/payments-balance/:channelId", async (req, res) => {
  try {
    const { channelId } = req.params;
    const balance = await payheroService.getPaymentsWalletBalance(channelId);
    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error("Payments balance error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payments balance",
    });
  }
});

/**
 * @route POST /api/payhero/initiate-payment
 * @desc Initiate MPESA STK Push payment
 * @access Public (for guest checkout)
 */
router.post(
  "/initiate-payment",
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("phoneNumber")
      .isLength({ min: 10 })
      .withMessage("Phone number is required"),
    body("customerName")
      .optional()
      .isLength({ min: 2 })
      .withMessage("Customer name must be at least 2 characters"),
    body("orderId").optional().isMongoId().withMessage("Invalid order ID"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const {
        amount,
        phoneNumber,
        customerName,
        orderId,
        channelId,
        provider,
      } = req.body;

      // Validate and format phone number
      const formattedPhone = payheroService.validatePhoneNumber(phoneNumber);

      // Calculate fees
      const feeBreakdown = payheroService.calculateFees(amount);

      // Generate external reference
      const externalReference = payheroService.generateExternalReference();

      // Prepare payment data
      const paymentData = {
        amount: feeBreakdown.totalAmount,
        phoneNumber: formattedPhone,
        customerName: customerName || "Guest Customer",
        channelId: channelId,
        provider: provider || "m-pesa",
        externalReference,
        callbackUrl:
          process.env.PAYHERO_CALLBACK_URL ||
          "https://your-domain.com/api/payhero/callback",
      };

      // Initiate payment with PAYHERO
      const paymentResponse = await payheroService.initiatePayment(paymentData);

      // Verify payment was initiated successfully
      if (!paymentResponse.success && !paymentResponse.CheckoutRequestID) {
        throw new Error(
          "Failed to initiate payment - No checkout request ID received"
        );
      }

      // Create or update order record
      let order;
      if (orderId) {
        order = await Order.findByIdAndUpdate(
          orderId,
          {
            paymentStatus: "pending",
            paymentReference: externalReference,
            checkoutRequestId: paymentResponse.CheckoutRequestID,
            paymentProvider: "payhero",
            paymentData: {
              amount: feeBreakdown.totalAmount,
              phoneNumber: formattedPhone,
              customerName: paymentData.customerName,
            },
            feeBreakdown,
            // Ensure pricing.total is set
            "pricing.total": feeBreakdown.totalAmount,
          },
          { new: true }
        );
      } else {
        // Create new order for guest checkout
        order = new Order({
          customerInfo: {
            name: customerName || "Guest Customer",
            email: req.body.email || null,
            phone: formattedPhone,
          },
          items: req.body.items || [],
          totalAmount: feeBreakdown.totalAmount,
          paymentStatus: "pending",
          paymentReference: externalReference,
          checkoutRequestId: paymentResponse.CheckoutRequestID,
          paymentProvider: "payhero",
          paymentData: {
            amount: feeBreakdown.totalAmount,
            phoneNumber: formattedPhone,
            customerName: paymentData.customerName,
          },
          feeBreakdown,
          isGuestOrder: true,
        });
        await order.save();
      }

      res.json({
        success: true,
        message: "Payment initiated successfully",
        data: {
          orderId: order._id,
          paymentReference: externalReference,
          checkoutRequestId: paymentResponse.CheckoutRequestID,
          status: paymentResponse.status,
          amount: feeBreakdown.totalAmount,
          feeBreakdown,
          phoneNumber: formattedPhone,
        },
      });
    } catch (error) {
      console.error("Initiate payment error:", error);

      // Provide detailed error information
      let errorMessage = "Failed to initiate payment";
      let statusCode = 500;

      if (error.name === "ValidationError") {
        // Mongoose validation error
        errorMessage = `Order validation failed: ${Object.values(error.errors)
          .map((err) => err.message)
          .join(", ")}`;
        statusCode = 400;
      } else if (error.response?.data) {
        // PayHero API error
        errorMessage = `PayHero API Error: ${JSON.stringify(
          error.response.data
        )}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: error.response?.data || null,
      });
    }
  }
);

/**
 * @route POST /api/payhero/verify-payment
 * @desc Verify payment status
 * @access Public
 */
router.post(
  "/verify-payment",
  [
    body("paymentReference")
      .notEmpty()
      .withMessage("Payment reference is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { paymentReference } = req.body;

      // Verify payment status
      const verificationResult = await payheroService.verifyPayment(
        paymentReference
      );

      if (verificationResult.success) {
        res.json({
          success: true,
          message: "Payment verified successfully",
          data: verificationResult,
        });
      } else {
        res.status(400).json({
          success: false,
          error: verificationResult.message || "Payment verification failed",
          data: verificationResult,
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to verify payment",
      });
    }
  }
);

/**
 * @route POST /api/payhero/callback
 * @desc Handle PAYHERO payment callback (ENHANCED for Direct Checkout)
 * @access Public (called by PAYHERO)
 *
 * Security Middleware Applied:
 * 1. logWebhookRequest - Audit logging
 * 2. validateCallbackPayload - Structure validation
 * 3. ensureIdempotency - Prevent duplicate processing
 */
router.post(
  "/callback",
  logWebhookRequest,
  validateCallbackPayload,
  ensureIdempotency,
  async (req, res) => {
    try {
      console.log(
        "🔔 PAYHERO Callback processing started:",
        new Date().toISOString()
      );

      // Process callback data
      const paymentInfo = await payheroService.processCallback(req.body);

      // Find order by external reference
      const order = await Order.findOne({
        "payment.paymentReference": paymentInfo.externalReference,
      }).populate("customer.userId");

      if (!order) {
        console.error(
          "❌ Order not found for external reference:",
          paymentInfo.externalReference
        );
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      console.log("📦 Order found:", {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });

      // Parse payment result using enhanced mapper service with error handling
      let paymentResult;
      try {
        paymentResult = payheroResultMapper.parsePaymentResult(paymentInfo);

        console.log("📊 Payment result parsed:", {
          resultCode: paymentResult.resultCode,
          status: paymentResult.status,
          reason: paymentResult.reason,
          message: paymentResult.message,
          retryable: paymentResult.retryable,
        });

        // Log failure details for analytics
        if (paymentResult.status !== "completed") {
          console.log("⚠️  Payment failure details:", {
            failureReason: paymentResult.reason,
            resultCode: paymentResult.resultCode,
            resultDesc: paymentResult.resultDesc,
            userMessage: paymentResult.message,
            guidance: paymentResult.guidance,
            analyticsCategory: payheroResultMapper.getAnalyticsCategory(
              paymentResult.reason
            ),
          });
        }
      } catch (error) {
        console.error("❌ Error parsing payment result:", error);
        // Fallback to basic status determination for safety
        paymentResult = {
          status: paymentInfo.resultCode === 0 ? "completed" : "failed",
          orderStatus: paymentInfo.resultCode === 0 ? "paid" : "pending",
          reason: "PARSE_ERROR",
          message: "Payment processing error",
          icon: "❌",
          color: "red",
          retryable: true,
          retryDelay: 5000,
          guidance:
            "An error occurred processing your payment. Please contact support.",
          suggestedAction: "CONTACT_SUPPORT",
        };
      }

      // Extract status values
      const paymentStatus = paymentResult.status;
      const orderStatus = paymentResult.orderStatus;

      // Update order with payment details (backward compatible)
      order.payment.status = paymentStatus;
      order.payment.paymentResponse = paymentInfo;
      order.payment.mpesaReceiptNumber = paymentInfo.mpesaReceiptNumber;
      order.payment.paidAt = paymentStatus === "completed" ? new Date() : null;

      // Add enhanced failure information (new fields, backward compatible)
      order.payment.failureReason = paymentResult.reason;
      order.payment.userMessage = paymentResult.message;
      order.payment.retryable = paymentResult.retryable;
      order.payment.failedAt =
        paymentStatus !== "completed" ? new Date() : null;

      order.paymentStatus = paymentStatus;
      order.status = orderStatus;
      order.completedAt = paymentStatus === "completed" ? new Date() : null;

      await order.save();

      console.log(`✅ Order ${order._id} status updated:`, {
        paymentStatus,
        orderStatus,
      });

      // ========== NOTIFY WAITING CLIENTS VIA REDIS PUB/SUB ==========
      // This instantly notifies all long-polling clients waiting for this order
      try {
        await orderStatusNotifier.notifyOrderStatusChange(
          order._id.toString(),
          {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            paymentStatus: order.paymentStatus,
            status: order.status,
            totalAmount: order.totalAmount || order.pricing?.total,
            currency: order.pricing?.currency || "KES",

            // Enhanced failure information (backward compatible - only sent if failure)
            failureReason: paymentResult.reason,
            userMessage: paymentResult.message,
            retryable: paymentResult.retryable,
            failureIcon: paymentResult.icon,
            failureColor: paymentResult.color,
            guidance: paymentResult.guidance,
            suggestedAction: paymentResult.suggestedAction,

            customer: {
              email: order.customer?.email,
              firstName: order.customer?.firstName,
              lastName: order.customer?.lastName,
            },
          }
        );
        console.log("🔔 Redis notification sent to all waiting clients");
      } catch (redisError) {
        console.error(
          "⚠️  Redis notification failed (non-critical):",
          redisError.message
        );
        // Don't fail the callback if Redis fails - clients will use fallback polling
      }

      // ========== ENHANCED PROCESSING FOR SUCCESSFUL PAYMENTS ==========
      if (paymentStatus === "completed") {
        // ===== STEP 1: Generate QR Codes for All Tickets =====
        // Use ticketService.issueQr() - same format as wallet for consistency and better scanning
        // Scanner supports both old and new formats, so existing tickets still work
        try {
          const tickets = await Ticket.find({ orderId: order._id });
          console.log(
            `🎫 Processing ${tickets.length} tickets for QR generation...`
          );

          for (const ticket of tickets) {
            try {
              // Use ticketService.issueQr() - same format as wallet (scannable and secure)
              const qrResult = await ticketService.issueQr(ticket._id.toString(), {
                rotate: false, // Don't rotate, just generate initial QR
              });

              // Generate QR code image for emails - optimized for easy scanning
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

              // Store QR code data
              ticket.qrCode = qrResult.qr; // New format string (same as wallet)
              ticket.qrCodeUrl = qrCodeDataURL; // High quality image for email

              // ticket.qr is already set by ticketService.issueQr()
              // Includes: nonce, issuedAt, expiresAt, signature

              await ticket.save();
              console.log(
                `✅ QR code generated for ticket: ${ticket.ticketNumber} (wallet format, high quality)`
              );
            } catch (ticketQrError) {
              console.error(
                `❌ Failed to generate QR for ticket ${ticket.ticketNumber}:`,
                ticketQrError
              );
              // Continue with other tickets
            }
          }

          console.log(
            `✅ All ${tickets.length} QR codes generated successfully`
          );
        } catch (qrError) {
          console.error("❌ QR code generation failed:", qrError);
          // Don't fail the callback, but log the error
        }

        // ===== STEP 2: Handle New User Welcome Email (Idempotent) =====
        if (order.isGuestOrder && order.customer.userId) {
          try {
            const user = await User.findById(order.customer.userId).select(
              "+tempPassword"
            );

            // Idempotency check: Only send welcome email once
            if (
              user &&
              user.accountStatus === "pending_activation" &&
              user.tempPassword &&
              !user.welcomeEmailSent
            ) {
              // Send welcome email with credentials
              await emailService.sendAccountCreationEmail({
                email: user.email,
                firstName: user.firstName,
                tempPassword: user.tempPassword,
                orderNumber: order.orderNumber,
              });

              // Mark welcome email as sent (idempotency flag)
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

        // ===== STEP 3: Send Ticket Email with Payment Receipt =====
        // IMPORTANT: Only send emails if order is paid AND tickets exist
        try {
          // Fetch tickets with populated event data
          const tickets = await Ticket.find({ orderId: order._id }).populate(
            "eventId",
            "title dates location"
          );

          // CRITICAL: Only send email if tickets exist and order is paid
          if (!tickets || tickets.length === 0) {
            console.warn(
              `⚠️  No tickets found for order ${order.orderNumber}. Email will not be sent.`
            );
            console.warn(
              `⚠️  Order status: ${order.status}, Payment status: ${order.paymentStatus}`
            );
            // Don't throw error - just log and continue
          } else if (
            order.paymentStatus !== "completed" &&
            order.paymentStatus !== "paid"
          ) {
            console.warn(
              `⚠️  Order ${order.orderNumber} is not fully paid. Email will not be sent.`
            );
            console.warn(`⚠️  Payment status: ${order.paymentStatus}`);
          } else {
            // Verify we have customer email
            if (!order.customer?.email) {
              console.warn(
                `⚠️  No customer email for order ${order.orderNumber}. Email cannot be sent.`
              );
            } else {
              // Fetch full event data for email
              const event = await Event.findById(
                order.items[0]?.eventId || tickets[0]?.eventId
              );

              // Use existing emailService for reliability (it has working SMTP config)
              // Send ticket email which now includes payment info
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
                `✅ Ticket email with payment receipt sent successfully to: ${order.customer.email} (${tickets.length} tickets)`
              );
            }
          }
        } catch (emailError) {
          console.error("❌ Failed to send ticket email:", emailError);
          console.error(
            "❌ Error details:",
            emailError.message,
            emailError.stack
          );
          // Log but don't fail callback - payment was successful
        }

        // ===== STEP 4: Process Affiliate Conversion =====
        if (order.hasAffiliateTracking()) {
          try {
            console.log("🤝 Processing affiliate conversion...");

            const tickets = await Ticket.find({ orderId: order._id });

            // Find the most recent click for this affiliate/event/user
            const referralClick = await ReferralClick.findOne({
              affiliate_id: order.affiliateTracking.affiliateId,
              event_id: tickets[0]?.eventId,
              $or: [
                { user_id: order.customer.userId },
                { ip_address: order.metadata?.ipAddress },
              ],
            }).sort({ clicked_at: -1 });

            if (referralClick) {
              // Get commission configuration
              const commissionConfig = await EventCommissionConfig.findOne({
                event_id: tickets[0]?.eventId,
              });

              // Calculate commissions for each ticket
              for (const ticket of tickets) {
                const ticketPrice = ticket.price || 0;
                const platformFee = 0; // Could be calculated based on pricing
                const organizerRevenue = ticketPrice;

                // Default commission rates (5% for affiliate, 3% for agency)
                const affiliateRate =
                  commissionConfig?.affiliate_commission_rate || 0.05;
                const agencyRate =
                  commissionConfig?.primary_agency_commission_rate || 0.03;

                const affiliateCommission = ticketPrice * affiliateRate;
                const agencyCommission = ticketPrice * agencyRate;
                const organizerNet =
                  organizerRevenue - affiliateCommission - agencyCommission;

                // Create conversion record
                const conversion = await ReferralConversion.create({
                  click_id: referralClick._id,
                  link_id: referralClick.link_id,
                  event_id: ticket.eventId,
                  ticket_id: ticket._id,
                  affiliate_id: order.affiliateTracking.affiliateId,
                  agency_id: referralClick.agency_id,
                  attribution_model_used: "last_click",
                  customer_id: order.customer.userId,
                  customer_email: order.customer.email,
                  ticket_price: ticketPrice,
                  platform_fee: platformFee,
                  organizer_revenue: organizerRevenue,
                  primary_agency_commission: agencyCommission,
                  affiliate_commission: affiliateCommission,
                  tier_2_affiliate_commission: 0,
                  organizer_net: organizerNet,
                  commission_config_snapshot: commissionConfig || {},
                  calculation_breakdown: {
                    ticketPrice,
                    affiliateRate,
                    agencyRate,
                    affiliateCommission,
                    agencyCommission,
                    organizerNet,
                  },
                  conversion_status: "confirmed",
                  converted_at: new Date(),
                  confirmed_at: new Date(),
                });

                console.log(`✅ Conversion created:`, {
                  conversionId: conversion._id,
                  ticketId: ticket._id,
                  affiliateCommission,
                });

                // Update click record to mark as converted
                await ReferralClick.updateOne(
                  { _id: referralClick._id },
                  {
                    converted: true,
                    conversion_id: conversion._id,
                  }
                );
              }

              // Mark commission as calculated in order
              const totalCommission = tickets.reduce((sum, ticket) => {
                return (
                  sum +
                  ticket.price *
                    (commissionConfig?.affiliate_commission_rate || 0.05)
                );
              }, 0);

              order.markCommissionCalculated(totalCommission);
              await order.save();

              console.log(
                `✅ Affiliate conversion processing complete. Total commission: ${totalCommission}`
              );
            } else {
              console.log("⚠️ No referral click found for conversion tracking");
            }
          } catch (conversionError) {
            console.error(
              "❌ Affiliate conversion processing failed:",
              conversionError
            );
            // Don't fail callback
          }
        }

        // ===== Receipt email merged with ticket email in Step 3 =====
        // This reduces email spam from 3 emails to 2 emails:
        // 1. Welcome email (if new user)
        // 2. Merged ticket + receipt email (always sent)
        console.log("✅ Payment receipt included in merged ticket email");
      }

      // ========== END ENHANCED PROCESSING ==========

      res.json({
        success: true,
        message: "Callback processed successfully",
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus,
          orderStatus,
        },
      });
    } catch (error) {
      console.error("❌ Callback processing error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process callback",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route GET /api/payhero/payment-status/:orderId
 * @desc Get payment status for an order
 * @access Public
 */
router.get("/payment-status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).select(
      "paymentStatus paymentReference checkoutRequestId paymentResponse feeBreakdown totalAmount"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        paymentReference: order.paymentReference,
        checkoutRequestId: order.checkoutRequestId,
        totalAmount: order.totalAmount,
        feeBreakdown: order.feeBreakdown,
        paymentResponse: order.paymentResponse,
      },
    });
  } catch (error) {
    console.error("Payment status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment status",
    });
  }
});

/**
 * @route POST /api/payhero/calculate-fees
 * @desc Calculate payment fees for given amount
 * @access Public
 */
router.post(
  "/calculate-fees",
  [body("amount").isNumeric().withMessage("Amount must be a number")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { amount } = req.body;
      const feeBreakdown = payheroService.calculateFees(amount);

      res.json({
        success: true,
        data: feeBreakdown,
      });
    } catch (error) {
      console.error("Calculate fees error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to calculate fees",
      });
    }
  }
);

module.exports = router;
