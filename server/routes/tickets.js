const express = require("express");
const { body, param, validationResult } = require("express-validator");
const {
  verifyToken,
  requireRole,
  optionalAuth,
} = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const Order = require("../models/Order");
const User = require("../models/User");
const EventStaff = require("../models/EventStaff");
const ScanLog = require("../models/ScanLog");
const ReferralLink = require("../models/ReferralLink");
const ticketService = require("../services/ticketService");
const conversionService = require("../services/conversionService");
const payheroService = require("../services/payheroService");
const emailService = require("../services/emailService");
// Rate limiting
const qrIssueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const scanLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 purchase attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many purchase attempts. Please try again later.",
});

const router = express.Router();

// Helper: standard validation handler
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
  }
}

// ============= DIRECT PURCHASE ENDPOINT (Simplified Checkout Flow) =============

/**
 * POST /api/tickets/direct-purchase
 * Simplified direct checkout with auto-account creation
 * Handles: validation, user creation, order creation, ticket generation, payment initiation
 */
router.post(
  "/direct-purchase",
  purchaseLimiter,
  optionalAuth, // Allow both guest and authenticated users
  [
    body("eventId").isMongoId().withMessage("Invalid event ID"),
    body("ticketType")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Ticket type is required"),
    body("quantity")
      .isInt({ min: 1, max: 20 })
      .withMessage("Quantity must be between 1 and 20"),
    body("email")
      .isEmail()
      .withMessage("Valid email is required"),
    body("phone")
      .isMobilePhone("any")
      .withMessage("Valid phone number is required"),
    body("firstName")
      .trim()
      .notEmpty()
      .isLength({ max: 50 })
      .withMessage("First name is required"),
    body("lastName")
      .trim()
      .notEmpty()
      .isLength({ max: 50 })
      .withMessage("Last name is required"),
    body("referralCode").optional().isString().trim().toUpperCase(),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    try {
      const {
        eventId,
        ticketType,
        quantity,
        email,
        phone,
        firstName,
        lastName,
        referralCode,
      } = req.body;

      console.log("🎫 Direct purchase initiated:", {
        eventId,
        ticketType,
        quantity,
        email,
      });

      // ========== STEP 1: Validate Event & Ticket Availability ==========
      const event = await Event.findById(eventId)
        .populate("organizer", "firstName lastName email")
        .lean();

      if (!event) {
        return res.status(404).json({
          success: false,
          error: "Event not found",
        });
      }

      if (event.status !== "published") {
        return res.status(400).json({
          success: false,
          error: "Event is not available for purchase",
        });
      }

      // Find the specific ticket type (trim whitespace for robust matching)
      const ticketTypeData = event.ticketTypes?.find(
        (tt) => tt.name?.trim() === ticketType?.trim()
      );

      if (!ticketTypeData) {
        console.error("❌ Ticket type mismatch:", {
          requested: `"${ticketType}"`,
          available: event.ticketTypes?.map((tt) => `"${tt.name}"`),
          eventId,
          eventSlug: event.slug,
        });

        return res.status(404).json({
          success: false,
          error: "Ticket type not found",
          debug:
            process.env.NODE_ENV !== "production"
              ? {
                  requested: ticketType,
                  available: event.ticketTypes?.map((tt) => tt.name),
                }
              : undefined,
        });
      }

      // Check ticket availability
      if (
        ticketTypeData.quantity !== undefined &&
        ticketTypeData.quantity < quantity
      ) {
        return res.status(400).json({
          success: false,
          error: `Only ${ticketTypeData.quantity} tickets available`,
        });
      }

      // Check sales window
      const now = new Date();
      if (
        ticketTypeData.salesStart &&
        now < new Date(ticketTypeData.salesStart)
      ) {
        return res.status(400).json({
          success: false,
          error: "Ticket sales have not started yet",
        });
      }

      if (ticketTypeData.salesEnd && now > new Date(ticketTypeData.salesEnd)) {
        return res.status(400).json({
          success: false,
          error: "Ticket sales have ended",
        });
      }

      // Check quantity limits
      if (ticketTypeData.minPerOrder && quantity < ticketTypeData.minPerOrder) {
        return res.status(400).json({
          success: false,
          error: `Minimum ${ticketTypeData.minPerOrder} tickets required`,
        });
      }

      if (ticketTypeData.maxPerOrder && quantity > ticketTypeData.maxPerOrder) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${ticketTypeData.maxPerOrder} tickets allowed`,
        });
      }

      // ========== STEP 2: Handle User (Create or Use Existing) ==========
      // Preserve original email format (don't remove dots from Gmail)
      const normalizedEmail = email.toLowerCase().trim();
      let user = await User.findOne({ email: normalizedEmail });

      // For Gmail addresses, also check variations with/without dots
      if (!user && normalizedEmail.includes("@gmail.com")) {
        const localPart = normalizedEmail.split("@")[0];
        const domain = normalizedEmail.split("@")[1];
        
        // Try without dots if email has dots
        if (localPart.includes(".")) {
          const withoutDots = localPart.replace(/\./g, "") + "@" + domain;
          user = await User.findOne({ email: withoutDots });
        } else {
          // Try with dots (search for any Gmail variation)
          const escapedLocalPart = localPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const gmailRegex = new RegExp(`^${escapedLocalPart}(\\.|)@gmail\\.com$`, "i");
          const users = await User.find({ email: { $regex: gmailRegex } });
          // Prioritize user with dots (usually the original registered email)
          user = users.find((u) => u.email.includes(".")) || users[0];
        }
      }

      let isNewUser = false;
      let tempPassword = null;

      if (!user) {
        // Create new user with auto-generated credentials
        isNewUser = true;

        // Generate temporary password (8 chars: letters + numbers)
        tempPassword = crypto.randomBytes(4).toString("hex").toUpperCase();

        // Generate unique username from email (preserve dots for uniqueness)
        const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9.]/g, "");
        let username = baseUsername;
        let usernameExists = await User.findOne({ username });
        let counter = 1;

        while (usernameExists) {
          username = `${baseUsername}${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        // Create user with pending activation status
        // Preserve original email format as entered by user
        user = new User({
          email: normalizedEmail, // Use original format, just lowercased
          username,
          name: `${firstName} ${lastName}`.trim(), // Set name field explicitly
          firstName,
          lastName,
          profile: { phone },
          role: "customer",
          accountStatus: "pending_activation",
          passwordResetRequired: true,
          emailVerified: false,
        });

        // Set temporary password
        await user.setTempPassword(tempPassword);
        await user.save();

        console.log("✅ New user created:", {
          userId: user._id,
          username,
          email,
        });
      } else {
        console.log("✅ Existing user found:", { userId: user._id, email });
      }

      // ========== STEP 3: Handle Affiliate Tracking ==========
      let affiliateData = {
        referralCode: null,
        affiliateId: null,
      };

      if (referralCode) {
        const referralLink = await ReferralLink.findOne({
          referral_code: referralCode,
          event_id: eventId,
          status: "active",
          deleted_at: null,
        }).lean();

        if (referralLink) {
          // Validate referral link
          const isNotExpired =
            !referralLink.expires_at || new Date(referralLink.expires_at) > now;
          const hasUsesLeft =
            !referralLink.max_uses ||
            referralLink.current_uses < referralLink.max_uses;

          if (isNotExpired && hasUsesLeft) {
            affiliateData.referralCode = referralLink.referral_code;
            affiliateData.affiliateId = referralLink.affiliate_id;
            console.log("✅ Affiliate tracking applied:", {
              referralCode,
              affiliateId: affiliateData.affiliateId,
            });
          }
        }
      }

      // ========== STEP 4: Calculate Pricing ==========
      const unitPrice = ticketTypeData.price || 0;
      const subtotal = unitPrice * quantity;
      const serviceFee = 0; // No service fee for now
      const currency =
        ticketTypeData.currency || event.pricing?.currency || "KES";

      // Calculate transaction fee based on tier table
      const transactionFeeService = require("../services/transactionFeeService");
      const feeCalculation =
        await transactionFeeService.calculateTransactionFee(subtotal, currency);
      const transactionFee = feeCalculation.fee || 0;
      const transactionFeeDetails = feeCalculation.feeDetails || null;

      // Total amount includes transaction fee (not shown on ticket, but charged)
      const totalAmount = subtotal + serviceFee + transactionFee;

      console.log("💰 Pricing calculated:", {
        unitPrice,
        quantity,
        subtotal,
        serviceFee,
        transactionFee,
        totalAmount,
        currency,
        feeTier: transactionFeeDetails?.tierName,
      });

      // ========== STEP 5: Create Order Record ==========
      // Create full name for consistent usage across the order
      const fullName = `${firstName} ${lastName}`.trim();

      const order = new Order({
        customer: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: fullName, // Add full name field
          phone,
        },
        isGuestOrder: isNewUser,
        purchaseSource: "direct_checkout", // Key field for simplified checkout
        items: [
          {
            eventId: event._id,
            eventTitle: event.title,
            ticketType: ticketType,
            quantity,
            unitPrice,
            subtotal,
          },
        ],
        pricing: {
          subtotal,
          serviceFee,
          transactionFee: transactionFee,
          transactionFeeDetails: transactionFeeDetails
            ? {
                tierId: transactionFeeDetails.tierId,
                tierName: transactionFeeDetails.tierName,
                feeType: transactionFeeDetails.feeType,
                amountRange: transactionFeeDetails.amountRange,
              }
            : undefined,
          total: totalAmount,
          currency,
        },
        totalAmount, // For PayHero compatibility
        status: "pending",
        paymentStatus: "pending",
        payment: {
          method: "payhero",
          status: "pending",
        },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          source: "direct_checkout_web",
        },
      });

      // Set affiliate tracking if present
      if (affiliateData.referralCode) {
        order.setAffiliateTracking(
          affiliateData.referralCode,
          affiliateData.affiliateId
        );
      }

      await order.save();
      console.log("✅ Order created:", {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });

      // ========== STEP 6: Create Ticket Records ==========
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = new Ticket({
          orderId: order._id,
          eventId: event._id,
          ownerUserId: user._id,
          holder: {
            firstName: user.firstName,
            lastName: user.lastName,
            name: fullName, // Add full name field
            email: user.email,
            phone,
          },
          ticketType: ticketType,
          price: unitPrice,
          status: "active",
          metadata: {
            purchaseDate: new Date(),
            validFrom: event.dates?.startDate,
            validUntil: event.dates?.endDate,
          },
        });

        await ticket.save();
        tickets.push(ticket);
      }

      console.log("✅ Tickets created:", {
        count: tickets.length,
        ticketIds: tickets.map((t) => t._id),
      });

      // ========== STEP 7: Initiate PayHero Payment ==========
      let paymentResponse = null;
      let paymentUrl = null;

      try {
        // Validate and format phone number
        const validatedPhone = payheroService.validatePhoneNumber(phone);

        // Generate external reference
        const externalReference =
          payheroService.generateExternalReference("TKT");

        // Prepare payment request
        const paymentData = {
          amount: totalAmount,
          phoneNumber: validatedPhone,
          externalReference,
          customerName: fullName, // Use the pre-computed full name
          callbackUrl:
            process.env.PAYHERO_CALLBACK_URL ||
            "https://your-domain.com/api/payhero/callback",
        };

        // Initiate payment
        paymentResponse = await payheroService.initiatePayment(paymentData);

        // Update order with payment details
        order.payment.paymentReference = externalReference;
        order.payment.checkoutRequestId = paymentResponse.checkout_request_id;
        order.payment.paymentProvider = "payhero";
        order.payment.paymentData = {
          amount: totalAmount,
          phoneNumber: validatedPhone,
          customerName: fullName, // Use the pre-computed full name
        };
        order.payment.status = "processing";
        order.paymentStatus = "processing";

        await order.save();

        paymentUrl = paymentResponse.payment_url || null;

        console.log("✅ Payment initiated:", {
          externalReference,
          checkoutRequestId: paymentResponse.checkout_request_id,
        });
      } catch (paymentError) {
        console.error("❌ Payment initiation failed:", paymentError);

        // Update order status to failed
        order.payment.status = "failed";
        order.paymentStatus = "failed";
        order.status = "cancelled";
        await order.save();

        return res.status(500).json({
          success: false,
          error: "Payment initiation failed",
          details: paymentError.message,
          orderId: order._id,
          orderNumber: order.orderNumber,
        });
      }

      // ========== STEP 8: Welcome Email ==========
      // NOTE: Welcome email is sent AFTER payment confirmation in payhero.js callback
      // to avoid sending credentials before payment is complete
      // For local development, you can manually trigger payment callback to test emails
      if (isNewUser && tempPassword) {
        console.log(
          "ℹ️  Welcome email will be sent after payment confirmation"
        );
        console.log("📧 Email will be sent to:", email);
        console.log("🔑 Temporary password generated:", tempPassword);
      }

      // ========== STEP 9: Return Success Response ==========
      res.status(201).json({
        success: true,
        message: "Order created successfully. Please complete payment.",
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount,
          currency,
          paymentUrl,
          paymentReference: order.payment.paymentReference,
          checkoutRequestId: order.payment.checkoutRequestId,
          isNewUser,
          userEmail: user.email,
          ticketCount: tickets.length,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
      });
    } catch (error) {
      console.error("❌ Direct purchase failed:", error);
      res.status(500).json({
        success: false,
        error: "Purchase failed. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// ============= END DIRECT PURCHASE ENDPOINT =============

// GET /api/tickets/my - list user's tickets
router.get("/my", verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const data = await ticketService.getUserTickets(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    const simplified = data.tickets.map((t) => ({
      id: t._id,
      event: t.eventId
        ? {
            id: t.eventId._id,
            title: t.eventId.title,
            startDate: t.eventId.dates?.startDate,
          }
        : null,
      holder: { firstName: t.holder.firstName, lastName: t.holder.lastName },
      ticketType: t.ticketType,
      status: t.status,
      usedAt: t.usedAt,
      qrAvailable: !!t.qr,
    }));
    res.json({
      success: true,
      data: { tickets: simplified, pagination: data.pagination },
    });
  } catch (error) {
    console.error("❌ Get my tickets failed:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch tickets" });
  }
});

// GET /api/tickets/:ticketId - get a specific ticket (owner or organizer/admin)
router.get(
  "/:ticketId",
  verifyToken,
  [param("ticketId").isMongoId()],
  async (req, res) => {
    const v = handleValidation(req, res);
    if (v) return v;
    try {
      const ticket = await Ticket.findById(req.params.ticketId).populate(
        "eventId",
        "title dates organizer"
      );
      if (!ticket)
        return res
          .status(404)
          .json({ success: false, error: "Ticket not found" });

      const isOwner = String(ticket.ownerUserId) === String(req.user._id);
      const isOrganizer =
        ticket.eventId &&
        String(ticket.eventId.organizer) === String(req.user._id);
      const isAdmin = req.user.role === "admin";
      if (!isOwner && !isOrganizer && !isAdmin) {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }

      const payload = {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        event: ticket.eventId
          ? {
              id: ticket.eventId._id,
              title: ticket.eventId.title,
              startDate: ticket.eventId.dates?.startDate,
            }
          : null,
        holder: ticket.holder,
        ticketType: ticket.ticketType,
        status: ticket.status,
        usedAt: ticket.usedAt,
        usedBy: ticket.usedBy,
        metadata: ticket.metadata,
        qrAvailable: !!ticket.qr,
      };
      res.json({ success: true, data: payload });
    } catch (error) {
      console.error("❌ Get ticket failed:", error.message);
      res.status(500).json({ success: false, error: "Failed to fetch ticket" });
    }
  }
);

// POST /api/tickets/:ticketId/qr - issue or rotate QR (owner only)
router.post(
  "/:ticketId/qr",
  qrIssueLimiter,
  verifyToken,
  [param("ticketId").isMongoId(), body("rotate").optional().isBoolean()],
  async (req, res) => {
    const v = handleValidation(req, res);
    if (v) return v;
    try {
      const ticket = await Ticket.findById(req.params.ticketId).select(
        "ownerUserId eventId status qr"
      );
      if (!ticket)
        return res
          .status(404)
          .json({ success: false, error: "Ticket not found" });
      if (String(ticket.ownerUserId) !== String(req.user._id)) {
        return res.status(403).json({ success: false, error: "ACCESS_DENIED" });
      }
      if (ticket.status !== "active") {
        return res
          .status(400)
          .json({ success: false, error: "Ticket is not active" });
      }

      const { rotate = false } = req.body || {};
      const result = await ticketService.issueQr(ticket._id, { rotate });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("❌ Issue QR failed:", error.message);
      res.status(500).json({ success: false, error: "Failed to issue QR" });
    }
  }
);

// POST /api/tickets/scan - validate QR and mark used (organizer/admin)
router.post(
  "/scan",
  scanLimiter,
  verifyToken,
  requireRole(["organizer", "admin"]),
  [
    body("qr").isString(),
    body("location").optional().isString(),
    body("device").optional().isObject(),
  ],
  async (req, res) => {
    const v = handleValidation(req, res);
    if (v) return v;
    try {
      const { qr, location, device } = req.body;
      const verification = await ticketService.verifyQr(qr);
      if (!verification.ok) {
        return res
          .status(400)
          .json({ success: false, valid: false, code: verification.code });
      }

      const { ticket, event } = verification;
      // Permission: organizer of event or admin
      const isOrganizer =
        event && String(event.organizer) === String(req.user._id);
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
        ticket.scanHistory = ticket.scanHistory || [];
        ticket.scanHistory.push({
          scannedAt: new Date(),
          scannedBy: req.user._id,
          location,
          result: "denied",
        });
        await ticket.save();
        await ScanLog.create({
          ticketId: ticket._id,
          eventId: event?._id,
          scannedBy: req.user._id,
          location,
          result: "denied",
          device,
        });
        return res
          .status(403)
          .json({ success: false, valid: false, code: "ACCESS_DENIED" });
      }

      // Validity window
      const now = new Date();
      if (
        (ticket.metadata?.validFrom && now < ticket.metadata.validFrom) ||
        (ticket.metadata?.validUntil && now > ticket.metadata.validUntil)
      ) {
        ticket.scanHistory = ticket.scanHistory || [];
        ticket.scanHistory.push({
          scannedAt: now,
          scannedBy: req.user._id,
          location,
          result: "invalid",
        });
        await ticket.save();
        await ScanLog.create({
          ticketId: ticket._id,
          eventId: event?._id,
          scannedBy: req.user._id,
          location,
          result: "invalid",
          device,
        });
        return res
          .status(400)
          .json({ success: false, valid: false, code: "INVALID_QR" });
      }

      const result = await ticketService.markUsed(ticket, req.user, {
        location,
      });
      if (result.alreadyUsed) {
        await ScanLog.create({
          ticketId: ticket._id,
          eventId: event?._id,
          scannedBy: req.user._id,
          location,
          result: "already_used",
          device,
        });
        return res
          .status(409)
          .json({
            success: true,
            valid: false,
            code: "ALREADY_USED",
            usedAt: result.ticket?.usedAt || ticket.usedAt,
            usedBy: result.ticket?.usedBy || ticket.usedBy,
          });
      }

      await ScanLog.create({
        ticketId: ticket._id,
        eventId: event?._id,
        scannedBy: req.user._id,
        location,
        result: "success",
        device,
      });
      // Trigger conversion processing asynchronously for used tickets as well
      try {
        conversionService.processConversion({ req, ticket });
      } catch (e) {}
      res.json({
        success: true,
        valid: true,
        status: "used",
        ticket: {
          id: result.ticket?._id || ticket._id,
          holderName: `${ticket.holder.firstName} ${ticket.holder.lastName}`,
          ticketType: ticket.ticketType,
        },
        event: {
          id: event._id,
          title: event.title,
          startDate: event.dates?.startDate,
        },
      });
    } catch (error) {
      console.error("❌ Scan validation failed:", error.message);
      res.status(500).json({ success: false, error: "Scan validation failed" });
    }
  }
);

