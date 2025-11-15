const express = require("express");
const { body, param, validationResult } = require("express-validator");
const {
  verifyToken,
  requireRole,
  optionalAuth,
} = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const QRCode = require("qrcode");
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
    return res.status(400).json({
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
    body("email").isEmail().withMessage("Valid email is required"),
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
      // Normalize email to lowercase for lookup (emails are stored lowercase)
      // This allows case-insensitive lookup while emails are normalized in storage
      const emailLower = email.toLowerCase().trim();

      // Since emails are stored lowercase, we can do direct comparison
      let user = await User.findOne({ email: emailLower });

      // For Gmail addresses, also check variations with/without dots
      if (!user && emailLower.includes("@gmail.com")) {
        const localPart = emailLower.split("@")[0];
        const domain = emailLower.split("@")[1];

        // Try without dots if email has dots
        if (localPart.includes(".")) {
          const withoutDots = localPart.replace(/\./g, "") + "@" + domain;
          user = await User.findOne({ email: withoutDots });
        } else {
          // Try with dots (search for any Gmail variation)
          const escapedLocalPart = localPart.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          const gmailRegex = new RegExp(
            `^${escapedLocalPart}(\\.|)@gmail\\.com$`,
            "i"
          );
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
        const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9.]/g, "");
        let username = baseUsername;
        let usernameExists = await User.findOne({ username });
        let counter = 1;

        while (usernameExists) {
          username = `${baseUsername}${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        // Create user with pending activation status
        // Email will be lowercased automatically by Mongoose schema (lowercase: true)
        user = new User({
          email: email, // Will be normalized to lowercase on save by model
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
      // Use firstName and lastName from request body (already validated)
      // Fall back to user object if needed, but prefer request body
      const holderFirstName = firstName || user.firstName || "";
      const holderLastName = lastName || user.lastName || "";

      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = new Ticket({
          orderId: order._id,
          eventId: event._id,
          ownerUserId: user._id,
          holder: {
            firstName: holderFirstName,
            lastName: holderLastName,
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
    const Ticket = require("../models/Ticket");
    const Order = require("../models/Order");

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find({ ownerUserId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("eventId", "title dates location")
        .populate("orderId", "paymentStatus status"),
      Ticket.countDocuments({ ownerUserId: req.user._id }),
    ]);

    // Check order payment status for each ticket
    const simplified = tickets.map((t) => {
      const order = t.orderId;
      const isPaid =
        order &&
        (order.paymentStatus === "paid" ||
          order.paymentStatus === "completed" ||
          order.status === "completed");

      return {
        id: t._id,
        event: t.eventId
          ? {
              id: t.eventId._id,
              title: t.eventId.title,
              startDate: t.eventId.dates?.startDate,
            }
          : null,
        holder: {
          firstName: t.holder.firstName,
          lastName: t.holder.lastName,
          name: t.holder.name,
        },
        ticketType: t.ticketType,
        status: t.status,
        usedAt: t.usedAt,
        // Only show QR as available if order is paid/completed
        qrAvailable: isPaid && !!t.qr,
        orderPaid: isPaid,
      };
    });

    res.json({
      success: true,
      data: {
        tickets: simplified,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
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
      const Order = require("../models/Order");
      const ticket = await Ticket.findById(req.params.ticketId)
        .select("ownerUserId eventId status qr orderId")
        .populate("orderId", "paymentStatus status");
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

      // Check if order is paid/completed before issuing QR
      const order = ticket.orderId;
      const isPaid =
        order &&
        (order.paymentStatus === "paid" ||
          order.paymentStatus === "completed" ||
          order.status === "completed");

      if (!isPaid) {
        return res.status(400).json({
          success: false,
          error: "Payment not completed",
          message:
            "QR codes are only available for tickets with completed payments",
        });
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
        return res.status(409).json({
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

// ============= TEST ENDPOINTS FOR QR CODE GENERATION AND SCANNING =============
// These endpoints use the same logic as production endpoints but are easier to test

/**
 * POST /api/tickets/test/generate-qr/:ticketId
 * Test endpoint to generate QR code for a ticket (same as production)
 * No authentication required for easier testing
 */
router.post(
  "/test/generate-qr/:ticketId",
  [
    param("ticketId").isMongoId().withMessage("Invalid ticket ID"),
    body("rotate").optional().isBoolean(),
  ],
  async (req, res) => {
    const v = handleValidation(req, res);
    if (v) return v;
    try {
      const { ticketId } = req.params;
      const { rotate = false } = req.body || {};

      // Find ticket
      const ticket = await Ticket.findById(ticketId)
        .select("_id ownerUserId eventId status qr orderId ticketNumber")
        .populate("orderId", "paymentStatus status orderNumber")
        .populate("eventId", "title");

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Ticket not found",
        });
      }

      // Check ticket status
      if (ticket.status !== "active") {
        return res.status(400).json({
          success: false,
          error: "Ticket is not active",
          status: ticket.status,
        });
      }

      // Check payment status (for testing, we'll allow it but warn)
      const order = ticket.orderId;
      const isPaid =
        order &&
        (order.paymentStatus === "paid" ||
          order.paymentStatus === "completed" ||
          order.status === "completed");

      if (!isPaid) {
        console.warn(
          `⚠️  TEST: Generating QR for unpaid ticket ${ticketId} (order: ${order?.orderNumber || "N/A"})`
        );
      }

      // Generate QR code using the same service as production
      const result = await ticketService.issueQr(ticket._id, { rotate });

      // Also generate QR code image for display (like in payhero callback)
      const qrCodeDataURL = await QRCode.toDataURL(result.qr, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 2,
      });

      // Update ticket with QR code image URL (optional, for testing)
      ticket.qrCodeUrl = qrCodeDataURL;
      ticket.qrCode = result.qr;
      await ticket.save();

      res.json({
        success: true,
        message: "QR code generated successfully (TEST ENDPOINT)",
        data: {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          eventTitle: ticket.eventId?.title,
          orderNumber: order?.orderNumber,
          orderPaid: isPaid,
          qr: result.qr, // The scannable QR code string
          qrCodeUrl: qrCodeDataURL, // Base64 image for display
          expiresAt: result.expiresAt,
          qrMetadata: ticket.qr, // The stored QR metadata
        },
      });
    } catch (error) {
      console.error("❌ Test QR generation failed:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to generate QR code",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/tickets/test/scan
 * Test endpoint to scan and validate QR code (same logic as production /scan endpoint)
 * No authentication required for easier testing, but logs the scan attempt
 */
router.post(
  "/test/scan",
  [
    body("qr").isString().trim().notEmpty().withMessage("QR code string is required"),
    body("location").optional().isString(),
    body("device").optional().isObject(),
  ],
  async (req, res) => {
    const v = handleValidation(req, res);
    if (v) return v;
    try {
      const { qr, location, device } = req.body;

      // Trim and validate QR string
      const trimmedQr = (qr || '').trim();
      if (!trimmedQr) {
        return res.status(400).json({
          success: false,
          valid: false,
          code: "EMPTY_QR",
          message: "QR code string is required and cannot be empty",
        });
      }

      console.log("🧪 TEST SCAN:", {
        qrLength: trimmedQr.length,
        qrPreview: trimmedQr.substring(0, 100) + (trimmedQr.length > 100 ? "..." : ""),
        location,
        device,
      });

      // Use the same verification logic as production
      const verification = await ticketService.verifyQr(trimmedQr);

      if (!verification.ok) {
        console.log("❌ TEST SCAN FAILED:", {
          code: verification.code,
          qrLength: trimmedQr.length,
          qrPreview: trimmedQr.substring(0, 50),
        });
        return res.status(400).json({
          success: false,
          valid: false,
          code: verification.code,
          message: "QR code validation failed (TEST ENDPOINT)",
          details: {
            code: verification.code,
            qrLength: trimmedQr.length,
            possibleReasons: {
              INVALID_QR: "QR format is invalid or signature doesn't match",
              TICKET_NOT_FOUND: "Ticket ID in QR doesn't exist in database",
              QR_EXPIRED: "QR code has expired (check expiresAt)",
            },
          },
        });
      }

      const { ticket, event } = verification;

      // Check ticket status
      if (ticket.status !== "active") {
        return res.status(400).json({
          success: false,
          valid: false,
          code: "TICKET_NOT_ACTIVE",
          message: `Ticket status is: ${ticket.status}`,
          ticketStatus: ticket.status,
        });
      }

      // Check validity window
      const now = new Date();
      const validFrom = ticket.metadata?.validFrom ? new Date(ticket.metadata.validFrom) : null;
      const validUntil = ticket.metadata?.validUntil ? new Date(ticket.metadata.validUntil) : null;
      
      let validityIssue = null;
      if (validFrom && now < validFrom) {
        validityIssue = {
          reason: "Ticket is not yet valid",
          validFrom: validFrom,
          currentTime: now,
          daysUntilValid: Math.ceil((validFrom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        };
      } else if (validUntil && now > validUntil) {
        validityIssue = {
          reason: "Ticket has expired",
          validUntil: validUntil,
          currentTime: now,
          daysSinceExpired: Math.ceil((now.getTime() - validUntil.getTime()) / (1000 * 60 * 60 * 24))
        };
      }

      if (validityIssue) {
        return res.status(400).json({
          success: false,
          valid: false,
          code: "TICKET_OUT_OF_VALIDITY_WINDOW",
          message: "Ticket is outside its validity window",
          validityIssue: validityIssue,
          validityWindow: {
            validFrom: validFrom,
            validUntil: validUntil,
            currentTime: now,
            isCurrentlyValid: !validityIssue
          },
          ticket: {
            id: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            eventTitle: event?.title
          }
        });
      }

      // Check if already used
      if (ticket.status === "used") {
        return res.status(409).json({
          success: true,
          valid: false,
          code: "ALREADY_USED",
          message: "Ticket has already been used",
          usedAt: ticket.usedAt,
          usedBy: ticket.usedBy,
        });
      }

      // For test endpoint, we'll simulate marking as used but not actually save it
      // This allows testing the scan logic without permanently marking tickets as used
      const scanResult = {
        success: true,
        valid: true,
        message: "QR code is valid (TEST ENDPOINT - ticket NOT marked as used)",
        code: "VALID",
        ticket: {
          id: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          holderName: `${ticket.holder.firstName} ${ticket.holder.lastName}`,
          ticketType: ticket.ticketType,
          status: ticket.status,
        },
        event: event
          ? {
              id: event._id.toString(),
              title: event.title,
              startDate: event.dates?.startDate,
            }
          : null,
        qrMetadata: ticket.qr,
        scanDetails: {
          location,
          device,
          scannedAt: now,
          note: "This is a TEST scan - ticket was NOT marked as used",
        },
      };

      console.log("✅ TEST SCAN SUCCESS:", {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        eventTitle: event?.title,
      });

      res.json(scanResult);
    } catch (error) {
      console.error("❌ Test scan validation failed:", error.message);
      res.status(500).json({
        success: false,
        error: "Scan validation failed",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/tickets/test/list
 * Test endpoint to list available ticket IDs for testing
 * Returns a list of tickets with their IDs, status, and basic info
 */
router.get("/test/list", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const tickets = await Ticket.find({})
      .select("_id ticketNumber status holder eventId orderId createdAt")
      .populate("eventId", "title")
      .populate("orderId", "orderNumber paymentStatus status")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const now = new Date();
    const ticketList = tickets.map(t => {
      const validFrom = t.metadata?.validFrom ? new Date(t.metadata.validFrom) : null;
      const validUntil = t.metadata?.validUntil ? new Date(t.metadata.validUntil) : null;
      const isCurrentlyValid = 
        (!validFrom || now >= validFrom) && 
        (!validUntil || now <= validUntil);
      
      return {
        id: t._id.toString(),
        ticketNumber: t.ticketNumber,
        status: t.status,
        holderName: t.holder?.name || `${t.holder?.firstName || ''} ${t.holder?.lastName || ''}`.trim(),
        eventTitle: t.eventId?.title || 'N/A',
        orderNumber: t.orderId?.orderNumber || 'N/A',
        orderPaid: t.orderId?.paymentStatus === 'paid' || t.orderId?.paymentStatus === 'completed' || t.orderId?.status === 'completed',
        hasQR: !!t.qr,
        createdAt: t.createdAt,
        validity: {
          validFrom: validFrom,
          validUntil: validUntil,
          isCurrentlyValid: isCurrentlyValid,
          validFromFormatted: validFrom ? validFrom.toLocaleString() : null,
          validUntilFormatted: validUntil ? validUntil.toLocaleString() : null
        }
      };
    });

    res.json({
      success: true,
      message: "Available tickets for testing",
      count: ticketList.length,
      tickets: ticketList
    });
  } catch (error) {
    console.error("❌ List tickets failed:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to list tickets",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

/**
 * POST /api/tickets/test/fix-validity
 * Test endpoint to fix event and ticket validity dates for testing
 * Updates event dates to be in the future and updates all related tickets
 */
router.post("/test/fix-validity", async (req, res) => {
  try {
    const { eventId } = req.body;
    const Event = require("../models/Event");
    
    let events = [];
    if (eventId) {
      // Fix specific event
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: "Event not found"
        });
      }
      events = [event];
    } else {
      // Fix all events that have expired or are in the future
      const now = new Date();
      events = await Event.find({
        $or: [
          { "dates.endDate": { $lt: now } }, // Expired events
          { "dates.startDate": { $gt: now } } // Future events (not yet started)
        ],
        status: { $in: ["published", "draft"] }
      });
    }

    if (events.length === 0) {
      return res.json({
        success: true,
        message: "No events found to update",
        updated: 0
      });
    }

    // Set dates to be valid NOW for testing (start 1 hour ago, end 2 days from now)
    const now = new Date();
    const startDate = new Date(now.getTime() - (1 * 60 * 60 * 1000)); // 1 hour ago
    const endDate = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)); // 2 days from now

    const results = [];

    for (const event of events) {
      // Update event dates
      event.dates = event.dates || {};
      event.dates.startDate = startDate;
      event.dates.endDate = endDate;
      await event.save();

      // Update all tickets for this event
      const tickets = await Ticket.find({ eventId: event._id });
      let updatedTickets = 0;

      for (const ticket of tickets) {
        ticket.metadata = ticket.metadata || {};
        ticket.metadata.validFrom = startDate;
        ticket.metadata.validUntil = endDate;
        await ticket.save();
        updatedTickets++;
      }

      results.push({
        eventId: event._id.toString(),
        eventTitle: event.title,
        newStartDate: startDate.toISOString(),
        newEndDate: endDate.toISOString(),
        ticketsUpdated: updatedTickets
      });
    }

    res.json({
      success: true,
      message: `Updated ${results.length} event(s) and their tickets`,
      updated: results.length,
      results: results,
      newValidityWindow: {
        validFrom: startDate.toISOString(),
        validUntil: endDate.toISOString(),
        note: "Event is now valid (started 1 hour ago, ends in 2 days)"
      }
    });
  } catch (error) {
    console.error("❌ Fix validity failed:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fix validity dates",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

/**
 * POST /api/tickets/test/seed-event
 * Test endpoint to seed a new event with valid dates for testing
 */
router.post("/test/seed-event", async (req, res) => {
  try {
    const Event = require("../models/Event");
    const User = require("../models/User");
    
    // Find or create a test organizer user
    let organizer = await User.findOne({ 
      $or: [
        { role: 'organizer' },
        { role: 'admin' },
        { email: 'test@example.com' }
      ]
    });

    if (!organizer) {
      // Generate unique username
      let username = `testorganizer${Date.now()}`;
      let email = `test-organizer-${Date.now()}@example.com`;
      
      // Create a test organizer if none exists
      organizer = new User({
        email: email,
        username: username,
        firstName: 'Test',
        lastName: 'Organizer',
        name: 'Test Organizer',
        role: 'organizer',
        accountStatus: 'active',
        emailVerified: true,
        isActive: true
      });
      await organizer.setPassword('Test123!');
      await organizer.save();
      console.log('✅ Created test organizer:', organizer._id);
    }

    // Ensure organizer has required fields
    if (!organizer.firstName) organizer.firstName = 'Test';
    if (!organizer.lastName) organizer.lastName = 'Organizer';
    if (!organizer.email) organizer.email = `test-organizer-${Date.now()}@example.com`;
    if (!organizer.name) organizer.name = `${organizer.firstName} ${organizer.lastName}`;

    // Set dates to be valid NOW for testing (start 1 hour ago, end 2 days from now)
    const now = new Date();
    const startDate = new Date(now.getTime() - (1 * 60 * 60 * 1000)); // 1 hour ago
    const endDate = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)); // 2 days from now

    // Generate unique slug
    const baseSlug = `test-event-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;
    while (await Event.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the event with all required fields including media
    const event = new Event({
      organizer: organizer._id,
      title: `Test Event - ${new Date().toLocaleDateString()}`,
      slug: slug,
      description: 'This is a test event created for QR code testing. Valid for 30 days from creation. This event includes all necessary fields for proper validation and testing.',
      shortDescription: 'Test event for QR code scanning',
      status: 'published',
      dates: {
        startDate: startDate,
        endDate: endDate,
        timezone: 'UTC'
      },
      location: {
        venueName: 'Test Venue',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
        coordinates: {
          latitude: -1.2921,
          longitude: 36.8219
        }
      },
      pricing: {
        isFree: false,
        price: 1000,
        currency: 'KES'
      },
      capacity: 100,
      currentAttendees: 0,
      ticketTypes: [
        {
          name: 'General Admission',
          price: 1000,
          quantity: 100,
          description: 'General admission ticket',
          currency: 'KES',
          salesStart: startDate,
          salesEnd: endDate,
          minPerOrder: 1,
          maxPerOrder: 10
        }
      ],
      media: {
        coverImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
        galleryUrls: [
          'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop'
        ]
      },
      flags: {
        isFeatured: false,
        isTrending: false
      },
      recurrence: {
        enabled: false,
        frequency: undefined,
        interval: undefined,
        byWeekday: [],
        byMonthday: [],
        count: undefined,
        until: undefined
      },
      tags: ['test', 'qr-code', 'testing'],
      metadata: {
        createdBy: 'test-seed-endpoint',
        testEvent: true
      },
      version: 0
    });

    await event.save();

    // Create a test order for the ticket
    const Order = require("../models/Order");
    const testOrder = new Order({
      customer: {
        userId: organizer._id,
        email: organizer.email,
        firstName: organizer.firstName || 'Test',
        lastName: organizer.lastName || 'User',
        name: `${organizer.firstName || 'Test'} ${organizer.lastName || 'User'}`,
        phone: '+254700000000'
      },
      isGuestOrder: false,
      purchaseSource: 'admin', // Use 'admin' since 'test_seed' is not in enum
      items: [
        {
          eventId: event._id,
          eventTitle: event.title,
          ticketType: 'General Admission',
          quantity: 1,
          unitPrice: 1000,
          subtotal: 1000
        }
      ],
      pricing: {
        subtotal: 1000,
        serviceFee: 0,
        transactionFee: 0,
        total: 1000,
        currency: 'KES'
      },
      totalAmount: 1000,
      status: 'completed',
      paymentStatus: 'completed',
      payment: {
        method: 'mpesa', // Valid enum values: 'mpesa', 'pesapal', 'payhero'
        status: 'completed',
        provider: 'test',
        transactionId: `TEST-${Date.now()}`,
        paidAt: new Date(),
        amount: 1000
      }
    });

    await testOrder.save();

    // Create a test ticket for this event so it shows up in the ticket list
    const testTicket = new Ticket({
      orderId: testOrder._id,
      eventId: event._id,
      ownerUserId: organizer._id,
      holder: {
        firstName: organizer.firstName || 'Test',
        lastName: organizer.lastName || 'User',
        name: `${organizer.firstName || 'Test'} ${organizer.lastName || 'User'}`,
        email: organizer.email,
        phone: '+254700000000'
      },
      ticketType: 'General Admission',
      price: 1000,
      status: 'active',
      metadata: {
        purchaseDate: new Date(),
        validFrom: startDate,
        validUntil: endDate
      }
    });

    await testTicket.save();

    // Generate QR code for the test ticket
    try {
      await ticketService.issueQr(testTicket._id);
      console.log('✅ Generated QR code for test ticket');
    } catch (qrError) {
      console.warn('⚠️ Failed to generate QR for test ticket:', qrError.message);
    }

    console.log('✅ Created test event and ticket:', {
      eventId: event._id.toString(),
      ticketId: testTicket._id.toString(),
      title: event.title,
      startDate: event.dates.startDate,
      endDate: event.dates.endDate
    });

    res.json({
      success: true,
      message: 'Test event and ticket created successfully',
      event: {
        id: event._id.toString(),
        title: event.title,
        slug: event.slug,
        organizerId: organizer._id.toString(),
        organizerEmail: organizer.email,
        dates: {
          startDate: event.dates.startDate.toISOString(),
          endDate: event.dates.endDate.toISOString(),
          startDateFormatted: event.dates.startDate.toLocaleString(),
          endDateFormatted: event.dates.endDate.toLocaleString()
        },
        status: event.status,
        isCurrentlyValid: true
      },
      ticket: {
        id: testTicket._id.toString(),
        ticketNumber: testTicket.ticketNumber,
        status: testTicket.status,
        hasQR: !!testTicket.qr
      },
      note: 'A test ticket has been created for this event. It should appear in the ticket list now.'
    });
  } catch (error) {
    console.error("❌ Seed event failed:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to seed test event",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
});

/**
 * GET /api/tickets/test/valid-event
 * Test endpoint to get a valid (non-expired) event ID for testing
 */
router.get("/test/valid-event", async (req, res) => {
  try {
    const Event = require("../models/Event");
    const now = new Date();
    
    // Find an event that is currently valid or will be valid soon
    const validEvent = await Event.findOne({
      status: { $in: ["published", "draft"] },
      $or: [
        // Currently valid (started but not ended)
        {
          "dates.startDate": { $lte: now },
          "dates.endDate": { $gte: now }
        },
        // Future event (starts within next 30 days)
        {
          "dates.startDate": { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
        }
      ]
    })
    .select("_id title dates status")
    .sort({ "dates.startDate": 1 }); // Get the soonest one

    if (!validEvent) {
      // If no valid event found, get the most recent event and we'll suggest fixing it
      const recentEvent = await Event.findOne({ status: { $in: ["published", "draft"] } })
        .select("_id title dates status")
        .sort({ createdAt: -1 });

      if (recentEvent) {
        return res.json({
          success: false,
          message: "No valid events found. Use this event ID and click 'Fix' button:",
          eventId: recentEvent._id.toString(),
          eventTitle: recentEvent.title,
          suggestion: "Use POST /api/tickets/test/fix-validity with this eventId to make it valid"
        });
      }

      return res.status(404).json({
        success: false,
        error: "No events found in database"
      });
    }

    const startDate = validEvent.dates?.startDate ? new Date(validEvent.dates.startDate) : null;
    const endDate = validEvent.dates?.endDate ? new Date(validEvent.dates.endDate) : null;
    const isCurrentlyValid = 
      (!startDate || now >= startDate) && 
      (!endDate || now <= endDate);

    res.json({
      success: true,
      eventId: validEvent._id.toString(),
      eventTitle: validEvent.title,
      status: validEvent.status,
      dates: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        startDateFormatted: startDate?.toLocaleString(),
        endDateFormatted: endDate?.toLocaleString()
      },
      isCurrentlyValid: isCurrentlyValid,
      message: isCurrentlyValid 
        ? "This event is currently valid for testing"
        : "This event will be valid soon"
    });
  } catch (error) {
    console.error("❌ Get valid event failed:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to find valid event",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

/**
 * GET /api/tickets/test/events
 * Test endpoint to list events with their dates and validity status
 */
router.get("/test/events", async (req, res) => {
  try {
    const Event = require("../models/Event");
    const now = new Date();
    
    const events = await Event.find({ status: { $in: ["published", "draft"] } })
      .select("_id title dates status")
      .sort({ "dates.endDate": -1 })
      .limit(50);

    const eventList = events.map(e => {
      const startDate = e.dates?.startDate ? new Date(e.dates.startDate) : null;
      const endDate = e.dates?.endDate ? new Date(e.dates.endDate) : null;
      const isCurrentlyValid = 
        (!startDate || now >= startDate) && 
        (!endDate || now <= endDate);
      const isExpired = endDate && now > endDate;
      const isFuture = startDate && now < startDate;

      return {
        id: e._id.toString(),
        title: e.title,
        status: e.status,
        dates: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          startDateFormatted: startDate?.toLocaleString(),
          endDateFormatted: endDate?.toLocaleString()
        },
        validity: {
          isCurrentlyValid,
          isExpired,
          isFuture,
          daysUntilStart: startDate && now < startDate 
            ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
          daysSinceExpired: endDate && now > endDate
            ? Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
            : null
        }
      };
    });

    res.json({
      success: true,
      count: eventList.length,
      events: eventList,
      currentTime: now.toISOString()
    });
  } catch (error) {
    console.error("❌ List events failed:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to list events",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// ============= END TEST ENDPOINTS =============

module.exports = router;
