const express = require('express');
const router = express.Router();
const payheroService = require('../services/payheroService');
const emailService = require('../services/emailService');
const Order = require('../models/Order');
const { body, validationResult } = require('express-validator');

/**
 * @route GET /api/payhero/wallet-balance
 * @desc Get service wallet balance
 * @access Private (Admin only)
 */
router.get('/wallet-balance', async (req, res) => {
  try {
    const balance = await payheroService.getServiceWalletBalance();
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balance'
    });
  }
});

/**
 * @route GET /api/payhero/payments-balance/:channelId
 * @desc Get payments wallet balance
 * @access Private (Admin only)
 */
router.get('/payments-balance/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const balance = await payheroService.getPaymentsWalletBalance(channelId);
    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Payments balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments balance'
    });
  }
});

/**
 * @route POST /api/payhero/initiate-payment
 * @desc Initiate MPESA STK Push payment
 * @access Public (for guest checkout)
 */
router.post('/initiate-payment', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('phoneNumber').isLength({ min: 10 }).withMessage('Phone number is required'),
  body('customerName').optional().isLength({ min: 2 }).withMessage('Customer name must be at least 2 characters'),
  body('orderId').optional().isMongoId().withMessage('Invalid order ID')
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

    const { amount, phoneNumber, customerName, orderId, channelId, provider } = req.body;

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
      customerName: customerName || 'Guest Customer',
      channelId: channelId,
      provider: provider || 'm-pesa',
      externalReference,
      callbackUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payhero/callback`
    };

    // Initiate payment with PAYHERO
    const paymentResponse = await payheroService.initiatePayment(paymentData);

    // Verify payment was initiated successfully
    if (!paymentResponse.success && !paymentResponse.CheckoutRequestID) {
      throw new Error('Failed to initiate payment - No checkout request ID received');
    }

    // Create or update order record
    let order;
    if (orderId) {
      order = await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'pending',
        paymentReference: externalReference,
        checkoutRequestId: paymentResponse.CheckoutRequestID,
        paymentProvider: 'payhero',
        paymentData: {
          amount: feeBreakdown.totalAmount,
          phoneNumber: formattedPhone,
          customerName: paymentData.customerName
        },
        feeBreakdown,
        // Ensure pricing.total is set
        'pricing.total': feeBreakdown.totalAmount
      }, { new: true });
    } else {
      // Create new order for guest checkout
      order = new Order({
        customerInfo: {
          name: customerName || 'Guest Customer',
          email: req.body.email || null,
          phone: formattedPhone
        },
        items: req.body.items || [],
        totalAmount: feeBreakdown.totalAmount,
        paymentStatus: 'pending',
        paymentReference: externalReference,
        checkoutRequestId: paymentResponse.CheckoutRequestID,
        paymentProvider: 'payhero',
        paymentData: {
          amount: feeBreakdown.totalAmount,
          phoneNumber: formattedPhone,
          customerName: paymentData.customerName
        },
        feeBreakdown,
        isGuestOrder: true
      });
      await order.save();
    }

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        orderId: order._id,
        paymentReference: externalReference,
        checkoutRequestId: paymentResponse.CheckoutRequestID,
        status: paymentResponse.status,
        amount: feeBreakdown.totalAmount,
        feeBreakdown,
        phoneNumber: formattedPhone
      }
    });

  } catch (error) {
    console.error('Initiate payment error:', error);
    
    // Provide detailed error information
    let errorMessage = 'Failed to initiate payment';
    let statusCode = 500;
    
    if (error.name === 'ValidationError') {
      // Mongoose validation error
      errorMessage = `Order validation failed: ${Object.values(error.errors).map(err => err.message).join(', ')}`;
      statusCode = 400;
    } else if (error.response?.data) {
      // PayHero API error
      errorMessage = `PayHero API Error: ${JSON.stringify(error.response.data)}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.response?.data || null
    });
  }
});

/**
 * @route POST /api/payhero/verify-payment
 * @desc Verify payment status
 * @access Public
 */
router.post('/verify-payment', [
  body('paymentReference').notEmpty().withMessage('Payment reference is required')
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

    const { paymentReference } = req.body;

    // Verify payment status
    const verificationResult = await payheroService.verifyPayment(paymentReference);

    if (verificationResult.success) {
      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: verificationResult
      });
    } else {
      res.status(400).json({
        success: false,
        error: verificationResult.message || 'Payment verification failed',
        data: verificationResult
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment'
    });
  }
});

/**
 * @route POST /api/payhero/callback
 * @desc Handle PAYHERO payment callback
 * @access Public (called by PAYHERO)
 */
router.post('/callback', async (req, res) => {
  try {
    console.log('PAYHERO Callback received:', req.body);

    // Process callback data
    const paymentInfo = await payheroService.processCallback(req.body);

    // Find order by external reference
    const order = await Order.findOne({ 
      paymentReference: paymentInfo.externalReference 
    });

    if (!order) {
      console.error('Order not found for external reference:', paymentInfo.externalReference);
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order status based on payment result
    let paymentStatus = 'failed';
    if (paymentInfo.resultCode === 0 && paymentInfo.status === 'Success') {
      paymentStatus = 'completed';
    } else if (paymentInfo.resultCode === 1) {
      paymentStatus = 'cancelled';
    }

    // Update order
    await Order.findByIdAndUpdate(order._id, {
      paymentStatus,
      paymentResponse: paymentInfo,
      mpesaReceiptNumber: paymentInfo.mpesaReceiptNumber,
      completedAt: paymentStatus === 'completed' ? new Date() : null
    });

    console.log(`Order ${order._id} payment status updated to: ${paymentStatus}`);

    // Send email receipt if payment successful
    if (paymentStatus === 'completed') {
      try {
        await emailService.sendPaymentReceipt(order, paymentInfo);
        console.log('Payment receipt email sent successfully');
      } catch (emailError) {
        console.error('Failed to send payment receipt email:', emailError);
        // Don't fail the callback if email fails
      }
    }

    res.json({
      success: true,
      message: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process callback'
    });
  }
});

/**
 * @route GET /api/payhero/payment-status/:orderId
 * @desc Get payment status for an order
 * @access Public
 */
router.get('/payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId).select(
      'paymentStatus paymentReference checkoutRequestId paymentResponse feeBreakdown totalAmount'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
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
        paymentResponse: order.paymentResponse
      }
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment status'
    });
  }
});

/**
 * @route POST /api/payhero/calculate-fees
 * @desc Calculate payment fees for given amount
 * @access Public
 */
router.post('/calculate-fees', [
  body('amount').isNumeric().withMessage('Amount must be a number')
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

    const { amount } = req.body;
    const feeBreakdown = payheroService.calculateFees(amount);

    res.json({
      success: true,
      data: feeBreakdown
    });

  } catch (error) {
    console.error('Calculate fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fees'
    });
  }
});

module.exports = router;