/**
 * POST /api/tickets/verify-by-number
 * Verify ticket by ticket number (fallback when QR scanning fails)
 * For organizers to manually verify attendees
 */
router.post(
  "/verify-by-number",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [
    body("ticketNumber")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Ticket number is required"),
    body("eventId").optional().isMongoId().withMessage("Invalid event ID"),
  ],
  async (req, res) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {
      const { ticketNumber, eventId } = req.body;

      // Find ticket by ticket number
      const ticket = await Ticket.findOne({ ticketNumber })
        .populate("eventId", "title organizer dates location")
        .populate("orderId", "orderNumber customer payment")
        .populate("ownerUserId", "firstName lastName email");

      if (!ticket) {
        return res.status(404).json({
          success: false,
          valid: false,
          code: "TICKET_NOT_FOUND",
          message: "No ticket found with this number",
        });
      }

      // Verify organizer has permission to check this ticket
      const event = ticket.eventId;
      const isOrganizer =
        event && String(event.organizer) === String(req.user._id);
      const isAdmin = req.user.role === "admin";

      // Check if user is event staff
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
        return res.status(403).json({
          success: false,
          valid: false,
          code: "ACCESS_DENIED",
          message:
            "You do not have permission to verify tickets for this event",
        });
      }

      // If eventId provided, verify it matches
      if (eventId && String(ticket.eventId._id) !== eventId) {
        return res.status(400).json({
          success: false,
          valid: false,
          code: "EVENT_MISMATCH",
          message: "Ticket does not belong to the specified event",
        });
      }

      // Check ticket validity
      const now = new Date();
      const isActive = ticket.status === "active";
      const isUsed = ticket.status === "used";
      const isCancelled = ticket.status === "cancelled";
      const isRefunded = ticket.status === "refunded";

      // Check validity window
      const validFrom = ticket.metadata?.validFrom;
      const validUntil = ticket.metadata?.validUntil;
      const isInValidityWindow =
        (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil);

      // Prepare response
      const response = {
        success: true,
        valid: isActive && isInValidityWindow,
        ticket: {
          ticketNumber: ticket.ticketNumber,
          ticketType: ticket.ticketType,
          status: ticket.status,
          holderName: `${ticket.holder.firstName} ${ticket.holder.lastName}`,
          holderEmail: ticket.holder.email,
          holderPhone: ticket.holder.phone,
          price: ticket.price,
          usedAt: ticket.usedAt,
          usedBy: ticket.usedBy,
          scanHistory: ticket.scanHistory?.length || 0,
        },
        event: {
          title: event.title,
          startDate: event.dates?.startDate,
          location: event.location?.venueName,
        },
        order: {
          orderNumber: ticket.orderId?.orderNumber,
          paidAt: ticket.orderId?.payment?.paidAt,
        },
      };

      // Add status-specific information
      if (isUsed) {
        response.code = "ALREADY_USED";
        response.message = `Ticket already scanned on ${new Date(
          ticket.usedAt
        ).toLocaleString("en-KE")}`;
      } else if (isCancelled) {
        response.code = "CANCELLED";
        response.message = "This ticket has been cancelled";
      } else if (isRefunded) {
        response.code = "REFUNDED";
        response.message = "This ticket has been refunded";
      } else if (!isInValidityWindow) {
        response.code = "INVALID_TIME";
        response.message =
          validFrom && now < validFrom
            ? "Ticket is not yet valid"
            : "Ticket has expired";
      } else {
        response.code = "VALID";
        response.message = "Ticket is valid and ready to be scanned";
      }

      res.json(response);
    } catch (error) {
      console.error("❌ Ticket verification failed:", error);
      res.status(500).json({
        success: false,
        error: "Ticket verification failed",
      });
    }
  }
);

module.exports = router;
