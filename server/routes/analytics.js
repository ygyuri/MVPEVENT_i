const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const exportService = require('../services/exportService');
const Event = require('../models/Event');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for analytics endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many analytics requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const exportRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 exports per minute
  message: {
    success: false,
    error: 'Too many export requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 admin actions per minute
  message: {
    success: false,
    error: 'Too many admin requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Validation helper
 */
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      details: errors.array() 
    });
    return false;
  }
  return true;
};

/**
 * Event ownership validation helper
 */
const validateEventOwnership = async (eventId, userId, userRole) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }
  
  const isOwner = String(event.organizer) === String(userId);
  const isAdmin = userRole === 'admin';
  
  if (!isOwner && !isAdmin) {
    throw new Error('Access denied - not event owner');
  }
  
  return event;
};

/**
 * @route GET /api/organizer/analytics/dashboard-overview
 * @desc Get dashboard overview for organizer
 * @access Private (Organizer/Admin)
 */
router.get('/dashboard-overview', verifyToken, requireRole(['organizer', 'admin']), async (req, res) => {
  try {
    const overview = await analyticsService.getDashboardOverview(req.user._id);
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard overview'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/sales-chart/:eventId
 * @desc Get sales chart data for an event
 * @access Private (Organizer/Admin)
 */
router.get('/sales-chart/:eventId', analyticsRateLimit, verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isMongoId().withMessage('Invalid event ID'),
  query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('ticketType').optional().isString().trim().withMessage('Invalid ticket type')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { eventId } = req.params;
    const { period, startDate, endDate, ticketType } = req.query;
    
    // Validate event ownership
    await validateEventOwnership(eventId, req.user._id, req.user.role);
    
    const options = { period, startDate, endDate, ticketType };
    const salesData = await analyticsService.getSalesChart(eventId, options);
    
    res.json({
      success: true,
      data: salesData
    });
  } catch (error) {
    console.error('Sales chart error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (error.message === 'Access denied - not event owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to load sales chart data'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/revenue-overview/:eventId
 * @desc Get comprehensive revenue overview for an event
 * @access Private (Organizer/Admin)
 */
router.get('/revenue-overview/:eventId', verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isMongoId().withMessage('Invalid event ID')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { eventId } = req.params;
    
    // Validate event ownership
    await validateEventOwnership(eventId, req.user._id, req.user.role);
    
    const revenueData = await analyticsService.getRevenueOverview(eventId);
    
    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error('Revenue overview error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (error.message === 'Access denied - not event owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to load revenue overview'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/revenue-trends
 * @desc Get revenue trends across multiple events
 * @access Private (Organizer/Admin)
 */
router.get('/revenue-trends', verifyToken, requireRole(['organizer', 'admin']), [
  query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('eventIds').optional().isString().withMessage('Invalid event IDs')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { period, startDate, endDate, eventIds } = req.query;
    
    // Parse event IDs if provided
    let parsedEventIds = null;
    if (eventIds) {
      try {
        parsedEventIds = JSON.parse(eventIds);
        if (!Array.isArray(parsedEventIds)) {
          throw new Error('Event IDs must be an array');
        }
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid event IDs format'
        });
      }
    }
    
    const options = { period, startDate, endDate, eventIds: parsedEventIds };
    const trendsData = await analyticsService.getRevenueTrends(req.user._id, options);
    
    res.json({
      success: true,
      data: trendsData
    });
  } catch (error) {
    console.error('Revenue trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load revenue trends'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/export/attendees/:eventId
 * @desc Export attendee list for an event
 * @access Private (Organizer/Admin)
 */
router.get('/export/attendees/:eventId', exportRateLimit, verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isMongoId().withMessage('Invalid event ID'),
  query('format').optional().isIn(['csv', 'excel', 'pdf', 'json']).withMessage('Invalid format'),
  query('status').optional().isIn(['all', 'active', 'used', 'cancelled', 'refunded']).withMessage('Invalid status'),
  query('ticketType').optional().isString().trim().withMessage('Invalid ticket type'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid date from'),
  query('dateTo').optional().isISO8601().withMessage('Invalid date to')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { eventId } = req.params;
    const { format, status, ticketType, dateFrom, dateTo } = req.query;
    
    // Validate event ownership
    await validateEventOwnership(eventId, req.user._id, req.user.role);
    
    const filters = { status, ticketType, dateFrom, dateTo };
    const options = { format, filters };
    
    const exportData = await analyticsService.exportAttendees(eventId, options);
    
    // Set appropriate headers based on format
    const formatHeaders = {
      csv: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendees-${eventId}.csv"`
      },
      excel: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendees-${eventId}.xlsx"`
      },
      pdf: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="attendees-${eventId}.pdf"`
      },
      json: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="attendees-${eventId}.json"`
      }
    };
    
    const headers = formatHeaders[format] || formatHeaders.json;
    
    // Set headers
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (format === 'json') {
      res.json({
        success: true,
        data: exportData
      });
    } else {
      // For CSV, Excel, PDF - you would implement file generation here
      // For now, return JSON with export metadata
      res.json({
        success: true,
        message: 'Export data ready',
        data: exportData,
        downloadUrl: `/api/organizer/analytics/download/${eventId}/${format}`
      });
    }
  } catch (error) {
    console.error('Export attendees error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (error.message === 'Access denied - not event owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to export attendee data'
    });
  }
});

/**
 * @route POST /api/organizer/analytics/export/attendees/:eventId
 * @desc Create export job for large attendee lists
 * @access Private (Organizer/Admin)
 */
router.post('/export/attendees/:eventId', verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isMongoId().withMessage('Invalid event ID'),
  body('format').isIn(['csv', 'excel', 'pdf', 'json']).withMessage('Invalid format'),
  body('filters').optional().isObject().withMessage('Invalid filters'),
  body('fields').optional().isArray().withMessage('Invalid fields')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { eventId } = req.params;
    const { format, filters = {}, fields = [] } = req.body;
    
    // Validate event ownership
    await validateEventOwnership(eventId, req.user._id, req.user.role);
    
    // For large exports, you would typically queue this job
    // For now, process immediately
    const options = { format, filters, fields };
    const exportData = await analyticsService.exportAttendees(eventId, options);
    
    res.json({
      success: true,
      message: 'Export job completed',
      data: {
        jobId: `export_${eventId}_${Date.now()}`,
        format,
        totalRecords: exportData.totalCount,
        exportedAt: exportData.exportedAt,
        downloadUrl: `/api/organizer/analytics/download/${eventId}/${format}`
      }
    });
  } catch (error) {
    console.error('Export job error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (error.message === 'Access denied - not event owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create export job'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/events/:eventId/summary
 * @desc Get quick summary for a specific event
 * @access Private (Organizer/Admin)
 */
router.get('/events/:eventId/summary', verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isMongoId().withMessage('Invalid event ID')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { eventId } = req.params;
    
    // Validate event ownership
    await validateEventOwnership(eventId, req.user._id, req.user.role);
    
    const [salesSummary, revenueOverview] = await Promise.all([
      analyticsService.getSalesChart(eventId, { period: 'daily' }),
      analyticsService.getRevenueOverview(eventId)
    ]);
    
    res.json({
      success: true,
      data: {
        sales: salesSummary.summary,
        revenue: revenueOverview,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Event summary error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (error.message === 'Access denied - not event owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to load event summary'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/cache/clear
 * @desc Clear analytics cache (Admin only)
 * @access Private (Admin)
 */
router.get('/cache/clear', adminRateLimit, verifyToken, requireRole('admin'), async (req, res) => {
  try {
    analyticsService.clearAllCache();
    
    res.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/cache/clear/:eventId
 * @desc Clear analytics cache for specific event
 * @access Private (Organizer/Admin)
 */
router.get('/cache/clear/:eventId', verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isMongoId().withMessage('Invalid event ID')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { eventId } = req.params;
    
    // Validate event ownership
    await validateEventOwnership(eventId, req.user._id, req.user.role);
    
    analyticsService.clearEventCache(eventId);
    
    res.json({
      success: true,
      message: `Analytics cache cleared for event ${eventId}`
    });
  } catch (error) {
    console.error('Event cache clear error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (error.message === 'Access denied - not event owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to clear event cache'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/download/:eventId/:format
 * @desc Download exported file
 * @access Private (Organizer/Admin)
 */
router.get('/download/:eventId/:format', verifyToken, requireRole(['organizer', 'admin']), [
  param('eventId').isMongoId().withMessage('Invalid event ID'),
  param('format').isIn(['csv', 'excel', 'pdf', 'json']).withMessage('Invalid format')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { eventId, format } = req.params;
    
    // Validate event ownership
    await validateEventOwnership(eventId, req.user._id, req.user.role);
    
    // Generate filename
    const filename = exportService.generateFilename(eventId, format);
    const filePath = path.join(exportService.exportDir, `${filename}.${format}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Export file not found. Please generate a new export.'
      });
    }
    
    // Set appropriate headers
    const headers = {
      csv: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`
      },
      excel: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`
      },
      pdf: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`
      },
      json: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`
      }
    };
    
    const fileHeaders = headers[format];
    Object.entries(fileHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Stream file to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up file after download (optional)
    fileStream.on('end', () => {
      // Optionally delete file after successful download
      // fs.unlinkSync(filePath);
    });
    
  } catch (error) {
    console.error('File download error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (error.message === 'Access denied - not event owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

/**
 * @route GET /api/organizer/analytics/export-status/:jobId
 * @desc Get export job status
 * @access Private (Organizer/Admin)
 */
router.get('/export-status/:jobId', verifyToken, requireRole(['organizer', 'admin']), [
  param('jobId').isString().withMessage('Invalid job ID')
], async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;
    
    const { jobId } = req.params;
    
    // For now, return mock status - implement actual job tracking later
    res.json({
      success: true,
      data: {
        jobId,
        status: 'completed',
        progress: 100,
        downloadUrl: `/api/organizer/analytics/download/${jobId.split('_')[1]}/${jobId.split('_')[2]}`,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Export status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export status'
    });
  }
});

module.exports = router;
