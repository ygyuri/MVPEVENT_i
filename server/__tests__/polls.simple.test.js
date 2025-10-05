const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const Event = require('../models/Event');
const User = require('../models/User');

// Simple test without server startup to avoid Redis issues
describe('Poll Creation - Core Logic', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mvpevent_test');
    }
  });

  beforeEach(async () => {
    // Clean up database
    await Poll.deleteMany({});
    await Event.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a poll with valid data', async () => {
    // Create test user
    const organizer = new User({
      username: 'testorganizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer'
    });
    await organizer.save();

    // Create test event
    const event = new Event({
      title: 'Test Event',
      description: 'Test Event Description',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Test Location',
      capacity: 100,
      price: 25.00
    });
    await event.save();

    // Test poll data
    const pollData = {
      event: event._id,
      organizer: organizer._id,
      question: 'What is your favorite music genre?',
      description: 'Help us plan the perfect playlist',
      options: [
        {
          id: 'opt_1',
          label: 'Pop',
          description: 'Popular music'
        },
        {
          id: 'opt_2',
          label: 'Rock',
          description: 'Rock music'
        },
        {
          id: 'opt_3',
          label: 'Electronic',
          description: 'Electronic music'
        }
      ],
      pollType: 'general',
      maxVotes: 1,
      allowAnonymous: false,
      allow_vote_changes: true,
      closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    };

    console.log('Creating poll with data:', JSON.stringify(pollData, null, 2));

    try {
      const poll = new Poll(pollData);
      const savedPoll = await poll.save();

      console.log('Poll created successfully:', savedPoll._id);
      console.log('Poll data:', JSON.stringify(savedPoll.toJSON(), null, 2));

      expect(savedPoll).toBeTruthy();
      expect(savedPoll.question).toBe(pollData.question);
      expect(savedPoll.pollType).toBe(pollData.pollType);
      expect(savedPoll.options).toHaveLength(3);
      expect(savedPoll.status).toBe('draft');

      // Test Phase 2 format conversion
      const phase2Format = {
        poll_id: savedPoll._id.toString(),
        event_id: savedPoll.event.toString(),
        organizer_id: savedPoll.organizer.toString(),
        question: savedPoll.question,
        description: savedPoll.description,
        poll_type: savedPoll.pollType,
        options_json: savedPoll.options,
        allow_anonymous: savedPoll.allowAnonymous,
        max_votes: savedPoll.maxVotes,
        allow_vote_changes: savedPoll.allow_vote_changes,
        closes_at: savedPoll.closesAt,
        status: savedPoll.status,
        created_at: savedPoll.createdAt
      };

      console.log('Phase 2 format:', JSON.stringify(phase2Format, null, 2));

      expect(phase2Format.poll_id).toBeTruthy();
      expect(phase2Format.event_id).toBe(event._id.toString());
      expect(phase2Format.organizer_id).toBe(organizer._id.toString());
      expect(phase2Format.options_json).toHaveLength(3);

    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  });

  it('should validate poll options correctly', async () => {
    // Create test user and event
    const organizer = new User({
      username: 'testorganizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer'
    });
    await organizer.save();

    const event = new Event({
      title: 'Test Event',
      description: 'Test Event Description',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Test Location',
      capacity: 100,
      price: 25.00
    });
    await event.save();

    // Test with too few options
    const pollWithTooFewOptions = new Poll({
      event: event._id,
      organizer: organizer._id,
      question: 'Test question',
      options: [{ id: 'opt_1', label: 'Only one option' }], // Only 1 option, minimum is 2
      pollType: 'general',
      closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    });

    await expect(pollWithTooFewOptions.save()).rejects.toThrow();

    // Test with too many options
    const manyOptions = Array.from({ length: 11 }, (_, i) => ({
      id: `opt_${i + 1}`,
      label: `Option ${i + 1}`
    }));

    const pollWithTooManyOptions = new Poll({
      event: event._id,
      organizer: organizer._id,
      question: 'Test question',
      options: manyOptions, // 11 options, maximum is 10
      pollType: 'general',
      closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    });

    await expect(pollWithTooManyOptions.save()).rejects.toThrow();
  });

  it('should handle artist selection poll type correctly', async () => {
    // Create test user and event
    const organizer = new User({
      username: 'testorganizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer'
    });
    await organizer.save();

    const event = new Event({
      title: 'Test Event',
      description: 'Test Event Description',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Test Location',
      capacity: 100,
      price: 25.00
    });
    await event.save();

    const artistPollData = {
      event: event._id,
      organizer: organizer._id,
      question: 'Which headliner would you like to see?',
      description: 'Choose your favorite artist',
      options: [
        {
          id: 'opt_1',
          label: 'Drake',
          description: 'Hip-hop superstar',
          artist_name: 'Drake',
          artist_genre: 'Hip-hop',
          image_url: 'https://example.com/drake.jpg'
        },
        {
          id: 'opt_2',
          label: 'Taylor Swift',
          description: 'Pop sensation',
          artist_name: 'Taylor Swift',
          artist_genre: 'Pop',
          image_url: 'https://example.com/taylor.jpg'
        }
      ],
      pollType: 'artist_selection',
      maxVotes: 1,
      allowAnonymous: false,
      allow_vote_changes: true,
      closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    };

    console.log('Creating artist selection poll...');

    const poll = new Poll(artistPollData);
    const savedPoll = await poll.save();

    console.log('Artist poll created:', savedPoll._id);

    expect(savedPoll.pollType).toBe('artist_selection');
    expect(savedPoll.options[0].artist_name).toBe('Drake');
    expect(savedPoll.options[1].artist_name).toBe('Taylor Swift');
    expect(savedPoll.options[0].artist_genre).toBe('Hip-hop');
    expect(savedPoll.options[1].artist_genre).toBe('Pop');
  });

  it('should validate poll type enum values', async () => {
    // Create test user and event
    const organizer = new User({
      username: 'testorganizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer'
    });
    await organizer.save();

    const event = new Event({
      title: 'Test Event',
      description: 'Test Event Description',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Test Location',
      capacity: 100,
      price: 25.00
    });
    await event.save();

    // Test invalid poll type
    const invalidPoll = new Poll({
      event: event._id,
      organizer: organizer._id,
      question: 'Test question',
      options: [
        { id: 'opt_1', label: 'Option 1' },
        { id: 'opt_2', label: 'Option 2' }
      ],
      pollType: 'invalid_type', // Invalid enum value
      closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    });

    await expect(invalidPoll.save()).rejects.toThrow();
  });

  it('should validate closesAt date correctly', async () => {
    // Create test user and event
    const organizer = new User({
      username: 'testorganizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer'
    });
    await organizer.save();

    const event = new Event({
      title: 'Test Event',
      description: 'Test Event Description',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Test Location',
      capacity: 100,
      price: 25.00
    });
    await event.save();

    // Test with past closing date for active poll
    const pastDatePoll = new Poll({
      event: event._id,
      organizer: organizer._id,
      question: 'Test question',
      options: [
        { id: 'opt_1', label: 'Option 1' },
        { id: 'opt_2', label: 'Option 2' }
      ],
      pollType: 'general',
      status: 'active', // Active status
      closesAt: new Date(Date.now() - 60 * 60 * 1000) // Past date
    });

    await expect(pastDatePoll.save()).rejects.toThrow();
  });

  it('should auto-generate option IDs when not provided', async () => {
    // Create test user and event
    const organizer = new User({
      username: 'testorganizer',
      email: 'organizer@test.com',
      password: 'password123',
      role: 'organizer'
    });
    await organizer.save();

    const event = new Event({
      title: 'Test Event',
      description: 'Test Event Description',
      organizer: organizer._id,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: 'Test Location',
      capacity: 100,
      price: 25.00
    });
    await event.save();

    const pollData = {
      event: event._id,
      organizer: organizer._id,
      question: 'Test question',
      options: [
        { label: 'Option 1' }, // No ID provided
        { label: 'Option 2' }  // No ID provided
      ],
      pollType: 'general',
      closesAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    };

    const poll = new Poll(pollData);
    const savedPoll = await poll.save();

    console.log('Poll with auto-generated IDs:', JSON.stringify(savedPoll.options, null, 2));

    expect(savedPoll.options[0].id).toBe('opt_1');
    expect(savedPoll.options[1].id).toBe('opt_2');
  });
});
