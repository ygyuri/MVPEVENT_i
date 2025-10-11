const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const mpesaService = require('./mpesaService');
const emailService = require('./emailService');
const pesapalService = require('./pesapalService');
const payheroService = require('./payheroService');
const ticketService = require('./ticketService');

class OrderService {
  // Calculate service fee (5% of subtotal)
  calculateServiceFee(subtotal) {
    return Math.round(subtotal * 0.05);
  }

  // Calculate total amount
  calculateTotal(subtotal, serviceFee) {
    return subtotal + serviceFee;
  }

  // Validate ticket availability
  async validateTicketAvailability(items) {
    const validationResults = [];

    for (const item of items) {
      const event = await Event.findById(item.eventId);
      
      if (!event) {
        validationResults.push({
          eventId: item.eventId,
          valid: false,
          error: 'Event not found'
        });
        continue;
      }

      // Check if event is published
      if (event.status !== 'published') {
        validationResults.push({
          eventId: item.eventId,
          valid: false,
          error: 'Event is not available for purchase'
        });
        continue;
      }

      // Check capacity
      if (event.capacity && (event.currentAttendees + item.quantity) > event.capacity) {
        validationResults.push({
          eventId: item.eventId,
          valid: false,
          error: `Only ${event.capacity - event.currentAttendees} tickets remaining`
        });
        continue;
      }

      // Get ticket types (generate if not exists, same logic as events API)
      let ticketTypes = event.ticketTypes || [];
      
      if (ticketTypes.length === 0) {
        const basePrice = event.pricing?.price || 0;
        ticketTypes = [
          {
            name: 'General Admission',
            price: basePrice,
            currency: 'USD',
            quantity: 100,
            description: 'Standard entry to the event',
            benefits: ['Event access', 'General seating']
          },
          {
            name: 'VIP Pass',
            price: Math.round(basePrice * 2.5),
            currency: 'USD',
            quantity: 25,
            description: 'Premium experience with exclusive benefits',
            benefits: ['Priority seating', 'Meet & greet', 'Exclusive area access']
          }
        ];
      }

      // Check if ticket type exists and has sufficient quantity
      const ticketType = ticketTypes.find(t => t.name === item.ticketType);
      if (!ticketType) {
        validationResults.push({
          eventId: item.eventId,
          valid: false,
          error: 'Ticket type not found'
        });
        continue;
      }

      if (ticketType.quantity && ticketType.quantity < item.quantity) {
        validationResults.push({
          eventId: item.eventId,
          valid: false,
          error: `Only ${ticketType.quantity} tickets available for ${item.ticketType}`
        });
        continue;
      }

      validationResults.push({
        eventId: item.eventId,
        valid: true,
        event: event
      });
    }

    return validationResults;
  }

  // Create order with calculated pricing
  async createOrder(orderData) {
    try {
      // Validate ticket availability
      const validationResults = await this.validateTicketAvailability(orderData.items);
      const invalidItems = validationResults.filter(result => !result.valid);
      
      if (invalidItems.length > 0) {
        throw new Error(`Ticket validation failed: ${invalidItems.map(item => item.error).join(', ')}`);
      }

      // Calculate pricing
      const subtotal = orderData.items.reduce((sum, item) => sum + item.subtotal, 0);
      const serviceFee = this.calculateServiceFee(subtotal);
      const total = this.calculateTotal(subtotal, serviceFee);

      // Create order
      const order = new Order({
        customer: orderData.customer,
        items: orderData.items,
        pricing: {
          subtotal,
          serviceFee,
          total,
          currency: 'KES'
        },
        metadata: {
          ipAddress: orderData.ipAddress,
          userAgent: orderData.userAgent,
          source: orderData.source || 'web'
        }
      });

      await order.save();
      console.log('✅ Order created:', order.orderNumber);
      
      return order;
    } catch (error) {
      console.error('❌ Failed to create order:', error.message);
      throw error;
    }
  }

