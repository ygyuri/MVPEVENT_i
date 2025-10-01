const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Debug endpoint to test authentication
router.post('/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('=== DEBUG LOGIN ATTEMPT ===');
    console.log('Email received:', email);
    console.log('Password received:', password);
    console.log('Body:', req.body);
    
    // Find user
    const user = await User.findOne({ email });
    console.log('User found:', !!user);
    
    if (!user) {
      return res.json({
        success: false,
        error: 'User not found',
        email: email
      });
    }
    
    console.log('User email in DB:', user.email);
    console.log('User isActive:', user.isActive);
    console.log('Has passwordHash:', !!user.passwordHash);
    
    // Test password
    const isValid = await user.verifyPassword(password);
    console.log('Password valid:', isValid);
    
    return res.json({
      success: isValid,
      user: {
        email: user.email,
        isActive: user.isActive,
        hasPassword: !!user.passwordHash
      },
      passwordValid: isValid
    });
    
  } catch (error) {
    console.error('Debug login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all users (for debugging)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('email username role isActive');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

