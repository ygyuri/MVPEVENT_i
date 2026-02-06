const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { param, body, query, validationResult } = require("express-validator");
const User = require("../models/User");
const Event = require("../models/Event");
const Session = require("../models/Session");
const ScanLog = require("../models/ScanLog");
const BulkResendLog = require("../models/BulkResendLog");
const emailService = require("../services/emailService");

const router = express.Router();

// Admin health/overview
router.get("/overview", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const Order = require("../models/Order");
    const Ticket = require("../models/Ticket");
    const Payout = require("../models/Payout");

    const [
      usersCount,
      eventsCount,
      activeSessions,
      ordersCount,
      ticketsCount,
      completedOrdersCount,
      pendingOrdersCount,
      totalRevenue,
      companyRevenueData,
    ] = await Promise.all([
      User.countDocuments({}),
      Event.countDocuments({}),
      Session.countDocuments({
        isActive: true,
        expiresAt: { $gt: new Date() },
      }),
      Order.countDocuments({}),
      Ticket.countDocuments({}),
      Order.countDocuments({
        status: { $in: ["completed", "paid"] },
        paymentStatus: { $in: ["paid", "completed"] }
      }),
      Order.countDocuments({ status: "pending" }),
      // Calculate total revenue from completed/paid orders
      Order.aggregate([
        {
          $match: {
            status: { $in: ["completed", "paid"] },
            paymentStatus: { $in: ["paid", "completed"] },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: [
                  { $gt: [{ $ifNull: ["$totalAmount", 0] }, 0] },
                  { $ifNull: ["$totalAmount", 0] },
                  { $ifNull: ["$pricing.total", 0] }
                ]
              }
            },
          },
        },
      ]),
      // Calculate company revenue from completed payouts
      Payout.aggregate([
        {
          $match: { status: "completed" }
        },
        {
          $group: {
            _id: null,
            totalFees: { $sum: "$amounts.totalFees" },
            totalServiceFees: { $sum: "$amounts.serviceFees" },
            totalTransactionFees: { $sum: "$amounts.transactionFees" },
            totalPaidToOrganizers: { $sum: "$amounts.netAmount" },
            count: { $sum: 1 },
          }
        }
      ])
    ]);

    // Get recent orders
    const recentOrders = await Order.find({})
      .populate("items.eventId", "title slug")
      .select(
        "orderNumber status paymentStatus totalAmount customer createdAt items"
      )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get revenue by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRevenue = await Order.aggregate([
      {
        $match: {
          status: { $in: ["completed", "paid"] },
          paymentStatus: { $in: ["paid", "completed"] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$totalAmount", 0] }, 0] },
                { $ifNull: ["$totalAmount", 0] },
                { $ifNull: ["$pricing.total", 0] }
              ]
            }
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalRevenueAmount = totalRevenue[0]?.total || 0;

    // Extract company revenue data
    const companyRevenue = companyRevenueData[0] || {
      totalFees: 0,
      totalServiceFees: 0,
      totalTransactionFees: 0,
      totalPaidToOrganizers: 0,
      count: 0,
    };

    // Calculate pending amounts (revenue not yet paid out to organizers)
    const totalProcessed = companyRevenue.totalPaidToOrganizers + companyRevenue.totalFees;
    const pendingRevenue = totalRevenueAmount - totalProcessed;

    res.json({
      ok: true,
      overview: {
        usersCount,
        eventsCount,
        activeSessions,
        ordersCount,
        ticketsCount,
        completedOrdersCount,
        pendingOrdersCount,
        totalRevenue: totalRevenueAmount,
        recentOrders,
        ordersByStatus,
        recentRevenue,
        // Company revenue from payouts
        companyRevenue: {
          totalEarned: companyRevenue.totalFees,
          totalServiceFees: companyRevenue.totalServiceFees,
          totalTransactionFees: companyRevenue.totalTransactionFees,
          totalPaidToOrganizers: companyRevenue.totalPaidToOrganizers,
          completedPayoutsCount: companyRevenue.count,
          pendingRevenue: Math.max(0, pendingRevenue), // Revenue not yet paid to organizers
        },
      },
      me: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ error: "Failed to load admin overview" });
  }
});

// Example organizer/admin shared route
router.get("/users", verifyToken, requireRole(["admin"]), async (req, res) => {
  try {
    const users = await User.find({})
      .select("email username role isActive createdAt")
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Failed to list users" });
  }
});

// Get user details (admin only)
router.get(
  "/users/:userId",
  verifyToken,
  requireRole("admin"),
  [param("userId").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid user ID", details: errors.array() });
      }

      const user = await User.findById(req.params.userId).select(
        "-passwordHash -tempPassword"
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error("Get user details error:", error);
      res.status(500).json({ error: "Failed to get user details" });
    }
  }
);

