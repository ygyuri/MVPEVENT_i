const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/me', verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
