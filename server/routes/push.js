const express = require('express');
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const DeviceToken = require('../models/DeviceToken');
const WebPushSubscription = require('../models/WebPushSubscription');

const router = express.Router();

// Test route to verify push router is working
router.get('/', (req, res) => {
  res.json({ message: 'Push notification routes are working' });
});

const handle = (req, res) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
};

router.post('/register-device', verifyToken, [
  body('platform').isIn(['ios','android','web']),
  body('token').isString().isLength({ min: 10 })
], async (req, res) => {
  if (handle(req, res)) return;
  const { platform, token } = req.body;
  await DeviceToken.updateOne({ token }, { $set: { userId: req.user._id, platform, lastSeenAt: new Date() } }, { upsert: true });
  res.json({ success: true });
});

router.post('/register-webpush', verifyToken, [
  body('subscription').isObject()
], async (req, res) => {
  if (handle(req, res)) return;
  await WebPushSubscription.create({ userId: req.user._id, subscription: req.body.subscription, lastSeenAt: new Date() });
  res.json({ success: true });
});

module.exports = router;