// Update user role (admin only)
router.patch(
  "/users/:userId/role",
  verifyToken,
  requireRole("admin"),
  [
    param("userId").isMongoId(),
    body("role").isIn(["customer", "organizer", "admin", "affiliate"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { userId } = req.params;
      const { role } = req.body;

      // Prevent changing own role
      if (String(userId) === String(req.user._id)) {
        return res.status(400).json({ error: "Cannot change your own role" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.role = role;
      await user.save();

      res.json({
        success: true,
        data: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  }
);

// Update user status (admin only)
router.patch(
  "/users/:userId/status",
  verifyToken,
  requireRole("admin"),
  [param("userId").isMongoId(), body("isActive").isBoolean()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { userId } = req.params;
      const { isActive } = req.body;

      // Prevent suspending yourself
      if (String(userId) === String(req.user._id) && !isActive) {
        return res
          .status(400)
          .json({ error: "Cannot suspend your own account" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.isActive = isActive;
      if (!isActive) {
        user.accountStatus = "suspended";
      } else {
        user.accountStatus = "active";
      }
      await user.save();

      res.json({
        success: true,
        data: {
          id: user._id,
          email: user.email,
          isActive: user.isActive,
          accountStatus: user.accountStatus,
        },
      });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  }
);

// Get all orders (admin only)
router.get("/orders", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const Order = require("../models/Order");
    const Event = require("../models/Event");
    const { page = 1, limit = 20, status, search, eventId, organizerId } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (eventId) {
      query["items.eventId"] = eventId;
    }

    // If organizer filter is applied, find all events by this organizer first
    if (organizerId) {
      const organizerEvents = await Event.find({ organizer: organizerId }).select("_id").lean();
      const eventIds = organizerEvents.map(e => e._id);
      query["items.eventId"] = { $in: eventIds };
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build revenue query - respect all filters
    const revenueQuery = {};

    // Copy eventId and search filters to revenue query
    if (eventId) {
      revenueQuery["items.eventId"] = eventId;
    }

    // Copy organizer filter to revenue query
    if (organizerId) {
      const organizerEvents = await Event.find({ organizer: organizerId }).select("_id").lean();
      const eventIds = organizerEvents.map(e => e._id);
      revenueQuery["items.eventId"] = { $in: eventIds };
    }

    if (search) {
      revenueQuery.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
      ];
    }

    // If no status filter or "all", only count completed/paid orders for revenue
    if (!status || status === "all") {
      revenueQuery.status = { $in: ["completed", "paid"] };
      revenueQuery.paymentStatus = { $in: ["paid", "completed"] };
    } else {
      // If status filter is provided, use that status for revenue calculation
      revenueQuery.status = status;
    }
    
    const [orders, total, revenueResult] = await Promise.all([
      Order.find(query)
        .populate({
          path: "items.eventId",
          select: "title slug organizer",
          populate: {
            path: "organizer",
            select: "email name firstName lastName"
          }
        })
        .populate("customer.userId", "email username")
        .select(
          "orderNumber status paymentStatus totalAmount customer items createdAt pricing transactionFee"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query),
      // Aggregate total revenue
      Order.aggregate([
        { $match: revenueQuery },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [
                  { $gt: [{ $ifNull: ["$totalAmount", 0] }, 0] },
                  { $ifNull: ["$totalAmount", 0] },
                  { $ifNull: ["$pricing.total", 0] }
                ]
              }
            }
          }
        }
      ])
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Get all events (admin only)
router.get("/events", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const Order = require("../models/Order");
    const Ticket = require("../models/Ticket");
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("organizer", "email username firstName lastName")
        .populate("category", "name slug color icon")
        .select(
          "title slug status flags coverImageUrl dates createdAt capacity currentAttendees location category pricing ticketTypes shortDescription"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Event.countDocuments(query),
    ]);

    // Get statistics for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const [ordersCount, ticketsCount, revenueData] = await Promise.all([
          Order.countDocuments({
            "items.eventId": event._id,
            status: { $in: ["completed", "paid"] },
            paymentStatus: { $in: ["paid", "completed"] },
          }),
          Ticket.countDocuments({ eventId: event._id }),
          Order.aggregate([
            {
              $match: {
                "items.eventId": event._id,
                status: { $in: ["completed", "paid"] },
                paymentStatus: { $in: ["paid", "completed"] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalAmount" },
              },
            },
          ]),
        ]);

        return {
          ...event,
          stats: {
            ordersCount,
            ticketsCount,
            revenue: revenueData[0]?.total || 0,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        events: eventsWithStats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Failed to load events" });
  }
});

// Update event flags (admin only)
router.patch(
  "/events/:eventId/flags",
  verifyToken,
  requireRole("admin"),
  [
    param("eventId").isMongoId(),
    body("isFeatured").optional().isBoolean(),
    body("isTrending").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { eventId } = req.params;
      const { isFeatured, isTrending } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Update flags
      if (typeof isFeatured === "boolean") {
        event.flags.isFeatured = isFeatured;
      }
      if (typeof isTrending === "boolean") {
        event.flags.isTrending = isTrending;
      }

      await event.save();

      res.json({
        success: true,
        data: {
          id: event._id,
          flags: event.flags,
        },
      });
    } catch (error) {
      console.error("Update event flags error:", error);
      res.status(500).json({ error: "Failed to update event flags" });
    }
  }
);

// Update event status (admin only)
router.patch(
  "/events/:eventId/status",
  verifyToken,
  requireRole("admin"),
  [
    param("eventId").isMongoId(),
    body("status")
      .isIn(["draft", "published", "cancelled", "completed"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { eventId } = req.params;
      const { status } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      event.status = status;
      await event.save();

      res.json({
        success: true,
        data: {
          id: event._id,
          status: event.status,
        },
      });
    } catch (error) {
      console.error("Update event status error:", error);
      res.status(500).json({ error: "Failed to update event status" });
    }
  }
);

// Scan logs with filters (admin only)
router.get(
  "/scan-logs",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { eventId, result, from, to, page = 1, limit = 20 } = req.query;
      const query = {};
      if (eventId) query.eventId = eventId;
      if (result) query.result = result;
      if (from || to) {
        query.scannedAt = {};
        if (from) query.scannedAt.$gte = new Date(from);
        if (to) query.scannedAt.$lte = new Date(to);
      }
      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        ScanLog.find(query)
          .sort({ scannedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate("ticketId", "ticketType holder")
          .populate("eventId", "title dates")
          .populate("scannedBy", "email username")
          .lean(),
        ScanLog.countDocuments(query),
      ]);
      res.json({
        success: true,
        data: {
          items,
          pagination: { page: Number(page), limit: Number(limit), total },
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: "Failed to load scan logs" });
    }
  }
);

// Send a test email to verify SMTP
router.post(
  "/test-email",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const to = req.body?.to || req.user.email;
      await emailService.testEmailConfiguration();
      const result = await emailService.transporter.sendMail({
        from: `"Event-i" <${process.env.SMTP_USER}>`,
        to,
        subject: "Event-i Test Email",
        text: "This is a test email from Event-i.",
      });
      res.json({ success: true, messageId: result?.messageId });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: "Failed to send test email" });
    }
  }
);

// Get all tickets for an order with QR codes (admin only)
router.get(
  "/orders/:orderId/tickets",
  verifyToken,
  requireRole("admin"),
  [param("orderId").isMongoId().withMessage("Invalid order ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid order ID", details: errors.array() });
      }

      const { orderId } = req.params;
      const Ticket = require("../models/Ticket");
      const Order = require("../models/Order");

      // Verify order exists
      const order = await Order.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if order is paid - QR codes only available for paid orders
      const isPaid =
        order.paymentStatus === "paid" ||
        order.paymentStatus === "completed" ||
        (order.status === "completed" && order.paymentStatus !== "pending");

      // Get all tickets for this order
      const tickets = await Ticket.find({ orderId })
        .populate("eventId", "title slug dates location")
        .sort({ createdAt: 1 })
        .lean();

      // Format tickets with QR codes (only include QR codes if order is paid)
      const formattedTickets = tickets.map((ticket) => ({
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        event: ticket.eventId
          ? {
              id: ticket.eventId._id,
              title: ticket.eventId.title,
              slug: ticket.eventId.slug,
              startDate: ticket.eventId.dates?.startDate,
              location: ticket.eventId.location,
            }
          : null,
        holder: {
          firstName: ticket.holder?.firstName,
          lastName: ticket.holder?.lastName,
          email: ticket.holder?.email,
          phone: ticket.holder?.phone,
        },
        ticketType: ticket.ticketType,
        price: ticket.price,
        status: ticket.status,
        usedAt: ticket.usedAt,
        // Only include QR codes if order is paid
        qrCode: isPaid ? ticket.qrCode : null,
        qrCodeUrl: isPaid ? ticket.qrCodeUrl : null,
        createdAt: ticket.createdAt,
      }));

      res.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          isPaid: isPaid,
          tickets: formattedTickets,
          count: formattedTickets.length,
        },
      });
    } catch (error) {
      console.error("Get order tickets error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch tickets for order",
      });
    }
  }
);

