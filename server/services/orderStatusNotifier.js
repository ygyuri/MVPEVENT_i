const { createClient } = require('redis');

class OrderStatusNotifier {
  constructor() {
    this.publisher = null;
    this.isConnected = false;
    this.initializePublisher();
  }

  /**
   * Initialize Redis publisher client
   */
  async initializePublisher() {
    try {
      this.publisher = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'redis',
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined
      });

      this.publisher.on('error', (err) => {
        console.error('❌ Redis Publisher Error:', err);
        this.isConnected = false;
      });

      this.publisher.on('connect', () => {
        console.log('✅ Redis Publisher connecting...');
      });

      this.publisher.on('ready', () => {
        console.log('✅ Redis Publisher ready for order notifications');
        this.isConnected = true;
      });

      await this.publisher.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Redis publisher:', error);
      this.isConnected = false;
    }
  }

  /**
   * Notify all listeners that an order status changed
   * @param {string} orderId - The order ID
   * @param {object} orderData - Order data to send
   */
  async notifyOrderStatusChange(orderId, orderData) {
    try {
      if (!this.isConnected || !this.publisher) {
        console.log('⚠️  Redis not connected, skipping notification');
        return false;
      }

      const channel = `order:status:${orderId}`;
      const message = JSON.stringify({
        orderId,
        paymentStatus: orderData.paymentStatus,
        status: orderData.status,
        timestamp: Date.now(),
        ...orderData
      });

      // Publish to channel
      await this.publisher.publish(channel, message);
      
      // Also cache the result for 60 seconds (for late arrivals)
      await this.publisher.setEx(`order:latest:${orderId}`, 60, message);

      console.log(`✅ Order status notification published: ${orderId} (${orderData.paymentStatus})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to publish order status:', error);
      return false;
    }
  }

  /**
   * Get cached order status (if available)
   * @param {string} orderId - The order ID
   */
  async getCachedOrderStatus(orderId) {
    try {
      if (!this.isConnected || !this.publisher) {
        return null;
      }

      const cached = await this.publisher.get(`order:latest:${orderId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('❌ Failed to get cached order status:', error);
      return null;
    }
  }

  /**
   * Wait for order status change with timeout
   * @param {string} orderId - The order ID
   * @param {number} timeout - Timeout in milliseconds (default 60000)
   */
  async waitForOrderStatusChange(orderId, timeout = 60000) {
    return new Promise(async (resolve, reject) => {
      let subscriber = null;
      let timeoutHandle;
      let resolved = false;

      try {
        // Create subscriber client (must be separate from publisher)
        subscriber = createClient({
          socket: {
            host: process.env.REDIS_HOST || 'redis',
            port: process.env.REDIS_PORT || 6379
          },
          password: process.env.REDIS_PASSWORD || undefined
        });

        const channel = `order:status:${orderId}`;

        // Handle messages
        subscriber.on('message', (ch, message) => {
          if (ch === channel && !resolved) {
            resolved = true;
            clearTimeout(timeoutHandle);
            
            try {
              const data = JSON.parse(message);
              console.log(`📬 Redis message received for order: ${orderId}`);
              
              // Cleanup and resolve
              subscriber.unsubscribe(channel).then(() => {
                subscriber.quit();
              }).catch(console.error);
              
              resolve(data);
            } catch (error) {
              console.error('❌ Failed to parse Redis message:', error);
              subscriber.quit();
              reject(error);
            }
          }
        });

        // Handle errors
        subscriber.on('error', (err) => {
          console.error('❌ Redis Subscriber Error:', err);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutHandle);
            subscriber.quit();
            reject(err);
          }
        });

        // Connect
        await subscriber.connect();
        console.log(`📡 Subscriber connected for order: ${orderId}`);
        
        // Subscribe to channel
        await subscriber.subscribe(channel, (message) => {
          // Message handler is attached via 'message' event above
        });
        
        console.log(`📡 Subscribed to Redis channel: ${channel}`);

        // Set timeout
        timeoutHandle = setTimeout(async () => {
          if (!resolved) {
            resolved = true;
            console.log(`⏰ Timeout reached for order: ${orderId}`);
            
            try {
              await subscriber.unsubscribe(channel);
              await subscriber.quit();
            } catch (err) {
              console.error('Cleanup error:', err);
            }
            
            resolve(null); // Timeout - return null
          }
        }, timeout);

      } catch (error) {
        console.error('❌ Failed to setup Redis subscriber:', error);
        if (!resolved) {
          resolved = true;
          if (subscriber) {
            try {
              await subscriber.quit();
            } catch (err) {
              // Ignore cleanup errors
            }
          }
          reject(error);
        }
      }
    });
  }

  /**
   * Close connections (for graceful shutdown)
   */
  async close() {
    if (this.publisher) {
      try {
        await this.publisher.quit();
        console.log('✅ Redis publisher closed');
      } catch (error) {
        console.error('Error closing Redis publisher:', error);
      }
    }
  }
}

module.exports = new OrderStatusNotifier();
