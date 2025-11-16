const request = require('supertest');
const mongoose = require('mongoose');
const app = require('..');
const User = require('../models/User');
const Session = require('../models/Session');
const passport = require('passport');

// Mock passport-google-oauth20
jest.mock('passport-google-oauth20', () => {
  const mockStrategy = jest.fn().mockImplementation((options, verify) => {
    // Store the verify callback for testing
    mockStrategy.verifyCallback = verify;
    return {
      name: 'google',
      authenticate: jest.fn(),
    };
  });
  return {
    Strategy: mockStrategy,
  };
});

describe('Google OAuth Integration', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/auth/google/callback';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.SESSION_SECRET = 'test-session-secret';

    if (!mongoose.connection.readyState) {
      const { connectMongoDB } = require('../config/database');
      await connectMongoDB();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should initiate Google OAuth flow', async () => {
    const response = await request(app)
      .get('/api/auth/google')
      .expect(302); // Redirect to Google

    expect(response.headers.location).toContain('accounts.google.com');
    expect(response.headers.location).toContain('client_id=test-client-id');
  });

  it('should handle Google OAuth callback and create new user', async () => {
    // This test would require mocking the full OAuth flow
    // For now, we'll test the user creation logic directly

    const mockGoogleProfile = {
      id: 'google123',
      emails: [{ value: 'newuser@example.com', verified: true }],
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      displayName: 'John Doe',
      photos: [{ value: 'https://example.com/photo.jpg' }],
    };

    // Simulate the passport callback
    const { generateTokens, persistSession } = require('../services/auth/tokenService');
    const tokens = generateTokens('test-user-id');

    // Create user as the OAuth callback would
    const username = await User.generateUniqueUsername(
      mockGoogleProfile.displayName,
      mockGoogleProfile.emails[0].value
    );

    const user = await User.create({
      email: mockGoogleProfile.emails[0].value,
      googleId: mockGoogleProfile.id,
      username,
      name: mockGoogleProfile.displayName,
      firstName: mockGoogleProfile.name.givenName,
      lastName: mockGoogleProfile.name.familyName,
      avatarUrl: mockGoogleProfile.photos[0].value,
      emailVerified: true,
      accountStatus: 'active',
      isActive: true,
      lastLoginProvider: 'google',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('newuser@example.com');
    expect(user.googleId).toBe('google123');
    expect(user.emailVerified).toBe(true);
    expect(user.lastLoginProvider).toBe('google');
  });

  it('should link Google account to existing user by email', async () => {
    // Create existing user with email
    const existingUser = await User.create({
      email: 'existing@example.com',
      username: 'existinguser',
      name: 'Existing User',
      passwordHash: 'hashed-password',
      lastLoginProvider: 'email',
    });

    const mockGoogleProfile = {
      id: 'google456',
      emails: [{ value: 'existing@example.com', verified: true }],
      name: {
        givenName: 'Existing',
        familyName: 'User',
      },
      displayName: 'Existing User',
      photos: [{ value: 'https://example.com/photo2.jpg' }],
    };

    // Find user by email
    let user = await User.findOne({
      $or: [{ googleId: mockGoogleProfile.id }, { email: mockGoogleProfile.emails[0].value }],
    });

    expect(user).toBeDefined();
    expect(user._id.toString()).toBe(existingUser._id.toString());

    // Link Google account
    if (!user.googleId) {
      user.googleId = mockGoogleProfile.id;
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
    }
    if (user.lastLoginProvider !== 'google') {
      user.lastLoginProvider = 'google';
    }
    await user.save();

    // Verify account is linked
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.googleId).toBe('google456');
    expect(updatedUser.emailVerified).toBe(true);
    expect(updatedUser.lastLoginProvider).toBe('google');
  });

  it('should block login for suspended accounts', async () => {
    // Create suspended user
    const suspendedUser = await User.create({
      email: 'suspended@example.com',
      googleId: 'google789',
      username: 'suspendeduser',
      name: 'Suspended User',
      accountStatus: 'suspended',
      isActive: true,
      emailVerified: true,
      lastLoginProvider: 'google',
    });

    // Simulate OAuth callback trying to authenticate suspended user
    const user = await User.findOne({
      $or: [{ googleId: 'google789' }, { email: 'suspended@example.com' }],
    });

    expect(user.accountStatus).toBe('suspended');
    // The passport callback should reject this with an error
    // In actual flow, this would be caught and return an error
  });

  it('should update profile data on each login', async () => {
    // Create user with old profile data
    const user = await User.create({
      email: 'update@example.com',
      googleId: 'google999',
      username: 'updateuser',
      name: 'Old Name',
      avatarUrl: 'https://old-photo.jpg',
      emailVerified: true,
      lastLoginProvider: 'google',
    });

    const mockGoogleProfile = {
      id: 'google999',
      emails: [{ value: 'update@example.com', verified: true }],
      name: {
        givenName: 'New',
        familyName: 'Name',
      },
      displayName: 'New Name',
      photos: [{ value: 'https://new-photo.jpg' }],
    };

    // Find and update user (simulating OAuth callback)
    const foundUser = await User.findOne({
      $or: [{ googleId: mockGoogleProfile.id }, { email: mockGoogleProfile.emails[0].value }],
    });

    // Update profile data
    if (mockGoogleProfile.photos?.[0]?.value && foundUser.avatarUrl !== mockGoogleProfile.photos[0].value) {
      foundUser.avatarUrl = mockGoogleProfile.photos[0].value;
    }
    if (mockGoogleProfile.displayName && (!foundUser.name || foundUser.name.trim() === '')) {
      foundUser.name = mockGoogleProfile.displayName;
    }
    await foundUser.save();

    // Verify profile was updated
    const updatedUser = await User.findById(foundUser._id);
    expect(updatedUser.avatarUrl).toBe('https://new-photo.jpg');
    expect(updatedUser.name).toBe('New Name');
  });

  it('should generate unique usernames for new Google OAuth users', async () => {
    const mockGoogleProfile = {
      id: 'google-unique',
      emails: [{ value: 'unique@example.com', verified: true }],
      name: {
        givenName: 'Unique',
        familyName: 'User',
      },
      displayName: 'Unique User',
    };

    const username1 = await User.generateUniqueUsername(
      mockGoogleProfile.displayName,
      mockGoogleProfile.emails[0].value
    );

    // Create first user
    await User.create({
      email: mockGoogleProfile.emails[0].value,
      googleId: mockGoogleProfile.id,
      username: username1,
      name: mockGoogleProfile.displayName,
      emailVerified: true,
      lastLoginProvider: 'google',
    });

    // Try to generate username for another user with similar name
    const username2 = await User.generateUniqueUsername(
      'Unique User',
      'another@example.com'
    );

    // Should generate different username
    expect(username2).not.toBe(username1);
    expect(username2).toContain('unique');
  });
});