// Send reminders for an order (admin only)
router.post(
  "/orders/:orderId/send-reminders",
  verifyToken,
  requireRole("admin"),
  [param("orderId").isMongoId().withMessage("Invalid order ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Invalid input",
          details: errors.array(),
        });
      }

      const { orderId } = req.params;
      const reminderService = require("../services/reminderService");

      const result = await reminderService.sendRemindersForOrder(orderId);

      res.json({
        success: true,
        message: `Reminders sent: ${result.sent} successful, ${result.failed} failed`,
        data: result,
      });
    } catch (error) {
      console.error("Send reminders error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to send reminders",
      });
    }
  }
);

// Resend ticket email for an order (admin only)
router.post(
  "/orders/:orderId/resend-tickets",
  verifyToken,
  requireRole("admin"),
  [param("orderId").isMongoId().withMessage("Invalid order ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Invalid order ID",
          details: errors.array(),
        });
      }

      const { orderId } = req.params;
      const Order = require("../models/Order");
      const Ticket = require("../models/Ticket");
      const Event = require("../models/Event");

      // Find order
      const order = await Order.findById(orderId).lean();
      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      // Verify order is paid
      const isPaid =
        order.paymentStatus === "paid" ||
        order.paymentStatus === "completed" ||
        (order.status === "completed" && order.paymentStatus !== "pending");

      if (!isPaid) {
        return res.status(400).json({
          success: false,
          error: "Cannot resend tickets for unpaid order",
          details: `Order payment status: ${order.paymentStatus}`,
        });
      }

      // Check for customer email
      if (!order.customer?.email) {
        return res.status(400).json({
          success: false,
          error: "No customer email found for this order",
        });
      }

      // Fetch tickets
      const tickets = await Ticket.find({ orderId })
        .populate("eventId", "title dates location")
        .lean();

      if (!tickets || tickets.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No tickets found for this order",
        });
      }

      // Send ticket email
      try {
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
          `✅ Ticket email resent successfully to: ${order.customer.email} (Order: ${order.orderNumber}, ${tickets.length} tickets)`
        );

        res.json({
          success: true,
          message: `Ticket email resent successfully to ${order.customer.email}`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            email: order.customer.email,
            ticketsCount: tickets.length,
          },
        });
      } catch (emailError) {
        console.error("❌ Failed to resend ticket email:", emailError);
        res.status(500).json({
          success: false,
          error: "Failed to send ticket email",
          details: emailError.message,
        });
      }
    } catch (error) {
      console.error("Resend tickets error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to resend tickets",
      });
    }
  }
);

