const Reminder = require("../models/Reminder");
const ReminderTemplate = require("../models/ReminderTemplate");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const { enqueueReminder } = require("./queue/reminderQueue");
const {
  getBrandColors,
  getEmailHeader,
  getEmailFooter,
  wrapEmailTemplate,
} = require("./emailBranding");

class ReminderService {
  async scheduleForTickets(order, { timezone } = {}) {
    // Only for paid orders
    if (!order || order.status !== "paid") return { scheduled: 0 };

    const tickets = await Ticket.find({ orderId: order._id, status: "active" });
    if (!tickets.length) return { scheduled: 0 };

    const events = await Event.find({
      _id: { $in: tickets.map((t) => t.eventId) },
    });
    const eventById = new Map(events.map((e) => [String(e._id), e]));

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
          reminderType:
            minutes === 1440 ? "24h" : minutes === 120 ? "2h" : "30m",
          scheduledTime: runAt,
          deliveryMethod: "email",
          status: "pending",
          timezone: timezone || undefined,
          payload: new Map([
            ["email", t.holder.email],
            ["subject", `Reminder: ${ev.title} starts soon`],
            [
              "html",
              `<p>Hi ${t.holder.firstName}, your event <strong>${
                ev.title
              }</strong> starts at ${new Date(startsAt).toLocaleString()}.</p>`,
            ],
          ]),
        });

        await enqueueReminder(reminder._id, reminder.scheduledTime);
        reminder.status = "queued";
        await reminder.save();
        scheduled += 1;
      }
    }

    return { scheduled };
  }

  async listUpcomingByUser(userId, { from = new Date(), limit = 50 } = {}) {
    return Reminder.find({
      userId,
      status: { $in: ["pending", "queued", "sent", "failed", "cancelled"] },
    })
      .populate("eventId", "title dates location")
      .populate("ticketId", "ticketType price")
      .sort({ scheduledTime: -1 })
      .limit(limit);
  }

  async cancelReminder(reminderId) {
    const r = await Reminder.findById(reminderId);
    if (!r) return null;
    r.status = "cancelled";
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

  /**
   * Send reminder immediately (admin function)
   * Used for manual reminder sending from admin dashboard
   */
  async sendReminderImmediately(reminderId) {
    const reminder = await Reminder.findById(reminderId)
      .populate("eventId")
      .populate("userId")
      .populate("ticketId");

    if (!reminder) {
      throw new Error("Reminder not found");
    }

    if (reminder.status === "cancelled") {
      throw new Error("Cannot send cancelled reminder");
    }

    const emailService = require("./emailService");
    const smsService = require("./smsService");

    try {
      const method = reminder.deliveryMethod || "email";

      // Send email if needed
      if (method === "email" || method === "both") {
        const to = reminder.payload?.get("email") || reminder.userId?.email;
        if (to) {
          const subject =
            reminder.payload?.get("subject") ||
            `Reminder: ${reminder.eventId?.title || "Event"}`;
          const html =
            reminder.payload?.get("html") || `<p>Your event starts soon.</p>`;

          await emailService.transporter.sendMail({
            from: `"Event-i" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
          });
        }
      }

      // Send SMS if needed
      if (method === "sms" || method === "both") {
        const phone =
          reminder.payload?.get("phone") || reminder.userId?.profile?.phone;
        const text =
          reminder.payload?.get("text") ||
          `Reminder: ${reminder.eventId?.title || "Event"} starts soon`;

        if (phone) {
          await smsService.sendSms(phone, text);
        }
      }

      reminder.status = "sent";
      reminder.deliveredAt = new Date();
      await reminder.save();

      return reminder;
    } catch (error) {
      reminder.status = "failed";
      reminder.attempts = (reminder.attempts || 0) + 1;
      reminder.lastError = error.message;
      await reminder.save();
      throw error;
    }
  }

  /**
   * Send reminder for an order (admin function)
   * Finds all tickets for the order and sends immediate reminders
   */
  async sendRemindersForOrder(orderId) {
    const Order = require("../models/Order");
    const order = await Order.findById(orderId)
      .populate("items.eventId")
      .populate("customer.userId");

    if (!order) {
      throw new Error("Order not found");
    }

    // Find all tickets for this order
    const tickets = await Ticket.find({ orderId: order._id, status: "active" });
    if (!tickets.length) {
      throw new Error("No active tickets found for this order");
    }

    const events = await Event.find({
      _id: { $in: tickets.map((t) => t.eventId) },
    });
    const eventById = new Map(events.map((e) => [String(e._id), e]));

    const results = [];

    for (const ticket of tickets) {
      const event = eventById.get(String(ticket.eventId));
      if (!event) continue;

      // Create a reminder record for immediate sending
      const reminder = await Reminder.create({
        eventId: event._id,
        userId: ticket.ownerUserId,
        ticketId: ticket._id,
        reminderType: "24h", // Default type for manual sends
        scheduledTime: new Date(),
        deliveryMethod: "email",
        status: "pending",
        payload: new Map([
          ["email", ticket.holder?.email || order.customerInfo?.email],
          ["subject", `Reminder: ${event.title} is coming up!`],
          ["html", ReminderService.generateReminderHTML(event, ticket, order)],
        ]),
      });

      try {
        // Send immediately
        await this.sendReminderImmediately(reminder._id);
        results.push({
          ticketId: ticket._id,
          success: true,
          reminderId: reminder._id,
        });
      } catch (error) {
        results.push({
          ticketId: ticket._id,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  static generateReminderHTML(event, ticket, order) {
    const eventDate = new Date(event.dates.startDate);
    const customerName =
      ticket.holder?.firstName || order.customerInfo?.firstName || "Guest";
    const colors = getBrandColors();
    const frontendUrl = process.env.FRONTEND_URL || "https://event-i.co.ke";

    const content = `
      ${getEmailHeader("⏰ Event Reminder", "Your event is coming up soon!")}
      
      <div class="content">
        <div class="greeting">Hi ${customerName},</div>
        
        <p class="intro-text">
          This is a friendly reminder about your upcoming event. Make sure you're all set!
        </p>
        
        <div class="card">
          <h3 style="margin-top: 0; color: ${colors.primary};">
            ${event.title}
          </h3>
          <table class="table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Date:</td>
              <td style="padding: 8px 0; color: ${colors.text};">
                ${eventDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Time:</td>
              <td style="padding: 8px 0; color: ${colors.text};">
                ${eventDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </td>
            </tr>
            ${
              event.location
                ? `
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Location:</td>
              <td style="padding: 8px 0; color: ${colors.text};">
                ${
                  event.location.address ||
                  event.location.venueName ||
                  event.location
                }
              </td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: ${
                colors.textMuted
              };">Ticket Type:</td>
              <td style="padding: 8px 0; color: ${colors.text};">
                ${ticket.ticketType || "Standard"}
              </td>
            </tr>
          </table>
        </div>
        
        <div class="highlight-box">
          <h4>📋 Reminder Checklist</h4>
          <ul style="margin: 0; padding-left: 20px; color: ${
            colors.textSecondary
          };">
            <li>Bring your ticket (digital or printed)</li>
            <li>Arrive 15-30 minutes early</li>
            <li>Have your ID ready if required</li>
            <li>Check the event location beforehand</li>
          </ul>
        </div>
        
        <div class="btn-container">
          <a href="${frontendUrl}/wallet" class="btn" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f0f69 0%, #6b1a8a 100%); color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View Your Ticket
          </a>
        </div>
        
        <p class="intro-text" style="margin-top: 24px;">
          We look forward to seeing you there! If you have any questions, please don't hesitate to contact us.
        </p>
      </div>
      
      ${getEmailFooter()}
    `;

    return wrapEmailTemplate(content, `Event Reminder: ${event.title}`);
  }
}

module.exports = new ReminderService();
