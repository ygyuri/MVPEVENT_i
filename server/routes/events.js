const express = require('express');
const { query, validationResult, body } = require('express-validator');
const { optionalAuth, verifyToken, requireRole } = require('../middleware/auth');
const Event = require('../models/Event');
const EventCategory = require('../models/EventCategory');
const { cache } = require('../config/database');

const router = express.Router();
const isProd = process.env.NODE_ENV === 'production';

// Test endpoint to debug database connection (must be first)
router.get('/test', async (req, res) => {
  try {
    const count = await Event.countDocuments();
    res.json({ 
      success: true, 
      count,
      message: 'MongoDB connection working!'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Events list with search, filters, and pagination
router.get(
  '/',
  [
    query('q').optional().isString(),
  query('category').optional().isString(),
    query('city').optional().isString(),
    query('state').optional().isString(),
    query('country').optional().isString(),
  query('location').optional().isString(),
    query('priceMin').optional().isFloat({ min: 0 }),
    query('priceMax').optional().isFloat({ min: 0 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('isFree').optional().isBoolean().toBoolean(),
    query('isFeatured').optional().isBoolean().toBoolean(),
    query('isTrending').optional().isBoolean().toBoolean(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('sort').optional().isIn(['soonest', 'newest', 'price_asc', 'price_desc'])
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid query params', details: errors.array() });
    }

    const {
        q,
      category,
        city,
        state,
        country,
      location,
        priceMin,
        priceMax,
        startDate,
        endDate,
        isFree,
        isFeatured,
        isTrending,
        page = 1,
        pageSize = 12,
        sort = 'soonest'
    } = req.query;

      // Build MongoDB query
      const mongoQuery = { status: 'published' };
      
      if (q) {
        mongoQuery.$text = { $search: q };
      }

      // Resolve category slug to _id if provided
      if (category) {
        const cat = await EventCategory.findOne({ slug: category }).select('_id').lean();
        if (!cat) {
          return res.json({ events: [], meta: { page: Number(page), pageSize: Number(pageSize), total: 0, totalPages: 1, hasMore: false } });
        }
        mongoQuery.category = cat._id;
      }

      if (city) mongoQuery['location.city'] = { $regex: city, $options: 'i' };
      if (state) mongoQuery['location.state'] = { $regex: state, $options: 'i' };
      if (country) mongoQuery['location.country'] = { $regex: country, $options: 'i' };

    if (location) {
        mongoQuery.$or = [
          { 'location.city': { $regex: location, $options: 'i' } },
          { 'location.state': { $regex: location, $options: 'i' } },
          { 'location.country': { $regex: location, $options: 'i' } }
        ];
      }

      // Price filters (avoid broad $or)
      if (typeof isFree === 'boolean') {
        mongoQuery['pricing.isFree'] = isFree;
      }
      const priceRange = {};
      if (priceMin !== undefined) priceRange.$gte = Number(priceMin);
      if (priceMax !== undefined) priceRange.$lte = Number(priceMax);
      if (Object.keys(priceRange).length) {
        mongoQuery['pricing.isFree'] = false;
        mongoQuery['pricing.price'] = priceRange;
      }

      if (startDate) mongoQuery['dates.startDate'] = { $gte: new Date(startDate) };
      if (endDate) mongoQuery['dates.endDate'] = { $lte: new Date(endDate) };
      if (typeof isFeatured === 'boolean') mongoQuery['flags.isFeatured'] = isFeatured;
      if (typeof isTrending === 'boolean') mongoQuery['flags.isTrending'] = isTrending;

      // Build sort object
      let sortObj = {};
      if (sort === 'soonest') sortObj = { 'dates.startDate': 1, 'flags.isFeatured': -1 };
      if (sort === 'newest') sortObj = { createdAt: -1 };
      if (sort === 'price_asc') sortObj = { 'pricing.price': 1, 'dates.startDate': 1 };
      if (sort === 'price_desc') sortObj = { 'pricing.price': -1, 'dates.startDate': 1 };

      // Cache for anonymous queries (short TTL) — only in production
      const isAnon = !req.user?.id;
      const cacheKey = isAnon && isProd
        ? `events:list:v2:${Buffer.from(JSON.stringify({ q, category, city, state, country, location, priceMin, priceMax, startDate, endDate, isFree, isFeatured, isTrending, page, pageSize, sort })).toString('base64')}`
        : null;
      if (cacheKey) {
        const cached = await cache.get(cacheKey);
        if (cached) {
          if (isProd) res.set('Cache-Control', 'public, max-age=60');
          return res.json(cached);
        }
      }

      // Execute query with pagination and projections
      const skip = (Number(page) - 1) * Number(pageSize);
      const projection = {
        title: 1, slug: 1, shortDescription: 1, description: 1,
        'location.venueName': 1, 'location.city': 1, 'location.state': 1,
        'dates.startDate': 1, 'pricing.price': 1, 'pricing.isFree': 1,
        'flags.isFeatured': 1, 'flags.isTrending': 1,
        'media.coverImageUrl': 1, category: 1, organizer: 1
      };
      
      const [events, total] = await Promise.all([
        Event.find(mongoQuery, projection)
          .populate('organizer', 'firstName lastName username')
          .populate('category', 'name slug color')
          .sort(sortObj)
          .skip(skip)
          .limit(Number(pageSize))
          .lean(),
        Event.countDocuments(mongoQuery)
      ]);

      const transformedEvents = events.map(event => ({
        id: event._id,
      title: event.title,
      slug: event.slug,
      description: event.description,
        shortDescription: event.shortDescription,
        venueName: event.location?.venueName,
        city: event.location?.city,
        state: event.location?.state,
        startDate: event.dates?.startDate,
        price: event.pricing?.price,
        isFree: event.pricing?.isFree,
        isFeatured: event.flags?.isFeatured,
        isTrending: event.flags?.isTrending,
        coverImageUrl: event.media?.coverImageUrl,
        category: event.category ? { name: event.category.name, color: event.category.color, slug: event.category.slug } : null,
        organizer: event.organizer ? { name: `${event.organizer.firstName} ${event.organizer.lastName}` } : null
      }));

      const totalPages = Math.ceil(total / Number(pageSize)) || 1;
      const hasMore = Number(page) < totalPages;

      const payload = {
        events: transformedEvents,
        meta: { page: Number(page), pageSize: Number(pageSize), total, totalPages, hasMore }
      };

      if (cacheKey) {
        await cache.set(cacheKey, payload, 60);
        if (isProd) res.set('Cache-Control', 'public, max-age=60');
      }

      res.json(payload);

  } catch (error) {
    console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events', details: error.message });
    }
  }
);

// Get featured events
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const cacheKey = isProd ? `featured:${userId || 'anon'}` : null;
    
    if (!userId && cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) return res.json({ events: cached });
    }
    
    const events = await Event.find({ 
      status: 'published', 
      'flags.isFeatured': true 
    })
    .populate('organizer', 'firstName lastName username')
    .populate('category', 'name slug color icon')
    .sort({ 'dates.startDate': 1 })
    .limit(6)
    .lean();

    const transformedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      slug: event.slug,
      shortDescription: event.shortDescription,
      venueName: event.location?.venueName,
      city: event.location?.city,
      state: event.location?.state,
      startDate: event.dates?.startDate,
      price: event.pricing?.price,
      isFree: event.pricing?.isFree,
      coverImageUrl: event.media?.coverImageUrl,
      category: event.category ? {
        name: event.category.name,
        slug: event.category.slug,
        color: event.category.color,
        icon: event.category.icon
      } : null,
      organizer: event.organizer ? {
        name: `${event.organizer.firstName} ${event.organizer.lastName}`
      } : null
    }));

    if (!userId && cacheKey) await cache.set(cacheKey, transformedEvents, 60); // 1 minute cache
    if (isProd) res.set('Cache-Control', 'public, max-age=60');
    res.json({ events: transformedEvents });

  } catch (error) {
    console.error('Get featured events error:', error);
    res.status(500).json({ error: 'Failed to fetch featured events' });
  }
});

