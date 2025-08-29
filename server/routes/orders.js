const express = require('express');
const { body, validationResult } = require('express-validator');
const orderService = require('../services/orderService');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateOrderData = [
  body('customer.email').isEmail().normalizeEmail(),
  body('customer.firstName').trim().isLength({ min: 1, max: 50 }),
  body('customer.lastName').trim().isLength({ min: 1, max: 50 }),
  body('customer.phone').trim().isLength({ min: 10, max: 15 }),
  body('items').isArray({ min: 1 }),
  body('items.*.eventId').isMongoId(),
  body('items.*.ticketType').trim().isLength({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1, max: 10 }),
  body('items.*.unitPrice').isFloat({ min: 0 }),
  body('items.*.subtotal').isFloat({ min: 0 })
];

const validatePaymentData = [
  body('phoneNumber').trim().isLength({ min: 10, max: 15 })
];

// Create order and calculate pricing
router.post('/create', validateOrderData, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Add user ID if authenticated
    if (req.user) {
      req.body.customer.userId = req.user.id;
    }

    // Add request metadata
    req.body.ipAddress = req.ip;
    req.body.userAgent = req.get('User-Agent');

    // Create order
    const order = await orderService.createOrder(req.body);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        pricing: order.pricing,
        status: order.status
      }
    });

  } catch (error) {
    console.error('❌ Order creation failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Initiate payment
router.post('/:orderId/pay', validatePaymentData, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { phoneNumber } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Initiate payment
    const paymentResult = await orderService.initiatePayment(orderId, phoneNumber);

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: paymentResult
    });

  } catch (error) {
    console.error('❌ Payment initiation failed:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// MPESA callback endpoint
router.post('/mpesa/callback', async (req, res) => {
  try {
    console.log('📞 MPESA callback received:', JSON.stringify(req.body, null, 2));

    // Process callback
    const result = await orderService.processPaymentCallback(req.body);

    // Respond to MPESA
    res.json({
      ResultCode: '0',
      ResultDesc: 'Success'
    });

  } catch (error) {
    console.error('❌ MPESA callback processing failed:', error.message);
    
    // Still respond to MPESA to acknowledge receipt
    res.json({
      ResultCode: '1',
      ResultDesc: 'Failed'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Order service is running',
    timestamp: new Date().toISOString()
  });
});

// Get user orders (authenticated users only)
router.get('/user/orders', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const result = await orderService.getUserOrders(req.user.id, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Get user orders failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get order by order number
router.get('/number/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await orderService.getOrderByNumber(orderNumber);

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Get order failed:', error.message);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Get order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await orderService.getOrderById(orderId);

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Get order failed:', error.message);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Get order pricing breakdown (for preview)
router.post('/calculate-pricing', [
  body('items').isArray({ min: 1 }),
  body('items.*.subtotal').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { items } = req.body;
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const serviceFee = orderService.calculateServiceFee(subtotal);
    const total = orderService.calculateTotal(subtotal, serviceFee);

    res.json({
      success: true,
      data: {
        subtotal,
        serviceFee,
        total,
        currency: 'KES',
        breakdown: {
          items: items.map(item => ({
            ...item,
            serviceFee: orderService.calculateServiceFee(item.subtotal)
          })),
          totalServiceFee: serviceFee
        }
      }
    });

  } catch (error) {
    console.error('❌ Pricing calculation failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Order service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
