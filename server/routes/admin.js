const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { param, body, validationResult } = require("express-validator");
const User = require("../models/User");
const Event = require("../models/Event");
const Session = require("../models/Session");
const ScanLog = require("../models/ScanLog");
const emailService = require("../services/emailService");

const router = express.Router();

// Admin health/overview
router.get("/overview", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const Order = require("../models/Order");
    const Ticket = require("../models/Ticket");

    const [
      usersCount,
      eventsCount,
      activeSessions,
      ordersCount,
      ticketsCount,
      completedOrdersCount,
      pendingOrdersCount,
      totalRevenue,
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
        status: "completed", 
        paymentStatus: { $in: ["paid", "completed"] } 
      }),
      Order.countDocuments({ status: "pending" }),
      // Calculate total revenue from completed orders
      Order.aggregate([
        {
          $match: {
            status: "completed",
            paymentStatus: "paid",
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
          status: "completed",
          paymentStatus: "paid",
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
      revenueQuery.status = "completed";
      revenueQuery.paymentStatus = "paid";
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
            status: "completed",
            paymentStatus: "paid",
          }),
          Ticket.countDocuments({ eventId: event._id }),
          Order.aggregate([
            {
              $match: {
                "items.eventId": event._id,
                status: "completed",
                paymentStatus: "paid",
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

module.exports = router;