// Get trending events
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const cacheKey = isProd ? `trending:${userId || 'anon'}` : null;
    
    if (!userId && cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) return res.json({ events: cached });
    }
    
    const events = await Event.find({ 
      status: 'published', 
      'flags.isTrending': true 
    })
    .populate('organizer', 'firstName lastName username')
    .populate('category', 'name slug color icon')
    .sort({ 'dates.startDate': 1 })
    .limit(6)
    .lean();

    const transformedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      slug: event.slug,
      shortDescription: event.shortDescription,
      venueName: event.location?.venueName,
      city: event.location?.city,
      state: event.location?.state,
      startDate: event.dates?.startDate,
      price: event.pricing?.price,
      isFree: event.pricing?.isFree,
      coverImageUrl: event.media?.coverImageUrl,
      category: event.category ? {
        name: event.category.name,
        slug: event.category.slug,
        color: event.category.color,
        icon: event.category.icon
      } : null,
      organizer: event.organizer ? {
        name: `${event.organizer.firstName} ${event.organizer.lastName}`
      } : null
    }));

    if (!userId && cacheKey) await cache.set(cacheKey, transformedEvents, 60); // 1 minute cache
    if (isProd) res.set('Cache-Control', 'public, max-age=60');
    res.json({ events: transformedEvents });

  } catch (error) {
    console.error('Get trending events error:', error);
    res.status(500).json({ error: 'Failed to fetch trending events' });
  }
});

