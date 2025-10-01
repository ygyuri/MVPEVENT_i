const Reminder = require('../models/Reminder');
const ReminderTemplate = require('../models/ReminderTemplate');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { enqueueReminder } = require('./queue/reminderQueue');

class ReminderService {
  async scheduleForTickets(order, { timezone } = {}) {
    // Only for paid orders
    if (!order || order.status !== 'paid') return { scheduled: 0 };

    const tickets = await Ticket.find({ orderId: order._id, status: 'active' });
    if (!tickets.length) return { scheduled: 0 };

    const events = await Event.find({ _id: { $in: tickets.map(t => t.eventId) } });
    const eventById = new Map(events.map(e => [String(e._id), e]));

    let scheduled = 0;
    for (const t of tickets) {
      const ev = eventById.get(String(t.eventId));
      if (!ev) continue;
      const startsAt = new Date(ev.dates.startDate);
      const scheduleOffsets = [24 * 60, 2 * 60, 30]; // minutes
      for (const minutes of scheduleOffsets) {
        const runAt = new Date(startsAt.getTime() - minutes * 60 * 1000);
        if (runAt <= new Date()) continue; // do not schedule past times

        const reminder = await Reminder.create({
          eventId: ev._id,
          userId: t.ownerUserId,
          ticketId: t._id,
          reminderType: minutes === 1440 ? '24h' : minutes === 120 ? '2h' : '30m',
          scheduledTime: runAt,
          deliveryMethod: 'email',
          status: 'pending',
          timezone: timezone || undefined,
          payload: new Map([
            ['email', t.holder.email],
            ['subject', `Reminder: ${ev.title} starts soon`],
            ['html', `<p>Hi ${t.holder.firstName}, your event <strong>${ev.title}</strong> starts at ${new Date(startsAt).toLocaleString()}.</p>`]
          ])
        });

        await enqueueReminder(reminder._id, reminder.scheduledTime);
        reminder.status = 'queued';
        await reminder.save();
        scheduled += 1;
      }
    }

    return { scheduled };
  }

  async listUpcomingByUser(userId, { from = new Date(), limit = 50 } = {}) {
    return Reminder.find({ 
      userId, 
      status: { $in: ['pending', 'queued', 'sent', 'failed', 'cancelled'] }
    })
      .populate('eventId', 'title dates location')
      .populate('ticketId', 'ticketType price')
      .sort({ scheduledTime: -1 })
      .limit(limit);
  }

  async cancelReminder(reminderId) {
    const r = await Reminder.findById(reminderId);
    if (!r) return null;
    r.status = 'cancelled';
    await r.save();
    return r;
  }

  async updatePreferences(reminderId, { deliveryMethod }) {
    const r = await Reminder.findById(reminderId);
    if (!r) return null;
    if (deliveryMethod) r.deliveryMethod = deliveryMethod;
    await r.save();
    return r;
  }
}

module.exports = new ReminderService();