  // Initiate payment
  async initiatePayment(orderId, phoneNumber, opts = {}) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error('Order is not in pending status');
      }

      const provider = (opts.provider || 'mpesa').toLowerCase();
      let responsePayload = null;

      if (provider === 'pesapal') {
        // Get token
        const tokenRes = await pesapalService.requestToken(
          opts.credentials?.consumerKey,
          opts.credentials?.consumerSecret
        );
        if (!tokenRes.success || !tokenRes.token) {
          throw new Error('Failed to authenticate with PesaPal');
        }

        // Submit order
        const submitRes = await pesapalService.submitOrder({
          token: tokenRes.token,
          callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://example.com/pesapal/callback',
          amount: order.pricing.total,
          description: 'Event Ticket Purchase',
          currency: order.pricing.currency || 'KES',
          reference: order.orderNumber,
          customer: order.customer,
        });
        if (!submitRes.success) {
          throw new Error('Failed to submit PesaPal order');
        }

        // PesaPal returns redirect URL and tracking id in v3 (varies by environment)
        const data = submitRes.data || {};
        const trackingId = data?.tracking_id || data?.trackingId || data?.TrackingId;
        const redirectUrl = data?.redirect_url || data?.redirectUrl || data?.RedirectUrl;

        order.payment.method = 'pesapal';
        order.payment.pesapalTrackingId = trackingId || null;
        order.payment.pesapalRedirectUrl = redirectUrl || null;
        order.payment.status = 'processing';

        responsePayload = {
          provider: 'pesapal',
          trackingId,
          redirectUrl,
          orderNumber: order.orderNumber,
        };
      } else if (provider === 'payhero') {
        // Normalize phone to 07XXXXXXXX if provided as 2547XXXXXXXX
        let normalizedPhone = (phoneNumber || '').trim();
        if (/^254\d{9}$/.test(normalizedPhone)) {
          normalizedPhone = `0${normalizedPhone.substring(3)}`;
        }

        const channelId = parseInt(process.env.PAYHERO_CHANNEL_ID || '100', 10);
        const stkPayload = {
          amount: order.pricing.total,
          phone_number: normalizedPhone,
          channel_id: channelId,
          provider: 'm-pesa',
          external_reference: order.orderNumber,
          callback_url: process.env.PAYHERO_CALLBACK_URL || 'https://your-domain.com/api/payhero/callback'
        };

        const stkRes = await payheroService.makeStkPush(stkPayload);
        // Update order
        order.payment.method = 'mpesa';
        order.payment.status = 'processing';

        responsePayload = {
          provider: 'payhero',
          raw: stkRes,
          orderNumber: order.orderNumber
        };

      } else {
        // Default legacy MPESA flow
        const paymentResult = await mpesaService.initiateSTKPush(
          phoneNumber,
          order.pricing.total,
          order.orderNumber,
          'Event Ticket Purchase'
        );

        if (!paymentResult.success) {
          throw new Error(paymentResult.error || 'Payment initiation failed');
        }

        order.payment.method = 'mpesa';
        order.payment.mpesaRequestId = paymentResult.checkoutRequestId;
        order.payment.mpesaMerchantRequestId = paymentResult.merchantRequestId;
        order.payment.status = 'processing';

        responsePayload = {
          provider: 'mpesa',
          checkoutRequestId: paymentResult.checkoutRequestId,
          merchantRequestId: paymentResult.merchantRequestId,
          customerMessage: paymentResult.customerMessage,
          orderNumber: order.orderNumber
        };
      }
      
      await order.save();
      return { success: true, ...responsePayload };

    } catch (error) {
      console.error('❌ Payment initiation failed:', error.message);
      throw error;
    }
  }

  // Process payment callback
  async processPaymentCallback(callbackData) {
    try {
      // Validate callback
      if (!mpesaService.validateCallback(callbackData)) {
        throw new Error('Invalid callback data');
      }

      // Process callback data
      const transactionData = mpesaService.processCallback(callbackData);
      
      // Find order by checkout request ID
      const order = await Order.findOne({
        'payment.mpesaRequestId': transactionData.checkoutRequestId
      });

      if (!order) {
        throw new Error('Order not found for callback');
      }

      // Update payment details
      order.payment.mpesaResultCode = transactionData.resultCode;
      order.payment.mpesaResultDesc = transactionData.resultDesc;
      order.payment.mpesaTransactionId = transactionData.transactionId;

      // Check if payment was successful
      if (transactionData.resultCode === '0') {
        order.payment.status = 'completed';
        order.payment.paidAt = new Date();
        order.status = 'paid';
        
        // Create tickets
        const tickets = await this.createTickets(order);
        
        // Send emails
        await this.sendOrderEmails(order, tickets);
        // Send individual ticket emails with deep-links (best effort)
        try {
          const EventModel = require('../models/Event');
          const events = await EventModel.find({ _id: { $in: tickets.map(t => t.eventId) } }).select('title');
          const idToEvent = new Map(events.map(e => [String(e._id), e]));
          for (const t of tickets) {
            const ev = idToEvent.get(String(t.eventId));
            await emailService.sendTicketEmail(t, ev);
          }
        } catch (e) {
          // Non-blocking
        }
        
        console.log('✅ Payment completed successfully:', order.orderNumber);
        // Schedule reminders for this purchase (best-effort)
        try {
          const reminderService = require('./reminderService');
          await reminderService.scheduleForTickets(order, { timezone: order.customerInfo?.timezone });
        } catch (e) {
          console.warn('⚠️ Failed to schedule reminders:', e?.message);
        }
      } else {
        order.payment.status = 'failed';
        order.status = 'cancelled';
        
        // Send failure email
        await emailService.sendPaymentFailureEmail(order, transactionData.resultDesc);
        
        console.log('❌ Payment failed:', order.orderNumber);
      }

      await order.save();
      
      return {
        success: true,
        orderNumber: order.orderNumber,
        status: order.status,
        resultCode: transactionData.resultCode,
        resultDesc: transactionData.resultDesc
      };

    } catch (error) {
      console.error('❌ Payment callback processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle PayHero webhook/button callbacks
   * Payload examples may include:
   * {
   *  paymentSuccess: true,
   *  reference: "...",             // PayHero reference
   *  user_reference: "ORD-...",    // our reference we sent
   *  provider: "m-pesa",
   *  providerReference: "TCT...",  // transaction id
   *  amount: 1,
   *  phone: "070...",
   *  customerName: "...",
   *  channel: "100"
   * }
   */
  async processPayHeroWebhook(payload) {
    try {
      const success = !!payload.paymentSuccess || payload.status === 'success';
      const orderRef = payload.user_reference || payload.external_reference || payload.reference;
      if (!orderRef) {
        throw new Error('Missing order reference in webhook payload');
      }

      const order = await Order.findOne({ orderNumber: orderRef });
      if (!order) {
        throw new Error('Order not found for webhook');
      }

      // Update common payment fields
      order.payment.method = order.payment.method || 'mpesa';
      order.payment.mpesaTransactionId = payload.providerReference || order.payment.mpesaTransactionId;

      if (success) {
        order.payment.status = 'completed';
        order.payment.paidAt = new Date();
        order.status = 'paid';

        const tickets = await this.createTickets(order);
        await this.sendOrderEmails(order, tickets);
        try {
          const EventModel = require('../models/Event');
          const events = await EventModel.find({ _id: { $in: tickets.map(t => t.eventId) } }).select('title');
          const idToEvent = new Map(events.map(e => [String(e._id), e]));
          for (const t of tickets) {
            const ev = idToEvent.get(String(t.eventId));
            await emailService.sendTicketEmail(t, ev);
          }
        } catch (e) {}
      } else {
        order.payment.status = 'failed';
        order.status = 'cancelled';
        await emailService.sendPaymentFailureEmail(order, 'PayHero payment failed');
      }

      await order.save();

      return {
        success: true,
        orderNumber: order.orderNumber,
        status: order.status,
      };
    } catch (error) {
      console.error('❌ PayHero webhook processing failed:', error.message);
      throw error;
    }
  }

  // Create tickets for order
  async createTickets(order) {
    const tickets = [];

    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticket = new Ticket({
          orderId: order._id,
          eventId: item.eventId,
          ownerUserId: order.customer?.userId || undefined,
          holder: {
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            email: order.customer.email,
            phone: order.customer.phone
          },
          ticketType: item.ticketType,
          price: item.unitPrice,
          metadata: {
            purchaseDate: new Date(),
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Valid for 1 year
          }
        });

        await ticket.save();
        // Auto-issue initial QR so ticket is immediately scannable; wallet can rotate later
        try {
          await ticketService.issueQr(ticket._id);
        } catch (e) {
          // Non-fatal: ticket remains valid, wallet can issue on demand
        }
        tickets.push(ticket);
      }
    }

    console.log(`✅ Created ${tickets.length} tickets for order ${order.orderNumber}`);
    return tickets;
  }

  // Send order emails
  async sendOrderEmails(order, tickets) {
    try {
      // Send purchase receipt
      await emailService.sendPurchaseReceipt(order, tickets);

      // Send individual ticket emails
      const eventIds = [...new Set(tickets.map(ticket => ticket.eventId))];
      const events = await Event.find({ _id: { $in: eventIds } });
      const eventMap = events.reduce((map, event) => {
        map[event._id.toString()] = event;
        return map;
      }, {});

      for (const ticket of tickets) {
        const event = eventMap[ticket.eventId.toString()];
        if (event) {
          await emailService.sendTicketEmail(ticket, event);
        }
      }

      console.log('✅ Order emails sent successfully');
    } catch (error) {
      console.error('❌ Failed to send order emails:', error.message);
      // Don't throw error as this is not critical for order completion
    }
  }

  // Get order by ID
  async getOrderById(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('items.eventId', 'title dates location')
        .populate('customer.userId', 'firstName lastName email');
      
      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      console.error('❌ Failed to get order:', error.message);
      throw error;
    }
  }

  // Get order by order number
  async getOrderByNumber(orderNumber) {
    try {
      const order = await Order.findOne({ orderNumber })
        .populate('items.eventId', 'title dates location')
        .populate('customer.userId', 'firstName lastName email');
      
      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      console.error('❌ Failed to get order:', error.message);
      throw error;
    }
  }

  // Get user orders
  async getUserOrders(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const orders = await Order.find({ 'customer.userId': userId })
        .populate('items.eventId', 'title dates location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Order.countDocuments({ 'customer.userId': userId });

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get user orders:', error.message);
      throw error;
    }
  }
}

module.exports = new OrderService();
