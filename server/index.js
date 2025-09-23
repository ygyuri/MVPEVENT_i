const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import models (must be imported before routes)
require('./models/User');
require('./models/Event');
require('./models/EventCategory');
require('./models/EventTag');
require('./models/Order');
require('./models/Ticket');
require('./models/EventStaff');
require('./models/ScanLog');

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const orderRoutes = require('./routes/orders');
const testRoutes = require('./routes/test');
const payheroRoutes = require('./routes/payhero');
const ticketRoutes = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 5000;

// Disable ETag in development to avoid 304 Not Modified on API JSON
if (process.env.NODE_ENV !== 'production') {
  app.set('etag', false);
}

// Middleware
app.use(helmet());
// In development, allow all origins to simplify mobile testing on LAN
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
} else {
  // In production, keep a strict allowlist
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}
app.use(express.json());

// Disable browser/proxy caching for API responses in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
    }
    next();
  });
}

// Database connections
const { connectMongoDB, connectRedis } = require('./config/database');

// Connect to databases
const initializeDatabases = async () => {
  await connectMongoDB();
  await connectRedis();
};

initializeDatabases();

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Event-i API is running',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Admin routes (protected)
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Organizer routes (protected)
const organizerRoutes = require('./routes/organizer');
app.use('/api/organizer', organizerRoutes);

// User routes (protected)
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

// Order routes
app.use('/api/orders', orderRoutes);
// PayHero routes
app.use('/api/payhero', payheroRoutes);

// Ticket routes
app.use('/api/tickets', ticketRoutes);

// Test routes
app.use('/api/test', testRoutes);

// Event routes
app.use('/api/events', eventRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
}); 