// ============================================
// PAYOUT MANAGEMENT ROUTES
// ============================================

// Get all payouts (admin only)
router.get("/payouts", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const Payout = require("../models/Payout");
    const { page = 1, limit = 20, status, organizerId } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (organizerId) query.organizer = organizerId;

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .populate("organizer", "email name firstName lastName")
        .populate("processedBy", "email name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payout.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        payouts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get payouts error:", error);
    res.status(500).json({ error: "Failed to load payouts" });
  }
});

// Create payout (mark orders as paid to organizer)
router.post(
  "/payouts",
  verifyToken,
  requireRole("admin"),
  [
    body("organizerId").isMongoId().withMessage("Valid organizer ID required"),
    body("orderIds").isArray({ min: 1 }).withMessage("At least one order required"),
    body("paymentMethod").optional().isIn(["bank_transfer", "mpesa", "paypal", "manual", "other"]),
    body("paymentReference").optional().isString(),
    body("notes").optional().isString().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const Order = require("../models/Order");
      const Event = require("../models/Event");
      const Payout = require("../models/Payout");
      const { organizerId, orderIds, paymentMethod = "manual", paymentReference, notes } = req.body;

      // Fetch orders
      const orders = await Order.find({ _id: { $in: orderIds } })
        .populate("items.eventId", "title organizer")
        .lean();

      if (orders.length === 0) {
        return res.status(404).json({ error: "No orders found" });
      }

      // Calculate totals
      let totalRevenue = 0;
      let serviceFees = 0;
      let transactionFees = 0;
      const eventIds = new Set();
      const eventTitles = new Set();

      orders.forEach((order) => {
        const orderAmount = order.totalAmount || order.pricing?.total || 0;
        const serviceFee = order.pricing?.serviceFee || 0;
        const transactionFee = order.pricing?.transactionFee || 0;

        totalRevenue += orderAmount;
        serviceFees += serviceFee;
        transactionFees += transactionFee;

        order.items?.forEach((item) => {
          if (item.eventId) {
            eventIds.add(item.eventId._id.toString());
            eventTitles.add(item.eventId.title);
          }
        });
      });

      const totalFees = serviceFees + transactionFees;
      const netAmount = totalRevenue - totalFees;

      // Get date range
      const orderDates = orders.map((o) => new Date(o.createdAt));
      const periodStart = new Date(Math.min(...orderDates));
      const periodEnd = new Date(Math.max(...orderDates));

      // Create payout record
      const payout = new Payout({
        organizer: organizerId,
        orders: orderIds,
        events: Array.from(eventIds),
        amounts: {
          totalRevenue,
          serviceFees,
          transactionFees,
          totalFees,
          netAmount,
        },
        status: "pending",
        paymentMethod,
        paymentReference,
        periodStart,
        periodEnd,
        notes,
        metadata: {
          orderCount: orders.length,
          eventTitles: Array.from(eventTitles),
          currency: "KES",
        },
      });

      await payout.save();

      // Populate before sending response
      await payout.populate("organizer", "email name firstName lastName");

      res.json({
        success: true,
        message: "Payout created successfully",
        data: { payout },
      });
    } catch (error) {
      console.error("Create payout error:", error);
      res.status(500).json({ error: "Failed to create payout" });
    }
  }
);

