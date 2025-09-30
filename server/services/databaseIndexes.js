const mongoose = require('mongoose');

/**
 * Database Indexes for Analytics Performance
 * Creates optimized indexes for analytics queries
 */
class DatabaseIndexes {
  constructor() {
    this.indexesCreated = false;
  }

  /**
   * Create all analytics-related indexes
   */
  async createAnalyticsIndexes() {
    if (this.indexesCreated) {
      console.log('📊 Analytics indexes already created');
      return;
    }

    try {
      console.log('📊 Creating analytics indexes...');

      // Order collection indexes for analytics
      await this.createOrderIndexes();
      
      // Ticket collection indexes for analytics
      await this.createTicketIndexes();
      
      // Event collection indexes for analytics
      await this.createEventIndexes();

      this.indexesCreated = true;
      console.log('✅ Analytics indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating analytics indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Order collection
   */
  async createOrderIndexes() {
    const Order = mongoose.model('Order');
    
    const orderIndexes = [
      // Analytics queries - event-based sales
      { 
        'items.eventId': 1, 
        'createdAt': 1, 
        'status': 1 
      },
      
      // Payment method analytics
      { 
        'items.eventId': 1, 
        'payment.method': 1, 
        'status': 1 
      },
      
      // Revenue trends
      { 
        'createdAt': 1, 
        'status': 1 
      },
      
      // Order number lookup
      { 
        'orderNumber': 1 
      },
      
      // Customer analytics
      { 
        'customer.userId': 1, 
        'createdAt': 1 
      },
      
      // Payment status tracking
      { 
        'payment.status': 1, 
        'createdAt': 1 
      },
      
      // Refund tracking
      { 
        'status': 1, 
        'createdAt': 1 
      }
    ];

    for (const index of orderIndexes) {
      try {
        await Order.collection.createIndex(index, { background: true });
        console.log(`✅ Created Order index:`, index);
      } catch (error) {
        if (error.code !== 85) { // Index already exists
          console.error(`❌ Error creating Order index:`, error);
        }
      }
    }
  }

  /**
   * Create indexes for Ticket collection
   */
  async createTicketIndexes() {
    const Ticket = mongoose.model('Ticket');
    
    const ticketIndexes = [
      // Event-based ticket queries
      { 
        'eventId': 1, 
        'status': 1, 
        'createdAt': 1 
      },
      
      // Ticket type analytics
      { 
        'eventId': 1, 
        'ticketType': 1, 
        'status': 1 
      },
      
      // Attendee export queries
      { 
        'eventId': 1, 
        'holder.email': 1 
      },
      
      // Ticket usage tracking
      { 
        'eventId': 1, 
        'usedAt': 1 
      },
      
      // Order relationship
      { 
        'orderId': 1, 
        'eventId': 1 
      },
      
      // Owner user lookup
      { 
        'ownerUserId': 1, 
        'status': 1 
      },
      
      // QR code lookup
      { 
        'qrCode': 1 
      }
    ];

    for (const index of ticketIndexes) {
      try {
        await Ticket.collection.createIndex(index, { background: true });
        console.log(`✅ Created Ticket index:`, index);
      } catch (error) {
        if (error.code !== 85) { // Index already exists
          console.error(`❌ Error creating Ticket index:`, error);
        }
      }
    }
  }

  /**
   * Create indexes for Event collection
   */
  async createEventIndexes() {
    const Event = mongoose.model('Event');
    
    const eventIndexes = [
      // Organizer analytics
      { 
        'organizer': 1, 
        'status': 1, 
        'createdAt': 1 
      },
      
      // Event date queries
      { 
        'organizer': 1, 
        'dates.startDate': 1, 
        'status': 1 
      },
      
      // Event capacity tracking
      { 
        'organizer': 1, 
        'capacity': 1, 
        'currentAttendees': 1 
      },
      
      // Event status analytics
      { 
        'organizer': 1, 
        'status': 1 
      },
      
      // Event category analytics
      { 
        'organizer': 1, 
        'category': 1, 
        'status': 1 
      }
    ];

    for (const index of eventIndexes) {
      try {
        await Event.collection.createIndex(index, { background: true });
        console.log(`✅ Created Event index:`, index);
      } catch (error) {
        if (error.code !== 85) { // Index already exists
          console.error(`❌ Error creating Event index:`, error);
        }
      }
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    try {
      const Order = mongoose.model('Order');
      const Ticket = mongoose.model('Ticket');
      const Event = mongoose.model('Event');

      const [orderStats, ticketStats, eventStats] = await Promise.all([
        Order.collection.getIndexes(),
        Ticket.collection.getIndexes(),
        Event.collection.getIndexes()
      ]);

      return {
        orders: Object.keys(orderStats).length,
        tickets: Object.keys(ticketStats).length,
        events: Object.keys(eventStats).length,
        total: Object.keys(orderStats).length + Object.keys(ticketStats).length + Object.keys(eventStats).length
      };
    } catch (error) {
      console.error('Error getting index stats:', error);
      return null;
    }
  }

  /**
   * Drop analytics indexes (for testing/cleanup)
   */
  async dropAnalyticsIndexes() {
    try {
      console.log('🗑️ Dropping analytics indexes...');
      
      const Order = mongoose.model('Order');
      const Ticket = mongoose.model('Ticket');
      const Event = mongoose.model('Event');

      // Drop specific analytics indexes
      const indexesToDrop = [
        // Order indexes
        { collection: Order, index: { 'items.eventId': 1, 'createdAt': 1, 'status': 1 } },
        { collection: Order, index: { 'items.eventId': 1, 'payment.method': 1, 'status': 1 } },
        { collection: Order, index: { 'createdAt': 1, 'status': 1 } },
        
        // Ticket indexes
        { collection: Ticket, index: { 'eventId': 1, 'status': 1, 'createdAt': 1 } },
        { collection: Ticket, index: { 'eventId': 1, 'ticketType': 1, 'status': 1 } },
        { collection: Ticket, index: { 'eventId': 1, 'holder.email': 1 } },
        
        // Event indexes
        { collection: Event, index: { 'organizer': 1, 'status': 1, 'createdAt': 1 } },
        { collection: Event, index: { 'organizer': 1, 'dates.startDate': 1, 'status': 1 } }
      ];

      for (const { collection, index } of indexesToDrop) {
        try {
          await collection.collection.dropIndex(index);
          console.log(`✅ Dropped index:`, index);
        } catch (error) {
          if (error.code !== 27) { // Index not found
            console.error(`❌ Error dropping index:`, error);
          }
        }
      }

      this.indexesCreated = false;
      console.log('✅ Analytics indexes dropped');
    } catch (error) {
      console.error('❌ Error dropping analytics indexes:', error);
      throw error;
    }
  }

  /**
   * Check if indexes exist
   */
  async checkIndexesExist() {
    try {
      const Order = mongoose.model('Order');
      const Ticket = mongoose.model('Ticket');
      const Event = mongoose.model('Event');

      const [orderIndexes, ticketIndexes, eventIndexes] = await Promise.all([
        Order.collection.getIndexes(),
        Ticket.collection.getIndexes(),
        Event.collection.getIndexes()
      ]);

      const analyticsIndexes = [
        // Check for key analytics indexes
        'items.eventId_1_createdAt_1_status_1',
        'eventId_1_status_1_createdAt_1',
        'organizer_1_status_1_createdAt_1'
      ];

      const existingIndexes = [
        ...Object.keys(orderIndexes),
        ...Object.keys(ticketIndexes),
        ...Object.keys(eventIndexes)
      ];

      const missingIndexes = analyticsIndexes.filter(index => 
        !existingIndexes.some(existing => existing.includes(index.split('_')[0]))
      );

      return {
        exists: missingIndexes.length === 0,
        missing: missingIndexes,
        total: existingIndexes.length
      };
    } catch (error) {
      console.error('Error checking indexes:', error);
      return { exists: false, missing: [], total: 0 };
    }
  }
}

module.exports = new DatabaseIndexes();


