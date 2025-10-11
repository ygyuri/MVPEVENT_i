const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken, requireRole, optionalAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Order = require('../models/Order');
const User = require('../models/User');
const EventStaff = require('../models/EventStaff');
const ScanLog = require('../models/ScanLog');
const ReferralLink = require('../models/ReferralLink');
const ticketService = require('../services/ticketService');
const conversionService = require('../services/conversionService');
const payheroService = require('../services/payheroService');
const emailService = require('../services/emailService');
// Rate limiting
const qrIssueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
const scanLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});
const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 purchase attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many purchase attempts. Please try again later.'
});

const router = express.Router();

// Helper: standard validation handler
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
}

// ============= DIRECT PURCHASE ENDPOINT (Simplified Checkout Flow) =============

/**
 * POST /api/tickets/direct-purchase
 * Simplified direct checkout with auto-account creation
 * Handles: validation, user creation, order creation, ticket generation, payment initiation
 */
router.post('/direct-purchase', 
  purchaseLimiter,
  optionalAuth, // Allow both guest and authenticated users
  [
    body('eventId').isMongoId().withMessage('Invalid event ID'),
    body('ticketType').isString().trim().notEmpty().withMessage('Ticket type is required'),
    body('quantity').isInt({ min: 1, max: 20 }).withMessage('Quantity must be between 1 and 20'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
    body('firstName').trim().notEmpty().isLength({ max: 50 }).withMessage('First name is required'),
    body('lastName').trim().notEmpty().isLength({ max: 50 }).withMessage('Last name is required'),
    body('referralCode').optional().isString().trim().toUpperCase()
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
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
        referralCode 
      } = req.body;

      console.log('🎫 Direct purchase initiated:', { eventId, ticketType, quantity, email });

      // ========== STEP 1: Validate Event & Ticket Availability ==========
      const event = await Event.findById(eventId)
        .populate('organizer', 'firstName lastName email')
        .lean();

      if (!event) {
        return res.status(404).json({ 
          success: false, 
          error: 'Event not found' 
        });
      }

      if (event.status !== 'published') {
        return res.status(400).json({ 
          success: false, 
          error: 'Event is not available for purchase' 
        });
      }

      // Find the specific ticket type
      const ticketTypeData = event.ticketTypes?.find(
        tt => tt.name === ticketType
      );

      if (!ticketTypeData) {
        return res.status(404).json({ 
          success: false, 
          error: 'Ticket type not found' 
        });
      }

      // Check ticket availability
      if (ticketTypeData.quantity !== undefined && ticketTypeData.quantity < quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Only ${ticketTypeData.quantity} tickets available` 
        });
      }

      // Check sales window
      const now = new Date();
      if (ticketTypeData.salesStart && now < new Date(ticketTypeData.salesStart)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ticket sales have not started yet' 
        });
      }

      if (ticketTypeData.salesEnd && now > new Date(ticketTypeData.salesEnd)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ticket sales have ended' 
        });
      }

      // Check quantity limits
      if (ticketTypeData.minPerOrder && quantity < ticketTypeData.minPerOrder) {
        return res.status(400).json({ 
          success: false, 
          error: `Minimum ${ticketTypeData.minPerOrder} tickets required` 
        });
      }

      if (ticketTypeData.maxPerOrder && quantity > ticketTypeData.maxPerOrder) {
        return res.status(400).json({ 
          success: false, 
          error: `Maximum ${ticketTypeData.maxPerOrder} tickets allowed` 
        });
      }

      // ========== STEP 2: Handle User (Create or Use Existing) ==========
      let user = await User.findOne({ email: email.toLowerCase() });
      let isNewUser = false;
      let tempPassword = null;

      if (!user) {
        // Create new user with auto-generated credentials
        isNewUser = true;
        
        // Generate temporary password (8 chars: letters + numbers)
        tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        // Generate unique username from email
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        let username = baseUsername;
        let usernameExists = await User.findOne({ username });
        let counter = 1;
        
        while (usernameExists) {
          username = `${baseUsername}${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        // Create user with pending activation status
        user = new User({
          email: email.toLowerCase(),
          username,
          firstName,
          lastName,
          profile: { phone },
          role: 'customer',
          accountStatus: 'pending_activation',
          passwordResetRequired: true,
          emailVerified: false
        });

        // Set temporary password
        await user.setTempPassword(tempPassword);
        await user.save();

        console.log('✅ New user created:', { userId: user._id, username, email });
      } else {
        console.log('✅ Existing user found:', { userId: user._id, email });
      }

      // ========== STEP 3: Handle Affiliate Tracking ==========
      let affiliateData = {
        referralCode: null,
        affiliateId: null
      };

      if (referralCode) {
        const referralLink = await ReferralLink.findOne({
          referral_code: referralCode,
          event_id: eventId,
          status: 'active',
          deleted_at: null
        }).lean();

        if (referralLink) {
          // Validate referral link
          const isNotExpired = !referralLink.expires_at || 
            new Date(referralLink.expires_at) > now;
          const hasUsesLeft = !referralLink.max_uses || 
            referralLink.current_uses < referralLink.max_uses;

          if (isNotExpired && hasUsesLeft) {
            affiliateData.referralCode = referralLink.referral_code;
            affiliateData.affiliateId = referralLink.affiliate_id;
            console.log('✅ Affiliate tracking applied:', { referralCode, affiliateId: affiliateData.affiliateId });
          }
        }
      }

      // ========== STEP 4: Calculate Pricing ==========
      const unitPrice = ticketTypeData.price || 0;
      const subtotal = unitPrice * quantity;
      const serviceFee = 0; // No service fee for now
      const totalAmount = subtotal + serviceFee;
      const currency = ticketTypeData.currency || event.pricing?.currency || 'KES';

      console.log('💰 Pricing calculated:', { unitPrice, quantity, subtotal, serviceFee, totalAmount, currency });

      // ========== STEP 5: Create Order Record ==========
      const order = new Order({
        customer: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone
        },
        isGuestOrder: isNewUser,
        purchaseSource: 'direct_checkout', // Key field for simplified checkout
        items: [{
          eventId: event._id,
          eventTitle: event.title,
          ticketType: ticketType,
          quantity,
          unitPrice,
          subtotal
        }],
        pricing: {
          subtotal,
          serviceFee,
          total: totalAmount,
          currency
        },
        totalAmount, // For PayHero compatibility
        status: 'pending',
        paymentStatus: 'pending',
        payment: {
          method: 'payhero',
          status: 'pending'
        },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          source: 'direct_checkout_web'
        }
      });

      // Set affiliate tracking if present
      if (affiliateData.referralCode) {
        order.setAffiliateTracking(affiliateData.referralCode, affiliateData.affiliateId);
      }

      await order.save();
      console.log('✅ Order created:', { orderId: order._id, orderNumber: order.orderNumber });

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
            email: user.email,
            phone
          },
          ticketType: ticketType,
          price: unitPrice,
          status: 'active',
          metadata: {
            purchaseDate: new Date(),
            validFrom: event.dates?.startDate,
            validUntil: event.dates?.endDate
          }
        });

        await ticket.save();
        tickets.push(ticket);
      }

      console.log('✅ Tickets created:', { count: tickets.length, ticketIds: tickets.map(t => t._id) });

      // ========== STEP 7: Initiate PayHero Payment ==========
      let paymentResponse = null;
      let paymentUrl = null;

      try {
        // Validate and format phone number
        const validatedPhone = payheroService.validatePhoneNumber(phone);

        // Generate external reference
        const externalReference = payheroService.generateExternalReference('TKT');

        // Prepare payment request
        const paymentData = {
          amount: totalAmount,
          phoneNumber: validatedPhone,
          externalReference,
          customerName: `${firstName} ${lastName}`,
          callbackUrl: process.env.PAYHERO_CALLBACK_URL || 'https://your-domain.com/api/payhero/callback'
        };

        // Initiate payment
        paymentResponse = await payheroService.initiatePayment(paymentData);

        // Update order with payment details
        order.payment.paymentReference = externalReference;
        order.payment.checkoutRequestId = paymentResponse.checkout_request_id;
        order.payment.paymentProvider = 'payhero';
        order.payment.paymentData = {
          amount: totalAmount,
          phoneNumber: validatedPhone,
          customerName: `${firstName} ${lastName}`
        };
        order.payment.status = 'processing';
        order.paymentStatus = 'processing';

        await order.save();

        paymentUrl = paymentResponse.payment_url || null;

        console.log('✅ Payment initiated:', { 
          externalReference, 
          checkoutRequestId: paymentResponse.checkout_request_id 
        });

      } catch (paymentError) {
        console.error('❌ Payment initiation failed:', paymentError);
        
        // Update order status to failed
        order.payment.status = 'failed';
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        await order.save();

        return res.status(500).json({
          success: false,
          error: 'Payment initiation failed',
          details: paymentError.message,
          orderId: order._id,
          orderNumber: order.orderNumber
        });
      }

      // ========== STEP 8: Send Email (Async, Don't Wait) ==========
      if (isNewUser && tempPassword) {
        // Send credentials email asynchronously
        setImmediate(async () => {
          try {
            await emailService.sendAccountCreationEmail({
              email: user.email,
              firstName: user.firstName,
              tempPassword,
              orderNumber: order.orderNumber
            });
            console.log('✅ Credentials email sent to:', user.email);
          } catch (emailError) {
            console.error('❌ Failed to send credentials email:', emailError);
          }
        });
      }

      // ========== STEP 9: Return Success Response ==========
      res.status(201).json({
        success: true,
        message: 'Order created successfully. Please complete payment.',
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
          paymentStatus: order.paymentStatus
        }
      });

    } catch (error) {
      console.error('❌ Direct purchase failed:', error);
      res.status(500).json({
        success: false,
        error: 'Purchase failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ============= END DIRECT PURCHASE ENDPOINT =============

// GET /api/tickets/my - list user's tickets
router.get('/my', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const data = await ticketService.getUserTickets(req.user._id, { page: parseInt(page), limit: parseInt(limit) });
    const simplified = data.tickets.map(t => ({
      id: t._id,
      event: t.eventId ? { id: t.eventId._id, title: t.eventId.title, startDate: t.eventId.dates?.startDate } : null,
      holder: { firstName: t.holder.firstName, lastName: t.holder.lastName },
      ticketType: t.ticketType,
      status: t.status,
      usedAt: t.usedAt,
      qrAvailable: !!t.qr
    }));
    res.json({ success: true, data: { tickets: simplified, pagination: data.pagination } });
  } catch (error) {
    console.error('❌ Get my tickets failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:ticketId - get a specific ticket (owner or organizer/admin)
router.get('/:ticketId', verifyToken, [param('ticketId').isMongoId()], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const ticket = await Ticket.findById(req.params.ticketId).populate('eventId', 'title dates organizer');
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const isOwner = String(ticket.ownerUserId) === String(req.user._id);
    const isOrganizer = ticket.eventId && String(ticket.eventId.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isOrganizer && !isAdmin) {
      return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
    }

    const payload = {
      id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      event: ticket.eventId ? { id: ticket.eventId._id, title: ticket.eventId.title, startDate: ticket.eventId.dates?.startDate } : null,
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
    console.error('❌ Get ticket failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
});

// POST /api/tickets/:ticketId/qr - issue or rotate QR (owner only)
router.post('/:ticketId/qr', qrIssueLimiter, verifyToken, [param('ticketId').isMongoId(), body('rotate').optional().isBoolean()], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const ticket = await Ticket.findById(req.params.ticketId).select('ownerUserId eventId status qr');
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (String(ticket.ownerUserId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
    }
    if (ticket.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Ticket is not active' });
    }

    const { rotate = false } = req.body || {};
    const result = await ticketService.issueQr(ticket._id, { rotate });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Issue QR failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to issue QR' });
  }
});

// POST /api/tickets/scan - validate QR and mark used (organizer/admin)
router.post('/scan', scanLimiter, verifyToken, requireRole(['organizer', 'admin']), [body('qr').isString(), body('location').optional().isString(), body('device').optional().isObject()], async (req, res) => {
  const v = handleValidation(req, res); if (v) return v;
  try {
    const { qr, location, device } = req.body;
    const verification = await ticketService.verifyQr(qr);
    if (!verification.ok) {
      return res.status(400).json({ success: false, valid: false, code: verification.code });
    }

    const { ticket, event } = verification;
    // Permission: organizer of event or admin
    const isOrganizer = event && String(event.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    let isEventStaff = false;
    if (!isOrganizer && !isAdmin && event) {
      const staff = await EventStaff.findOne({ eventId: event._id, userId: req.user._id, isActive: true });
      isEventStaff = !!staff;
    }
    if (!isOrganizer && !isAdmin && !isEventStaff) {
      ticket.scanHistory = ticket.scanHistory || [];
      ticket.scanHistory.push({ scannedAt: new Date(), scannedBy: req.user._id, location, result: 'denied' });
      await ticket.save();
      await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'denied', device });
      return res.status(403).json({ success: false, valid: false, code: 'ACCESS_DENIED' });
    }

    // Validity window
    const now = new Date();
    if ((ticket.metadata?.validFrom && now < ticket.metadata.validFrom) || (ticket.metadata?.validUntil && now > ticket.metadata.validUntil)) {
      ticket.scanHistory = ticket.scanHistory || [];
      ticket.scanHistory.push({ scannedAt: now, scannedBy: req.user._id, location, result: 'invalid' });
      await ticket.save();
      await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'invalid', device });
      return res.status(400).json({ success: false, valid: false, code: 'INVALID_QR' });
    }

    const result = await ticketService.markUsed(ticket, req.user, { location });
    if (result.alreadyUsed) {
      await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'already_used', device });
      return res.status(409).json({ success: true, valid: false, code: 'ALREADY_USED', usedAt: result.ticket?.usedAt || ticket.usedAt, usedBy: result.ticket?.usedBy || ticket.usedBy });
    }

    await ScanLog.create({ ticketId: ticket._id, eventId: event?._id, scannedBy: req.user._id, location, result: 'success', device });
    // Trigger conversion processing asynchronously for used tickets as well
    try { conversionService.processConversion({ req, ticket }); } catch (e) {}
    res.json({
      success: true,
      valid: true,
      status: 'used',
      ticket: { id: result.ticket?._id || ticket._id, holderName: `${ticket.holder.firstName} ${ticket.holder.lastName}`, ticketType: ticket.ticketType },
      event: { id: event._id, title: event.title, startDate: event.dates?.startDate }
    });
  } catch (error) {
    console.error('❌ Scan validation failed:', error.message);
    res.status(500).json({ success: false, error: 'Scan validation failed' });
  }
});

module.exports = router;


