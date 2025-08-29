const express = require('express');
const router = express.Router();

// Simple test endpoint
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'No database pool available' });
    }
    
    const result = await pool.query('SELECT COUNT(*) FROM events');
    res.json({ 
      success: true, 
      count: result.rows[0].count,
      message: 'Database connection working!'
    });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

module.exports = router;