// Personalized suggestions (simple heuristic by user's favorite categories)
router.get('/suggested', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // Fallback to trending if unauthenticated (no explicit cache headers in dev)
      const cached = isProd ? await cache.get(`trending:${userId || 'anon'}`) : null;
      if (cached) return res.json({ events: cached });
    }

    const events = await Event.find({ 
      status: 'published' 
    })
    .populate('organizer', 'firstName lastName username')
    .populate('category', 'name slug color icon')
    .sort({ 'flags.isTrending': -1, 'flags.isFeatured': -1, 'dates.startDate': 1 })
    .limit(6)
    .lean();

    const transformedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      slug: event.slug,
      shortDescription: event.shortDescription,
      venueName: event.location?.venueName,
      city: event.location?.city,
      state: event.location?.state,
      startDate: event.dates?.startDate,
      price: event.pricing?.price,
      isFree: event.pricing?.isFree,
      coverImageUrl: event.media?.coverImageUrl,
      category: event.category ? { name: event.category.name, slug: event.category.slug, color: event.category.color, icon: event.category.icon } : null,
      organizer: event.organizer ? { name: `${event.organizer.firstName} ${event.organizer.lastName}` } : null
    }));

    res.json({ events: transformedEvents });
  } catch (error) {
    console.error('Get suggested events error:', error);
    res.status(500).json({ error: 'Failed to fetch suggested events' });
  }
});