// Mark payout as completed
router.patch(
  "/payouts/:payoutId/complete",
  verifyToken,
  requireRole("admin"),
  [
    param("payoutId").isMongoId(),
    body("paymentReference").optional().isString().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Validation failed", details: errors.array() });
      }

      const Payout = require("../models/Payout");
      const { payoutId } = req.params;
      const { paymentReference } = req.body;

      const payout = await Payout.findById(payoutId);
      if (!payout) {
        return res.status(404).json({ error: "Payout not found" });
      }

      if (payout.status === "completed") {
        return res.status(400).json({ error: "Payout already completed" });
      }

      payout.markAsCompleted(req.user._id, paymentReference);
      await payout.save();

      await payout.populate("organizer", "email name firstName lastName");
      await payout.populate("processedBy", "email name");

      res.json({
        success: true,
        message: "Payout marked as completed",
        data: { payout },
      });
    } catch (error) {
      console.error("Complete payout error:", error);
      res.status(500).json({ error: "Failed to complete payout" });
    }
  }
);

// Get company revenue statistics
router.get("/revenue/stats", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const Order = require("../models/Order");
    const Payout = require("../models/Payout");
    const { startDate, endDate } = req.query;

    // Build date query
    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    // Get total revenue from completed orders
    const orderStats = await Order.aggregate([
      {
        $match: {
          status: { $in: ["completed", "paid"] },
          paymentStatus: { $in: ["paid", "completed"] },
          ...(Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$totalAmount", 0] }, 0] },
                { $ifNull: ["$totalAmount", 0] },
                { $ifNull: ["$pricing.total", 0] },
              ],
            },
          },
          totalServiceFees: { $sum: { $ifNull: ["$pricing.serviceFee", 0] } },
          totalTransactionFees: { $sum: { $ifNull: ["$pricing.transactionFee", 0] } },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    // Get payout stats
    const payoutQuery = { status: "completed" };
    if (Object.keys(dateQuery).length > 0) {
      payoutQuery.completedAt = dateQuery;
    }

    const payoutStats = await Payout.aggregate([
      { $match: payoutQuery },
      {
        $group: {
          _id: null,
          totalPaidOut: { $sum: "$amounts.netAmount" },
          totalFeesPaidOut: { $sum: "$amounts.totalFees" },
          payoutCount: { $sum: 1 },
        },
      },
    ]);

    const orders = orderStats[0] || {
      totalRevenue: 0,
      totalServiceFees: 0,
      totalTransactionFees: 0,
      orderCount: 0,
    };

    const payouts = payoutStats[0] || {
      totalPaidOut: 0,
      totalFeesPaidOut: 0,
      payoutCount: 0,
    };

    const totalFees = orders.totalServiceFees + orders.totalTransactionFees;
    const pendingPayouts = orders.totalRevenue - totalFees - payouts.totalPaidOut;
    const actualRevenue = payouts.totalFeesPaidOut; // Fees from completed payouts

    res.json({
      success: true,
      data: {
        orders: {
          totalRevenue: orders.totalRevenue,
          totalServiceFees: orders.totalServiceFees,
          totalTransactionFees: orders.totalTransactionFees,
          totalFees,
          orderCount: orders.orderCount,
        },
        payouts: {
          totalPaidOut: payouts.totalPaidOut,
          totalFees: payouts.totalFeesPaidOut,
          payoutCount: payouts.payoutCount,
        },
        company: {
          actualRevenue, // Platform fees from completed payouts
          pendingPayouts, // Amount still owed to organizers
          totalCollected: orders.totalRevenue, // Total from customers
        },
      },
    });
  } catch (error) {
    console.error("Revenue stats error:", error);
    res.status(500).json({ error: "Failed to load revenue statistics" });
  }
});

