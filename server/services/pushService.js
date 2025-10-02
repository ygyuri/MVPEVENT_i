let admin;
try { admin = require('firebase-admin'); } catch (e) { admin = null; }
let webpush;
try { webpush = require('web-push'); } catch (e) { webpush = null; }

class PushService {
  constructor() {
    // Initialize FCM if service account is provided
    if (admin && process.env.FCM_SERVICE_ACCOUNT_JSON) {
      try {
        const sa = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
        if (!admin.apps?.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
        this.fcmEnabled = true;
      } catch (e) {
        this.fcmEnabled = false;
      }
    } else {
      this.fcmEnabled = false;
    }

    // Initialize Web Push if VAPID keys provided
    if (webpush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      try {
        webpush.setVapidDetails('mailto:support@event-i.local', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
        this.webPushEnabled = true;
      } catch (e) {
        this.webPushEnabled = false;
      }
    } else {
      this.webPushEnabled = false;
    }
  }

  async getUserDeviceTargets(userIds) {
    const DeviceToken = require('../models/DeviceToken');
    const WebPushSubscription = require('../models/WebPushSubscription');
    const [tokens, subs] = await Promise.all([
      DeviceToken.find({ userId: { $in: userIds } }).select('token').lean(),
      WebPushSubscription.find({ userId: { $in: userIds } }).select('subscription').lean()
    ]);
    return { fcmTokens: tokens.map(t => t.token), webSubscriptions: subs.map(s => s.subscription) };
  }

  async sendFcm(tokens, payload) {
    if (!this.fcmEnabled || !tokens?.length) return { success: false, count: 0 };
    try {
      const res = await admin.messaging().sendEachForMulticast({ tokens, data: { type: 'event_update', ...payload } });
      return { success: true, count: res?.successCount || 0 };
    } catch (e) { return { success: false, count: 0 }; }
  }

  async sendWebPush(subscriptions, payload) {
    if (!this.webPushEnabled || !subscriptions?.length) return { success: false, count: 0 };
    let count = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub, JSON.stringify({ type: 'event_update', payload }));
        count++;
      } catch (e) { /* continue */ }
    }
    return { success: true, count };
  }

  async broadcastToUsers(userIds, payload) {
    const { fcmTokens, webSubscriptions } = await this.getUserDeviceTargets(userIds);
    const [fcmRes, webRes] = await Promise.all([
      this.sendFcm(fcmTokens, payload),
      this.sendWebPush(webSubscriptions, payload)
    ]);
    return { success: true, count: (fcmRes.count || 0) + (webRes.count || 0) };
  }
}

module.exports = new PushService();


