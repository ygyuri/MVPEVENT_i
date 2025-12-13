const mongoose = require('mongoose');
const Order = require('../models/Order');
const Event = require('../models/Event');

async function findTestEvent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event_i');

    // Find events with completed orders
    const eventsWithOrders = await Order.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'paid'] },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: '$eventId',
          orderCount: { $sum: 1 },
          sampleOrders: { $push: { orderNumber: '$orderNumber', customerEmail: '$customerEmail', createdAt: '$createdAt' } }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]);

    console.log('\n📊 Events with completed orders (top 5):\n');

    const validEvents = [];
    for (const eventData of eventsWithOrders) {
      const event = await Event.findById(eventData._id).select('title date');
      if (event) {
        validEvents.push({ ...eventData, event });
        console.log(`Event: ${event.title}`);
        console.log(`  ID: ${eventData._id}`);
        console.log(`  Date: ${new Date(event.date).toLocaleDateString()}`);
        console.log(`  Orders: ${eventData.orderCount}`);
        console.log('');
      }
    }

    if (validEvents.length > 0) {
      const testEventData = validEvents[0];
      const testEvent = testEventData.event;

      console.log(`\n✅ RECOMMENDED TEST EVENT: ${testEvent.title}`);
      console.log(`Event ID: ${testEventData._id}`);
      console.log(`Total Orders: ${testEventData.orderCount}\n`);

      console.log('Sample orders:');
      testEventData.sampleOrders.slice(0, 3).forEach(order => {
        console.log(`  - Order ${order.orderNumber}: ${order.customerEmail} (Created: ${new Date(order.createdAt).toLocaleDateString()})`);
      });
    } else {
      console.log('❌ No events with completed orders found');
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

findTestEvent();