// Get event categories (aggregate + cache)
router.get('/categories', async (req, res) => {
  try {
    const cacheKey = isProd ? 'categories:withCounts:v1' : null;
    if (cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=300');
        return res.json({ categories: cached });
      }
    }

    const categories = await EventCategory.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    const counts = await Event.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const idToCount = new Map(counts.map(c => [String(c._id), c.count]));
    const categoriesWithCounts = categories.map(c => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      color: c.color,
      eventCount: idToCount.get(String(c._id)) || 0
    }));

    if (cacheKey) await cache.set(cacheKey, categoriesWithCounts, 300);
    if (isProd) res.set('Cache-Control', 'public, max-age=300');
    res.json({ categories: categoriesWithCounts });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ===== IMPORTANT: All routes with /:slug/* MUST be defined before the generic /:slug route =====

// Direct checkout endpoint with affiliate tracking
router.get('/:slug/checkout', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { ref } = req.query; // Referral code from query param
    
    // Fetch event with ticket types
    const event = await Event.findOne({ slug, status: 'published' })
      .populate('organizer', 'firstName lastName username avatarUrl')
      .populate('category', 'name slug color icon')
      .select('-__v')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Build response object
    const response = {
      event: {
        id: event._id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        shortDescription: event.shortDescription,
        location: {
          venueName: event.location?.venueName,
          address: event.location?.address,
          city: event.location?.city,
          state: event.location?.state,
          country: event.location?.country
        },
        dates: {
          startDate: event.dates?.startDate,
          endDate: event.dates?.endDate
        },
        capacity: event.capacity,
        currentAttendees: event.currentAttendees,
        pricing: event.pricing,
        coverImageUrl: event.media?.coverImageUrl,
        ticketTypes: event.ticketTypes || [],
        category: event.category ? {
          name: event.category.name,
          slug: event.category.slug,
          color: event.category.color,
          icon: event.category.icon
        } : null,
        organizer: event.organizer ? {
          name: `${event.organizer.firstName} ${event.organizer.lastName}`,
          username: event.organizer.username,
          avatarUrl: event.organizer.avatarUrl
        } : null
      },
      affiliateTracked: false,
      referralCode: null
    };

    // Handle affiliate tracking if referral code present
    if (ref) {
      const ReferralLink = require('../models/ReferralLink');
      const ReferralClick = require('../models/ReferralClick');

      // Validate referral code
      const referralLink = await ReferralLink.findOne({
        referral_code: ref.toUpperCase(),
        event_id: event._id,
        deleted_at: null
      }).lean();

      if (referralLink) {
        // Check if link is active and not expired
        const now = new Date();
        const isActive = referralLink.status === 'active';
        const isNotExpired = !referralLink.expires_at || referralLink.expires_at > now;
        const hasUsesLeft = !referralLink.max_uses || referralLink.current_uses < referralLink.max_uses;

        if (isActive && isNotExpired && hasUsesLeft) {
          // Log the click
          try {
            // Generate visitor ID from IP + User Agent
            const visitorId = require('crypto')
              .createHash('md5')
              .update(`${req.ip}-${req.get('user-agent') || 'unknown'}-${Date.now()}`)
              .digest('hex')
              .substring(0, 32);

            // Extract device info from user agent (simple parsing)
            const userAgent = req.get('user-agent') || '';
            let deviceType = 'desktop';
            if (/mobile/i.test(userAgent)) deviceType = 'mobile';
            else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';

            await ReferralClick.create({
              link_id: referralLink._id,
              event_id: event._id,
              affiliate_id: referralLink.affiliate_id,
              agency_id: referralLink.agency_id,
              visitor_id: visitorId,
              user_id: req.user?.id || null,
              ip_address: req.ip,
              user_agent: userAgent,
              referrer_url: req.get('referer') || null,
              landing_page_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
              device_type: deviceType,
              clicked_at: new Date()
            });

            // Increment current_uses count
            await ReferralLink.updateOne(
              { _id: referralLink._id },
              { $inc: { current_uses: 1 } }
            );

            // Update response to indicate successful tracking
            response.affiliateTracked = true;
            response.referralCode = referralLink.referral_code;

          } catch (clickError) {
            console.error('Error logging referral click:', clickError);
            // Don't fail the request if click logging fails
          }
        }
      }
    }

    // Don't cache this endpoint since it has dynamic affiliate tracking
    res.json(response);

  } catch (error) {
    console.error('Get checkout event error:', error);
    res.status(500).json({ error: 'Failed to fetch event for checkout' });
  }
});

// Get tickets for an event
router.get('/:slug/tickets', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const event = await Event.findOne({ slug, status: 'published' })
      .select('ticketTypes pricing')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Generate sample ticket types if none exist (for MVP)
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

    res.json({ ticketTypes });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Purchase tickets for an event
router.post('/:slug/purchase', async (req, res) => {
  try {
    const { slug } = req.params;
    const { userId, ticketTypeName, quantity } = req.body;

    if (!userId || !ticketTypeName || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const event = await Event.findOne({ slug, status: 'published' });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // For MVP, create a simple order record
    const order = {
      id: Date.now().toString(),
      eventId: event._id,
      eventSlug: event.slug,
      eventTitle: event.title,
      userId,
      ticketTypeName,
      quantity: parseInt(quantity),
      totalAmount: 0, // Would calculate based on ticket type
      status: 'confirmed',
      createdAt: new Date()
    };

    // In a real app, you'd:
    // 1. Validate ticket availability
    // 2. Process payment
    // 3. Update inventory
    // 4. Send confirmation email
    // 5. Generate QR codes

    res.json({ 
      success: true, 
      message: 'Tickets purchased successfully!',
      order 
    });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// Get event by slug (cache)
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = isProd ? `event:slug:${slug}` : null;
    if (cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=120');
        return res.json({ event: cached });
      }
    }

    const event = await Event.findOne({ slug, status: 'published' })
      .populate('organizer', 'firstName lastName username avatarUrl')
      .populate('category', 'name slug color icon')
      .populate('tags', 'name')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const transformedEvent = {
      id: event._id,
        title: event.title,
        slug: event.slug,
        description: event.description,
      shortDescription: event.shortDescription,
      venueName: event.location?.venueName,
      address: event.location?.address,
      city: event.location?.city,
      state: event.location?.state,
      country: event.location?.country,
      startDate: event.dates?.startDate,
      endDate: event.dates?.endDate,
        capacity: event.capacity,
      currentAttendees: event.currentAttendees,
      price: event.pricing?.price,
      isFree: event.pricing?.isFree,
      isFeatured: event.flags?.isFeatured,
      isTrending: event.flags?.isTrending,
      coverImageUrl: event.media?.coverImageUrl,
      galleryUrls: event.media?.galleryUrls || [],
      category: event.category ? { name: event.category.name, slug: event.category.slug, color: event.category.color, icon: event.category.icon } : null,
      organizer: event.organizer ? { name: `${event.organizer.firstName} ${event.organizer.lastName}`, username: event.organizer.username, avatarUrl: event.organizer.avatarUrl } : null,
      tags: event.tags?.map(tag => tag.name) || [],
      createdAt: event.createdAt
    };

    if (cacheKey) await cache.set(cacheKey, transformedEvent, 120);
    if (isProd) res.set('Cache-Control', 'public, max-age=120');
    res.json({ event: transformedEvent });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Organizer/admin: update per-event QR settings
router.post('/settings/:eventId/qr', verifyToken, requireRole(['organizer', 'admin']), [
  body('ttlMs').optional().isInt({ min: 10000 }).toInt(),
  body('autoRotateMs').optional().isInt({ min: 0 }).toInt(),
], async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select('organizer qrSettings');
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    const isOrganizer = String(event.organizer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOrganizer && !isAdmin) return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });

    event.qrSettings = event.qrSettings || {};
    if (req.body.ttlMs !== undefined) event.qrSettings.ttlMs = req.body.ttlMs;
    if (req.body.autoRotateMs !== undefined) event.qrSettings.autoRotateMs = req.body.autoRotateMs;
    await event.save();
    res.json({ success: true, data: { qrSettings: event.qrSettings } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update QR settings' });
  }
});

module.exports = router;