// Get pending payouts summary by organizer
router.get("/payouts/pending-summary", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const Order = require("../models/Order");
    const Event = require("../models/Event");
    const Payout = require("../models/Payout");

    // Get all paid orders
    const orders = await Order.find({
      $or: [
        { status: "paid", paymentStatus: "paid" },
        { status: "completed", paymentStatus: "paid" },
      ],
    })
      .populate({
        path: "items.eventId",
        select: "title organizer",
        populate: {
          path: "organizer",
          select: "email name firstName lastName",
        },
      })
      .lean();

    // Get all completed payouts
    const completedPayouts = await Payout.find({ status: "completed" })
      .select("orders")
      .lean();

    const paidOutOrderIds = new Set(
      completedPayouts.flatMap((p) => p.orders.map((id) => id.toString()))
    );

    // Group unpaid orders by organizer
    const summary = {};

    orders
      .filter((order) => !paidOutOrderIds.has(order._id.toString()))
      .forEach((order) => {
        order.items?.forEach((item) => {
          const event = item.eventId;
          if (!event || !event.organizer) return;

          const organizerId = event.organizer._id.toString();
          if (!summary[organizerId]) {
            summary[organizerId] = {
              organizer: event.organizer,
              orders: [],
              totalRevenue: 0,
              totalFees: 0,
              netAmount: 0,
            };
          }

          const orderAmount = order.totalAmount || order.pricing?.total || 0;
          const serviceFee = order.pricing?.serviceFee || 0;
          const transactionFee = order.pricing?.transactionFee || 0;
          const totalFees = serviceFee + transactionFee;

          summary[organizerId].orders.push(order._id);
          summary[organizerId].totalRevenue += orderAmount;
          summary[organizerId].totalFees += totalFees;
          summary[organizerId].netAmount += orderAmount - totalFees;
        });
      });

    res.json({
      success: true,
      data: Object.values(summary),
    });
  } catch (error) {
    console.error("Pending payouts summary error:", error);
    res.status(500).json({ error: "Failed to load pending payouts summary" });
  }
});

// Preview bulk resend - show orders that will be affected
router.get(
  "/tickets/bulk-resend/preview",
  verifyToken,
  requireRole("admin"),
  [
    query("eventId").optional().isMongoId().withMessage("Invalid event ID format"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date format (use ISO8601)"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date format (use ISO8601)"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { eventId, startDate, endDate, page = 1, limit = 20 } = req.query;

      // Import models
      const Order = require("../models/Order");
      const Ticket = require("../models/Ticket");

      // Build query for paid/completed orders (same logic as bulk resend)
      // Accept orders where payment.status is completed (most reliable indicator)
      // and status is either completed or paid
      const orderQuery = {
        status: { $in: ["completed", "paid"] },
        "payment.status": "completed",
      };

      // Skip orders that were recently resent (duplicate prevention)
      const recentWindowMinutes = 30;
      const recentCutoff = new Date(Date.now() - recentWindowMinutes * 60 * 1000);
      orderQuery.$or = [
        { "metadata.lastBulkResendAt": { $exists: false } },
        { "metadata.lastBulkResendAt": { $lt: recentCutoff } },
      ];

      // Add event filter if provided
      if (eventId) {
        orderQuery["items.eventId"] = eventId;
      }

      // Add date range filter if provided
      if (startDate || endDate) {
        orderQuery.createdAt = {};
        if (startDate) {
          orderQuery.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          orderQuery.createdAt.$lte = new Date(endDate);
        }
      }

      // Count total orders matching criteria
      const totalOrders = await Order.countDocuments(orderQuery);

      // Fetch paginated orders with customer and event info
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const orders = await Order.find(orderQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get ticket counts and event info for each order
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          // Count tickets for this order
          const ticketCount = await Ticket.countDocuments({ orderId: order._id });

          // Get event info from first item
          const eventId = order.items?.[0]?.eventId;
          let eventTitle = "N/A";
          if (eventId) {
            const event = await Event.findById(eventId).select("title").lean();
            eventTitle = event?.title || "N/A";
          }

          // Extract customer info
          const customerEmail =
            order.customer?.email || order.customer?.userId?.email || order.customerEmail || "N/A";
          const customerName =
            order.customer?.firstName && order.customer?.lastName
              ? `${order.customer.firstName} ${order.customer.lastName}`
              : order.customer?.userId?.name || order.customerName || "N/A";

          return {
            orderNumber: order.orderNumber,
            customerEmail,
            customerName,
            ticketCount,
            createdAt: order.createdAt,
            eventTitle,
            lastBulkResendAt: order.metadata?.lastBulkResendAt || null,
          };
        })
      );

      // Calculate total tickets across all matching orders
      const totalTickets = await Ticket.countDocuments({
        orderId: { $in: (await Order.find(orderQuery).select("_id").lean()).map((o) => o._id) },
      });

      // Estimate duration (2 seconds per order + email delay)
      const EMAIL_DELAY_MS = parseInt(process.env.BULK_EMAIL_DELAY_MS || "150", 10);
      const estimatedDurationSeconds = Math.ceil((totalOrders * 2000 + (totalOrders - 1) * EMAIL_DELAY_MS) / 1000);
      const estimatedDurationFormatted =
        estimatedDurationSeconds >= 60
          ? `${Math.floor(estimatedDurationSeconds / 60)}m ${estimatedDurationSeconds % 60}s`
          : `${estimatedDurationSeconds}s`;

      res.json({
        success: true,
        data: {
          orders: ordersWithDetails,
          pagination: {
            total: totalOrders,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(totalOrders / parseInt(limit)),
          },
          summary: {
            totalOrders,
            totalTickets,
            estimatedDuration: estimatedDurationFormatted,
            filters: {
              eventId: eventId || null,
              startDate: startDate || null,
              endDate: endDate || null,
              recentWindowMinutes,
            },
          },
        },
      });
    } catch (error) {
      console.error("Bulk resend preview error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate preview",
        details: error.message,
      });
    }
  }
);

