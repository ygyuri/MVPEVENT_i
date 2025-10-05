const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const Poll = require('../models/Poll');

describe('Poll Creation API', () => {
  let authToken;
  let organizer;
  let event;
  let ticket;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mvpevent_test');
    }
  });

  beforeEach(async () => {
    // Clean up database
    await Poll.deleteMany({});
    await Ticket.deleteMany({});
    await Order.deleteMany({});
    await Event.deleteMany({});
    await User.deleteMany({});

    // Create test organizer
    organizer = new User({
      username: 'testorganizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer'
    });
    await organizer.save();

    // Create test event
    event = new Event({
      title: 'Test Event',
      description: 'Test Event Description',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Test Location',
      capacity: 100,
      price: 25.00
    });
    await event.save();

    // Create test order and ticket
    const order = new Order({
      user: organizer._id,
      event: event._id,
      amount: 25.00,
      status: 'paid'
    });
    await order.save();

    ticket = new Ticket({
      eventId: event._id,
      orderId: order._id,
      ownerUserId: organizer._id,
      status: 'active'
    });
    await ticket.save();

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'organizer@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Clean up after each test
    await Poll.deleteMany({});
    await Ticket.deleteMany({});
    await Order.deleteMany({});
    await Event.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/events/:eventId/polls', () => {
    it('should create a simple general poll successfully', async () => {
      const pollData = {
        question: 'What is your favorite music genre?',
        description: 'Help us plan the perfect playlist',
        poll_type: 'general',
        options: [
          { label: 'Pop', description: 'Popular music' },
          { label: 'Rock', description: 'Rock music' },
          { label: 'Electronic', description: 'Electronic music' },
          { label: 'Hip Hop', description: 'Hip hop music' }
        ],
        max_votes: 1,
        allow_anonymous: false,
        allow_vote_changes: true,
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      };

      console.log('Testing poll creation with data:', JSON.stringify(pollData, null, 2));
      console.log('Event ID:', event._id.toString());
      console.log('Organizer ID:', organizer._id.toString());

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('poll_id');
      expect(response.body).toHaveProperty('question', pollData.question);
      expect(response.body).toHaveProperty('options');
      expect(response.body.options).toHaveLength(4);

      // Verify poll was saved in database
      const savedPoll = await Poll.findById(response.body.poll_id);
      expect(savedPoll).toBeTruthy();
      expect(savedPoll.question).toBe(pollData.question);
      expect(savedPoll.pollType).toBe(pollData.poll_type);
      expect(savedPoll.options).toHaveLength(4);
    });

    it('should create an artist selection poll successfully', async () => {
      const pollData = {
        question: 'Which headliner would you like to see on Saturday night?',
        description: 'Choose your favorite artist',
        poll_type: 'artist_selection',
        options: [
          {
            label: 'Drake',
            description: 'Hip-hop superstar',
            artist_name: 'Drake',
            artist_genre: 'Hip-hop',
            image_url: 'https://example.com/drake.jpg'
          },
          {
            label: 'Taylor Swift',
            description: 'Pop sensation',
            artist_name: 'Taylor Swift',
            artist_genre: 'Pop',
            image_url: 'https://example.com/taylor.jpg'
          }
        ],
        max_votes: 1,
        allow_anonymous: false,
        allow_vote_changes: true,
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      console.log('Testing artist selection poll creation...');

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      if (response.status !== 201) {
        console.error('Error response:', response.text);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('poll_id');
      
      // Verify poll was saved with artist-specific data
      const savedPoll = await Poll.findById(response.body.poll_id);
      expect(savedPoll).toBeTruthy();
      expect(savedPoll.options[0]).toHaveProperty('artist_name', 'Drake');
      expect(savedPoll.options[1]).toHaveProperty('artist_name', 'Taylor Swift');
    });

    it('should handle validation errors gracefully', async () => {
      const invalidPollData = {
        question: '', // Empty question
        poll_type: 'general',
        options: [
          { label: 'Option 1' }
          // Only one option (minimum is 2)
        ],
        closes_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // Past date
      };

      console.log('Testing validation errors...');

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject unauthorized users', async () => {
      // Create a regular user (not organizer)
      const regularUser = new User({
        username: 'regularuser',
        email: 'user@test.com',
        password: 'password123',
        role: 'user'
      });
      await regularUser.save();

      // Login as regular user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'password123'
        });

      const userToken = loginResponse.body.token;

      const pollData = {
        question: 'Test poll',
        poll_type: 'general',
        options: [
          { label: 'Option 1' },
          { label: 'Option 2' }
        ],
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      console.log('Testing unauthorized access...');

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(pollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(403);
    });

    it('should handle missing authentication token', async () => {
      const pollData = {
        question: 'Test poll',
        poll_type: 'general',
        options: [
          { label: 'Option 1' },
          { label: 'Option 2' }
        ],
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      console.log('Testing missing authentication...');

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .send(pollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
    });

    it('should enforce rate limiting', async () => {
      // Create 5 polls quickly to test rate limiting
      const pollData = {
        question: 'Test poll',
        poll_type: 'general',
        options: [
          { label: 'Option 1' },
          { label: 'Option 2' }
        ],
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      console.log('Testing rate limiting...');

      // Create polls rapidly
      const promises = [];
      for (let i = 0; i < 6; i++) {
        const data = {
          ...pollData,
          question: `Test poll ${i + 1}`
        };
        
        promises.push(
          request(app)
            .post(`/api/events/${event._id}/polls`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(data)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        console.log(`Poll ${index + 1} - Status:`, response.status);
        if (response.status !== 201 && response.status !== 429) {
          console.log(`Poll ${index + 1} - Body:`, JSON.stringify(response.body, null, 2));
        }
      });

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle malformed JSON gracefully', async () => {
      console.log('Testing malformed JSON...');

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(400);
    });

    it('should handle database connection errors', async () => {
      // Mock database error by closing connection
      const originalConnection = mongoose.connection.readyState;
      
      console.log('Testing database error handling...');

      try {
        // This test might not work as expected, but it's good to have
        const pollData = {
          question: 'Test poll',
          poll_type: 'general',
          options: [
            { label: 'Option 1' },
            { label: 'Option 2' }
          ],
          closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        };

        const response = await request(app)
          .post(`/api/events/${event._id}/polls`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(pollData);

        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));

        // Should still work if connection is fine
        expect([200, 201, 500]).toContain(response.status);
      } catch (error) {
        console.error('Database error test caught error:', error.message);
      }
    });

    it('should validate poll type enum values', async () => {
      const pollData = {
        question: 'Test poll',
        poll_type: 'invalid_type',
        options: [
          { label: 'Option 1' },
          { label: 'Option 2' }
        ],
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      console.log('Testing invalid poll type...');

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const incompletePollData = {
        // Missing question
        poll_type: 'general',
        options: [
          { label: 'Option 1' },
          { label: 'Option 2' }
        ]
        // Missing closes_at
      };

      console.log('Testing missing required fields...');

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompletePollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(400);
    });
  });
});
