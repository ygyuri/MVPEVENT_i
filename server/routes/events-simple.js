const express = require('express');
const router = express.Router();

// Simple working events endpoint
router.get('/', async (req, res) => {
  try {
    // Get pool from app.locals
    const pool = req.app.locals.pool;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database pool not available' });
    }

    const result = await pool.query(`
      SELECT 
        e.id,
        e.title,
        e.slug,
        e.description,
        e.venue_name,
        e.city,
        e.state,
        e.start_date,
        e.price,
        e.is_free,
        e.is_featured,
        e.cover_image_url,
        ec.name as category_name,
        ec.color as category_color
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      WHERE e.status = 'published'
      ORDER BY e.is_featured DESC, e.start_date ASC
      LIMIT 10
    `);

    const events = result.rows.map(event => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      venueName: event.venue_name,
      city: event.city,
      state: event.state,
      startDate: event.start_date,
      price: event.price,
      isFree: event.is_free,
      isFeatured: event.is_featured,
      coverImageUrl: event.cover_image_url,
      category: {
        name: event.category_name,
        color: event.category_color
      }
    }));

    res.json({ 
      success: true,
      events, 
      count: events.length,
      message: 'Events fetched successfully!'
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    res.json({ 
      success: true,
      message: 'Events route is working!',
      pool: pool ? 'Available' : 'Not available'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;