// Bulk resend tickets with updated QR codes
router.post(
  "/tickets/bulk-resend",
  verifyToken,
  requireRole("admin"),
  [
    query("eventId").optional().isMongoId().withMessage("Invalid event ID format"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date format (use ISO8601)"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date format (use ISO8601)"),
    query("dryRun").optional().isBoolean().withMessage("dryRun must be a boolean"),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const bulkResendService = require("../services/bulkResendService");
      const BulkResendLog = require("../models/BulkResendLog");
      const Order = require("../models/Order");
      const { enqueueBulkResend, isQueueReady } = require("../services/queue/bulkResendQueue");
      const { eventId, startDate, endDate, dryRun } = req.query;
      const isDryRun = dryRun === 'true' || dryRun === true;

      console.log(
        `📧 Admin bulk resend requested${eventId ? ` for event ${eventId}` : " (all events)"}${
          startDate || endDate ? ` with date range: ${startDate || "start"} to ${endDate || "end"}` : ""
        }`
      );

      // Get event title if eventId provided
      let eventTitle = null;
      if (eventId) {
        const event = await Event.findById(eventId).select("title");
        eventTitle = event?.title;
      }

      // Build query to count orders (same logic as service)
      const orderQuery = {
        status: { $in: ["completed", "paid"] },
        paymentStatus: "completed",
        "payment.status": "completed",
      };

      // Add filters
      if (eventId) {
        orderQuery["items.eventId"] = eventId;
      }
      if (startDate || endDate) {
        orderQuery.createdAt = {};
        if (startDate) orderQuery.createdAt.$gte = new Date(startDate);
        if (endDate) orderQuery.createdAt.$lte = new Date(endDate);
      }

      // Skip recently resent orders
      const recentCutoff = new Date(Date.now() - 30 * 60 * 1000);
      orderQuery.$or = [
        { "metadata.lastBulkResendAt": { $exists: false } },
        { "metadata.lastBulkResendAt": { $lt: recentCutoff } },
      ];

      // Count orders
      const orderCount = await Order.countDocuments(orderQuery);
      const queueThreshold = parseInt(process.env.BULK_RESEND_QUEUE_THRESHOLD || "100", 10);

      console.log(`📊 Order count: ${orderCount}, Threshold: ${queueThreshold}, Queue ready: ${isQueueReady()}`);

      // Determine execution mode: queue if >= threshold AND queue is ready
      const shouldQueue = orderCount >= queueThreshold && isQueueReady();

      // Create audit log entry
      const auditLog = await BulkResendLog.create({
        triggeredBy: {
          userId: req.user._id,
          userEmail: req.user.email,
          userName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
          role: req.user.role,
        },
        filters: {
          eventId: eventId || null,
          eventTitle,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          skipRecentlyResent: true,
          recentWindowMinutes: 30,
        },
        executionMode: shouldQueue ? "queued" : "synchronous",
        status: shouldQueue ? "pending" : "in_progress",
      });

      if (shouldQueue) {
        // Enqueue job for background processing
        try {
          const jobId = await enqueueBulkResend(auditLog._id.toString(), {
            eventId,
            startDate,
            endDate,
            batchSize: 50,
            skipRecentlyResent: true,
            recentWindowMinutes: 30,
            dryRun: isDryRun,
          });

          console.log(`✅ Bulk resend job enqueued: ${jobId}`);

          res.json({
            success: true,
            message: "Bulk resend job enqueued for background processing",
            data: {
              jobId,
              auditLogId: auditLog._id,
              status: "queued",
              estimatedOrders: orderCount,
            },
          });
        } catch (err) {
          // Queue failed - update audit log and re-throw
          auditLog.status = "failed";
          auditLog.endTime = new Date();
          auditLog.error = `Failed to enqueue job: ${err.message}`;
          await auditLog.save();
          throw err;
        }
      } else {
        // Process synchronously
        try {
          console.log(`⚡ Processing synchronously (${orderCount} orders)`);

          const stats = await bulkResendService.resendTicketsForOrders({
            eventId,
            startDate,
            endDate,
            batchSize: 50,
            skipRecentlyResent: true,
            recentWindowMinutes: 30,
            dryRun: isDryRun,
          });

          // Update audit log with results
          auditLog.status = "completed";
          auditLog.endTime = new Date();
          auditLog.stats = {
            totalOrdersFound: stats.totalOrdersFound,
            totalOrdersProcessed: stats.totalOrdersProcessed,
            totalOrdersSkipped: stats.totalOrdersSkipped,
            totalTicketsUpdated: stats.totalTicketsUpdated,
            totalEmailsSent: stats.totalEmailsSent,
            totalEmailRetries: stats.totalEmailRetries,
            totalErrors: stats.totalErrors,
          };
          auditLog.errors = stats.errors || [];
          await auditLog.save();

          res.json({
            success: true,
            message: "Bulk resend completed",
            data: {
              ...stats,
              auditLogId: auditLog._id,
            },
          });
        } catch (err) {
          // Update audit log with failure
          auditLog.status = "failed";
          auditLog.endTime = new Date();
          auditLog.error = err.message;
          await auditLog.save();
          throw err; // Re-throw to be caught by outer catch
        }
      }
    } catch (error) {
      console.error("❌ Bulk resend error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process bulk resend",
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/bulk-resend-logs
 * @desc    Get list of bulk resend audit logs (paginated with filters)
 * @access  Private/Admin
 */
router.get(
  "/bulk-resend-logs",
  verifyToken,
  requireRole("admin"),
  [
    query("status")
      .optional()
      .isIn(["pending", "in_progress", "completed", "failed", "cancelled"])
      .withMessage("Invalid status"),
    query("userId").optional().isMongoId().withMessage("Invalid user ID"),
    query("eventId").optional().isMongoId().withMessage("Invalid event ID"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
    query("page").optional().isInt({ min: 1 }).withMessage("Invalid page"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Invalid limit"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        status,
        userId,
        eventId,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      // Build query
      const query = {};

      if (status) {
        query.status = status;
      }

      if (userId) {
        query["triggeredBy.userId"] = userId;
      }

      if (eventId) {
        query["filters.eventId"] = eventId;
      }

      // Date range filter on startTime
      if (startDate || endDate) {
        query.startTime = {};
        if (startDate) {
          query.startTime.$gte = new Date(startDate);
        }
        if (endDate) {
          query.startTime.$lte = new Date(endDate);
        }
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Fetch logs with pagination
      const [logs, totalCount] = await Promise.all([
        BulkResendLog.find(query)
          .populate("triggeredBy.userId", "email firstName lastName name")
          .populate("filters.eventId", "title")
          .sort({ startTime: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        BulkResendLog.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total: totalCount,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1,
          },
        },
      });
    } catch (error) {
      console.error("❌ Failed to fetch bulk resend logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch bulk resend logs",
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/admin/bulk-resend-logs/:logId
 * @desc    Get single bulk resend audit log with full details
 * @access  Private/Admin
 */
router.get(
  "/bulk-resend-logs/:logId",
  verifyToken,
  requireRole("admin"),
  [param("logId").isMongoId().withMessage("Invalid log ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { logId } = req.params;

      const log = await BulkResendLog.findById(logId)
        .populate("triggeredBy.userId", "email firstName lastName name role")
        .populate("filters.eventId", "title startDate endDate")
        .lean();

      if (!log) {
        return res.status(404).json({
          success: false,
          error: "Audit log not found",
        });
      }

      // Calculate duration if not stored
      if (log.startTime && log.endTime && !log.duration) {
        log.duration = log.endTime - log.startTime;
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      console.error("❌ Failed to fetch bulk resend log:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch bulk resend log",
        message: error.message,
      });
    }
  }
);

module.exports = router;
