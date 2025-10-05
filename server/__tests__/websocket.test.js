/**
 * @jest-environment node
 */

const request = require('supertest');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const io = require('socket.io-client');

describe('WebSocket Connection Test', () => {
  let app;
  let server;
  let clientSocket;

  beforeAll((done) => {
    app = express();
    server = http.createServer(app);
    
    // Initialize Socket.io
    const ioServer = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    ioServer.on('connection', (socket) => {
      console.log('✅ Test Socket.io server: Client connected');
      
      socket.on('join:event', (data) => {
        console.log('✅ Test Socket.io server: Join event received', data);
        socket.join(`event:${data.eventId}`);
        socket.emit('joined:event', { eventId: data.eventId });
      });
    });

    server.listen(0, () => {
      const port = server.address().port;
      process.env.TEST_WS_PORT = port;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    server.close(done);
  });

  test('should connect to Socket.io server', (done) => {
    const port = process.env.TEST_WS_PORT;
    clientSocket = io(`http://localhost:${port}`, {
      transports: ['websocket', 'polling']
    });

    clientSocket.on('connect', () => {
      console.log('✅ Test client: Connected to Socket.io server');
      expect(clientSocket.connected).toBe(true);
      done();
    });

    clientSocket.on('connect_error', (error) => {
      console.error('❌ Test client: Connection error', error);
      done(error);
    });
  });

  test('should join event room via WebSocket', (done) => {
    const port = process.env.TEST_WS_PORT;
    clientSocket = io(`http://localhost:${port}`, {
      transports: ['websocket', 'polling']
    });

    clientSocket.on('connect', () => {
      const eventId = 'test-event-123';
      clientSocket.emit('join:event', { eventId });
    });

    clientSocket.on('joined:event', (data) => {
      console.log('✅ Test client: Joined event room', data);
      expect(data.eventId).toBe('test-event-123');
      done();
    });

    setTimeout(() => {
      done(new Error('Timeout waiting for joined:event'));
    }, 5000);
  });
});

console.log('🧪 WebSocket Connection Test Suite');
console.log('✅ Tests Socket.io server initialization');
console.log('✅ Tests client connection');
console.log('✅ Tests event room joining');
