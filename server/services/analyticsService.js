const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const EventUpdate = require('../models/EventUpdate');
const EventUpdateReaction = require('../models/EventUpdateReaction');
const EventUpdateRead = require('../models/EventUpdateRead');
const mongoose = require('mongoose');

/**
 * Analytics Service for Organizer Dashboard
 * Provides comprehensive analytics for ticket sales, revenue, and attendee data
 */
class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get update analytics for an event
   * @param {string} eventId - Event ID
   * @returns {Object} Update analytics data
   */
  async getUpdateAnalytics(eventId) {
    try {
      const cacheKey = `update_analytics_${eventId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Get total updates count
      const totalUpdates = await EventUpdate.countDocuments({ eventId });
      
      // Get updates by priority
      const updatesByPriority = await EventUpdate.aggregate([
        { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);

      // Get total reactions count
      const totalReactions = await EventUpdateReaction.countDocuments({ eventId });
      
      // Get reactions by type
      const reactionsByType = await EventUpdateReaction.aggregate([
        { $match: { eventId: mongoose.Types.ObjectId(eventId) } },
        { $group: { _id: '$reactionType', count: { $sum: 1 } } }
      ]);

      // Get total reads count
      const totalReads = await EventUpdateRead.countDocuments({ eventId });

      // Get engagement rate (reads / total possible reads)
      const totalTickets = await Ticket.countDocuments({ eventId });
      const engagementRate = totalTickets > 0 ? (totalReads / (totalUpdates * totalTickets)) * 100 : 0;

      // Get recent updates (last 10)
      const recentUpdates = await EventUpdate.find({ eventId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('content priority createdAt')
        .lean();

      const result = {
        summary: {
          totalUpdates,
          totalReactions,
          totalReads,
          engagementRate: Math.round(engagementRate * 100) / 100
        },
        updatesByPriority: updatesByPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        reactionsByType: reactionsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentUpdates,
        lastUpdated: new Date()
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Update analytics error:', error);
      throw error;
    }
  }

  /**
   * Get sales chart data for an event
   * @param {string} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Object} Sales chart data
   */
  async getSalesChart(eventId, options = {}) {
    const { period = 'daily', startDate, endDate, ticketType } = options;
    
    try {
      // Validate event ownership
      await this.validateEventAccess(eventId);
      
      const cacheKey = `sales_chart_${eventId}_${period}_${startDate}_${endDate}_${ticketType}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const matchStage = this.buildSalesMatchStage(eventId, startDate, endDate, ticketType);
      const unwindStage = { $unwind: '$items' };
      const groupStage = this.buildSalesGroupStage(period);
      const sortStage = { $sort: { '_id.date': 1 } };

      const pipeline = [matchStage, unwindStage, groupStage, sortStage];

      const salesData = await Order.aggregate(pipeline);
      
      // Get summary statistics
      const summary = await this.getSalesSummary(eventId, startDate, endDate);
      
      const result = {
        chartData: salesData,
        summary,
        period,
        dateRange: { startDate, endDate }
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Analytics Service - Sales Chart Error:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive revenue overview for an event
   * @param {string} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Object} Revenue overview data
   */
  async getRevenueOverview(eventId, options = {}) {
    try {
      await this.validateEventAccess(eventId);
      
      const cacheKey = `revenue_overview_${eventId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const [
        revenueMetrics,
        paymentMethodBreakdown,
        refundMetrics,
        ticketTypeRevenue,
        dailyRevenue
      ] = await Promise.all([
        this.getRevenueMetrics(eventId),
        this.getPaymentMethodBreakdown(eventId),
        this.getRefundMetrics(eventId),
        this.getTicketTypeRevenue(eventId),
        this.getDailyRevenue(eventId)
      ]);

      const result = {
        ...revenueMetrics,
        paymentMethods: paymentMethodBreakdown,
        refunds: refundMetrics,
        ticketTypes: ticketTypeRevenue,
        dailyTrend: dailyRevenue
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Analytics Service - Revenue Overview Error:', error);
      throw error;
    }
  }

  /**
   * Get revenue trends across multiple events
   * @param {string} organizerId - Organizer ID
   * @param {Object} options - Query options
   * @returns {Object} Revenue trends data
   */
  async getRevenueTrends(organizerId, options = {}) {
    const { period = 'monthly', startDate, endDate, eventIds } = options;
    
    try {
      const cacheKey = `revenue_trends_${organizerId}_${period}_${startDate}_${endDate}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Auto-fetch organizer's events if not provided
      let targetEventIds = eventIds;
      if (!targetEventIds || targetEventIds.length === 0) {
        const events = await Event.find({ organizer: organizerId }).select('_id');
        targetEventIds = events.map(e => e._id);
      }

      const matchStage = {
        $match: {
          'items.eventId': { $in: targetEventIds },
          status: { $in: ['paid', 'confirmed'] },
          ...(startDate && endDate && {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          })
        }
      };

      const groupStage = this.buildRevenueTrendsGroupStage(period);
      const sortStage = { $sort: { '_id.period': 1 } };

      const pipeline = [matchStage, groupStage, sortStage];
      const trendsData = await Order.aggregate(pipeline);

      // Get event-wise breakdown
      const eventBreakdown = await this.getEventRevenueBreakdown(organizerId, eventIds);

      const result = {
        trends: trendsData,
        eventBreakdown,
        period,
        dateRange: { startDate, endDate }
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Analytics Service - Revenue Trends Error:', error);
      throw error;
    }
  }

  /**
   * Export attendee list for an event
   * @param {string} eventId - Event ID
   * @param {Object} options - Export options
   * @returns {Object} Export data
   */
  async exportAttendees(eventId, options = {}) {
    const { format = 'csv', filters = {}, fields = [] } = options;
    
    try {
      await this.validateEventAccess(eventId);
      
      const matchStage = {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          ...this.buildTicketFilters(filters)
        }
      };

      const lookupStage = {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order'
        }
      };

      const unwindStage = { $unwind: '$order' };

      const lookupEventStage = {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      };

      const unwindEventStage = { $unwind: '$event' };

      const projectStage = {
        $project: {
          ticketNumber: 1,
          ticketType: 1,
          price: 1,
          status: 1,
          createdAt: 1,
          usedAt: 1,
          'holder.firstName': 1,
          'holder.lastName': 1,
          'holder.email': 1,
          'holder.phone': 1,
          'order.orderNumber': 1,
          'order.createdAt': 1,
          'order.payment.method': 1,
          'order.payment.status': 1,
          'event.title': 1,
          'event.dates.startDate': 1,
          'event.dates.endDate': 1
        }
      };

      const sortStage = { $sort: { createdAt: -1 } };

      const pipeline = [
        matchStage,
        lookupStage,
        unwindStage,
        lookupEventStage,
        unwindEventStage,
        projectStage,
        sortStage
      ];

      const attendees = await Ticket.aggregate(pipeline);
      
      return {
        data: attendees,
        format,
        totalCount: attendees.length,
        exportedAt: new Date(),
        filters
      };
    } catch (error) {
      console.error('Analytics Service - Export Attendees Error:', error);
      throw error;
    }
  }

  /**
   * Get dashboard overview for organizer
   * @param {string} organizerId - Organizer ID
   * @returns {Object} Dashboard overview
   */
  async getDashboardOverview(organizerId) {
    try {
      const cacheKey = `dashboard_overview_${organizerId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const [
        eventsCount,
        totalRevenue,
        totalTicketsSold,
        upcomingEvents,
        recentSales
      ] = await Promise.all([
        this.getEventsCount(organizerId),
        this.getTotalRevenue(organizerId),
        this.getTotalTicketsSold(organizerId),
        this.getUpcomingEvents(organizerId),
        this.getRecentSales(organizerId)
      ]);

      const result = {
        eventsCount,
        totalRevenue,
        totalTicketsSold,
        upcomingEvents,
        recentSales,
        lastUpdated: new Date()
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Analytics Service - Dashboard Overview Error:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Validate event access for organizer
   */
  async validateEventAccess(eventId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  }

  /**
   * Build match stage for sales queries
   */
  buildSalesMatchStage(eventId, startDate, endDate, ticketType) {
    const match = {
      'items.eventId': new mongoose.Types.ObjectId(eventId),
      status: { $in: ['paid', 'confirmed'] }
    };

    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (ticketType) {
      match['items.ticketType'] = ticketType;
    }

    return { $match: match };
  }

  /**
   * Build group stage for sales aggregation
   */
  buildSalesGroupStage(period) {
    const dateFormat = {
      daily: '%Y-%m-%d',
      weekly: '%Y-%U',
      monthly: '%Y-%m'
    }[period] || '%Y-%m-%d';

    return {
      $group: {
        _id: {
          date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          ticketType: '$items.ticketType'
        },
        count: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        orders: { $sum: 1 }
      }
    };
  }

  /**
   * Build group stage for revenue trends
   */
  buildRevenueTrendsGroupStage(period) {
    const dateFormat = {
      daily: '%Y-%m-%d',
      weekly: '%Y-%U',
      monthly: '%Y-%m'
    }[period] || '%Y-%m';

    return {
      $group: {
        _id: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } }
        },
        totalRevenue: { $sum: '$pricing.total' },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: '$pricing.total' }
      }
    };
  }

  /**
   * Build ticket filters for export
   */
  buildTicketFilters(filters) {
    const ticketFilters = {};
    
    if (filters.status) {
      ticketFilters.status = filters.status;
    }
    
    if (filters.ticketType) {
      ticketFilters.ticketType = filters.ticketType;
    }
    
    if (filters.dateFrom && filters.dateTo) {
      ticketFilters.createdAt = {
        $gte: new Date(filters.dateFrom),
        $lte: new Date(filters.dateTo)
      };
    }

    return ticketFilters;
  }

  /**
   * Get sales summary statistics
   */
  async getSalesSummary(eventId, startDate, endDate) {
    const matchStage = this.buildSalesMatchStage(eventId, startDate, endDate);
    
    const summaryPipeline = [
      matchStage,
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalTicketsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$pricing.total' }
        }
      }
    ];

    const [summary] = await Order.aggregate(summaryPipeline);
    return summary || {
      totalTicketsSold: 0,
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0
    };
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(eventId) {
    const pipeline = [
      {
        $match: {
          'items.eventId': new mongoose.Types.ObjectId(eventId),
          status: { $in: ['paid', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.subtotal' },
          totalFees: { $sum: '$pricing.serviceFee' },
          netRevenue: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$pricing.total' }
        }
      }
    ];

    const [metrics] = await Order.aggregate(pipeline);
    return metrics || {
      totalRevenue: 0,
      totalFees: 0,
      netRevenue: 0,
      orderCount: 0,
      avgOrderValue: 0
    };
  }

  /**
   * Get payment method breakdown
   */
  async getPaymentMethodBreakdown(eventId) {
    const pipeline = [
      {
        $match: {
          'items.eventId': new mongoose.Types.ObjectId(eventId),
          status: 'paid'
        }
      },
      {
        $group: {
          _id: '$payment.method',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ];

    return await Order.aggregate(pipeline);
  }

  /**
   * Get refund metrics
   */
  async getRefundMetrics(eventId) {
    const pipeline = [
      {
        $match: {
          'items.eventId': new mongoose.Types.ObjectId(eventId),
          status: 'refunded'
        }
      },
      {
        $group: {
          _id: null,
          refundCount: { $sum: 1 },
          refundAmount: { $sum: '$pricing.total' }
        }
      }
    ];

    const [refunds] = await Order.aggregate(pipeline);
    return refunds || { refundCount: 0, refundAmount: 0 };
  }

  /**
   * Get ticket type revenue breakdown
   */
  async getTicketTypeRevenue(eventId) {
    const pipeline = [
      {
        $match: {
          'items.eventId': new mongoose.Types.ObjectId(eventId),
          status: { $in: ['paid', 'confirmed'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.ticketType',
          count: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      }
    ];

    return await Order.aggregate(pipeline);
  }

  /**
   * Get daily revenue trend
   */
  async getDailyRevenue(eventId) {
    const pipeline = [
      {
        $match: {
          'items.eventId': new mongoose.Types.ObjectId(eventId),
          status: { $in: ['paid', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ];

    return await Order.aggregate(pipeline);
  }

  /**
   * Get event revenue breakdown
   */
  async getEventRevenueBreakdown(organizerId, eventIds) {
    const pipeline = [
      {
        $match: {
          'items.eventId': { $in: eventIds || [] },
          status: { $in: ['paid', 'confirmed'] }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'events',
          localField: 'items.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$items.eventId',
          eventTitle: { $first: '$event.title' },
          revenue: { $sum: '$items.subtotal' },
          ticketsSold: { $sum: '$items.quantity' }
        }
      }
    ];

    return await Order.aggregate(pipeline);
  }

  /**
   * Get events count for organizer
   */
  async getEventsCount(organizerId) {
    return await Event.countDocuments({ organizer: organizerId });
  }

  /**
   * Get total revenue for organizer
   */
  async getTotalRevenue(organizerId) {
    const pipeline = [
      {
        $lookup: {
          from: 'events',
          localField: 'items.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $match: {
          'event.organizer': new mongoose.Types.ObjectId(organizerId),
          status: { $in: ['paid', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' }
        }
      }
    ];

    const [result] = await Order.aggregate(pipeline);
    return result?.totalRevenue || 0;
  }

  /**
   * Get total tickets sold for organizer
   */
  async getTotalTicketsSold(organizerId) {
    const pipeline = [
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $match: {
          'event.organizer': new mongoose.Types.ObjectId(organizerId),
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 }
        }
      }
    ];

    const [result] = await Ticket.aggregate(pipeline);
    return result?.totalTickets || 0;
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(organizerId) {
    return await Event.find({
      organizer: organizerId,
      status: 'published',
      'dates.startDate': { $gt: new Date() }
    })
    .sort({ 'dates.startDate': 1 })
    .limit(5)
    .select('title dates.startDate capacity currentAttendees')
    .lean();
  }

  /**
   * Get recent sales
   */
  async getRecentSales(organizerId) {
    const pipeline = [
      {
        $lookup: {
          from: 'events',
          localField: 'items.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $match: {
          'event.organizer': new mongoose.Types.ObjectId(organizerId),
          status: { $in: ['paid', 'confirmed'] }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          orderNumber: 1,
          createdAt: 1,
          'pricing.total': 1,
          'event.title': 1,
          'items.ticketType': 1,
          'items.quantity': 1
        }
      }
    ];

    return await Order.aggregate(pipeline);
  }

  /**
   * Cache management methods
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for specific event
   */
  clearEventCache(eventId) {
    for (const key of this.cache.keys()) {
      if (key.includes(eventId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }
}

module.exports = new AnalyticsService();
