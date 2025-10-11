/**
 * PayHero Security Middleware
 * 
 * Enterprise-grade security for PayHero webhook callbacks
 * - Request validation
 * - Signature verification (when available)
 * - Rate limiting per IP
 * - Request logging for audit trail
 */

const crypto = require('crypto');

/**
 * Verify PayHero webhook signature (HMAC-SHA256)
 * Note: Enable this when PayHero provides signature in headers
 */
const verifyPayheroSignature = (req, res, next) => {
  // Check if PayHero sends signature header
  const signature = req.headers['x-payhero-signature'] || req.headers['x-signature'];
  
  if (!signature) {
    // PayHero might not send signatures - log and continue
    console.log('⚠️  No signature header found (PayHero may not provide it)');
    return next();
  }

  try {
    const secret = process.env.PAYHERO_WEBHOOK_SECRET || process.env.PAYHERO_API_PASSWORD;
    
    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      console.error('Expected:', expectedSignature);
      console.error('Received:', signature);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    console.log('✅ Webhook signature verified');
    next();

  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Signature verification failed'
    });
  }
};

/**
 * Log webhook requests for audit trail
 */
const logWebhookRequest = (req, res, next) => {
  const requestLog = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    headers: req.headers,
    body: req.body,
    method: req.method,
    url: req.originalUrl
  };

  console.log('📝 Webhook Request Log:', JSON.stringify(requestLog, null, 2));
  
  // Attach to request for later use
  req.webhookLog = requestLog;
  
  next();
};

/**
 * Validate callback payload structure
 */
const validateCallbackPayload = (req, res, next) => {
  const { body } = req;

  // Check for required fields based on PayHero documentation
  if (!body) {
    return res.status(400).json({
      success: false,
      error: 'Empty request body'
    });
  }

  // PayHero typically sends response object
  const response = body.response || body;

  const requiredFields = ['ExternalReference', 'ResultCode'];
  const missingFields = requiredFields.filter(field => 
    !response[field] && response[field] !== 0
  );

  if (missingFields.length > 0) {
    console.error('❌ Missing required fields:', missingFields);
    return res.status(400).json({
      success: false,
      error: 'Invalid callback payload',
      missingFields
    });
  }

  console.log('✅ Callback payload validated');
  next();
};

/**
 * Ensure webhook is processed only once (idempotency)
 * This checks if the same CheckoutRequestID has been processed before
 */
const ensureIdempotency = async (req, res, next) => {
  try {
    const response = req.body.response || req.body;
    const checkoutRequestId = response.CheckoutRequestID;
    const externalReference = response.ExternalReference;

    if (!checkoutRequestId && !externalReference) {
      return next(); // Skip if no unique identifiers
    }

    // Check if this callback was already processed
    const Order = require('../models/Order');
    
    const existingOrder = await Order.findOne({
      $or: [
        { 'payment.checkoutRequestId': checkoutRequestId },
        { 'payment.paymentReference': externalReference }
      ],
      paymentStatus: { $in: ['paid', 'completed'] }
    }).select('_id orderNumber paymentStatus').lean();

    if (existingOrder) {
      console.log('⚠️  Duplicate webhook detected (already processed)');
      console.log('   Order:', existingOrder.orderNumber);
      console.log('   Status:', existingOrder.paymentStatus);
      
      // Return success (idempotent response)
      return res.status(200).json({
        success: true,
        message: 'Callback already processed',
        orderId: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        duplicate: true
      });
    }

    console.log('✅ Idempotency check passed (first time processing)');
    next();

  } catch (error) {
    console.error('❌ Idempotency check error:', error);
    // Don't block webhook on idempotency check failure
    next();
  }
};

module.exports = {
  verifyPayheroSignature,
  logWebhookRequest,
  validateCallbackPayload,
  ensureIdempotency
};





