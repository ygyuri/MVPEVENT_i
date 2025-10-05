const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const Poll = require('../models/Poll');

describe('Simple Polls API (No Redis)', () => {
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
      firstName: 'Test',
      lastName: 'Organizer',
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
      customer: {
        userId: organizer._id,
        email: organizer.email,
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        phone: '+1234567890'
      },
      items: [{
        eventId: event._id,
        eventTitle: event.title,
        ticketType: 'General',
        quantity: 1,
        unitPrice: 25.00,
        subtotal: 25.00
      }],
      pricing: {
        subtotal: 25.00,
        serviceFee: 2.50,
        total: 27.50
      },
      status: 'completed',
      paymentMethod: 'test'
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
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      console.log('Testing simple poll creation with data:', JSON.stringify(pollData, null, 2));

      const response = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pollData);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
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
            artist_genre: 'Hip-hop'
          },
          {
            label: 'Taylor Swift',
            description: 'Pop sensation',
            artist_name: 'Taylor Swift',
            artist_genre: 'Pop'
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

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
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
      expect(response.body).toHaveProperty('success', false);
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
        max_votes: 1,
        allow_anonymous: false,
        allow_vote_changes: true,
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
      expect(response.body).toHaveProperty('success', false);
    });

    it('should enforce maximum active polls limit', async () => {
      const pollData = {
        question: 'Test poll',
        poll_type: 'general',
        options: [
          { label: 'Option 1' },
          { label: 'Option 2' }
        ],
        max_votes: 1,
        allow_anonymous: false,
        allow_vote_changes: true,
        closes_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      console.log('Testing maximum polls limit...');

      // Create 5 polls (the limit)
      const promises = [];
      for (let i = 0; i < 5; i++) {
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
      
      // All 5 should succeed
      responses.forEach((response, index) => {
        console.log(`Poll ${index + 1} - Status:`, response.status);
        expect(response.status).toBe(201);
      });

      // Try to create a 6th poll - should fail
      const sixthPollResponse = await request(app)
        .post(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...pollData,
          question: 'Test poll 6'
        });

      console.log('6th poll response:', sixthPollResponse.status);
      expect(sixthPollResponse.status).toBe(400);
      expect(sixthPollResponse.body).toHaveProperty('success', false);
      expect(sixthPollResponse.body.error).toContain('Maximum 5 active polls');
    });
  });

  describe('GET /api/events/:eventId/polls', () => {
    it('should list polls for event successfully', async () => {
      // Create a test poll
      const poll = new Poll({
        event: event._id,
        organizer: organizer._id,
        question: 'Test poll question',
        description: 'Test description',
        options: [
          { id: 'opt_1', label: 'Option 1' },
          { id: 'opt_2', label: 'Option 2' }
        ],
        pollType: 'general',
        maxVotes: 1,
        allowAnonymous: false,
        allow_vote_changes: true,
        closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: 'active'
      });
      await poll.save();

      console.log('Testing poll listing...');

      const response = await request(app)
        .get(`/api/events/${event._id}/polls`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('polls');
      expect(response.body.polls).toHaveLength(1);
      expect(response.body.polls[0]).toHaveProperty('poll_id');
      expect(response.body.polls[0]).toHaveProperty('question', 'Test poll question');
    });
  });
});
