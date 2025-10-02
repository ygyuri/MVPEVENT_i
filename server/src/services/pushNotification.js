const admin = require('firebase-admin');
const webpush = require('web-push');
const DeviceToken = require('../../models/DeviceToken');
const WebPushSubscription = require('../../models/WebPushSubscription');

/**
 * Push Notification Service
 * Handles FCM and Web Push notifications for offline users
 */
class PushNotificationService {
  constructor() {
    this.fcmInitialized = false;
    this.webPushInitialized = false;
  }

  /**
   * Initialize Firebase Cloud Messaging
   */
  async initializeFCM() {
    try {
      if (this.fcmInitialized) return;

      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FCM_PROJECT_ID,
          private_key_id: process.env.FCM_PRIVATE_KEY_ID,
          private_key: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FCM_CLIENT_EMAIL,
          client_id: process.env.FCM_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FCM_CLIENT_EMAIL}`
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }

      this.fcmInitialized = true;
      console.log('✅ Firebase Cloud Messaging initialized');

    } catch (error) {
      console.error('❌ Failed to initialize FCM:', error);
      throw error;
    }
  }

  /**
   * Initialize Web Push
   */
  async initializeWebPush() {
    try {
      if (this.webPushInitialized) return;

      // Set VAPID keys
      webpush.setVapidDetails(
        process.env.WEB_PUSH_SUBJECT || 'mailto:admin@event-i.com',
        process.env.WEB_PUSH_PUBLIC_KEY,
        process.env.WEB_PUSH_PRIVATE_KEY
      );

      this.webPushInitialized = true;
      console.log('✅ Web Push initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Web Push:', error);
      throw error;
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendToUsers(userIds, notification) {
    try {
      const results = {
        success: 0,
        failed: 0,
        fcm: { success: 0, failed: 0 },
        webPush: { success: 0, failed: 0 }
      };

      // Get device tokens for users
      const deviceTokens = await this.getUserDeviceTokens(userIds);
      const webPushSubscriptions = await this.getUserWebPushSubscriptions(userIds);

      // Send FCM notifications
      if (deviceTokens.length > 0) {
        const fcmResult = await this.sendFCMNotifications(deviceTokens, notification);
        results.fcm = fcmResult;
        results.success += fcmResult.success;
        results.failed += fcmResult.failed;
      }

      // Send Web Push notifications
      if (webPushSubscriptions.length > 0) {
        const webPushResult = await this.sendWebPushNotifications(webPushSubscriptions, notification);
        results.webPush = webPushResult;
        results.success += webPushResult.success;
        results.failed += webPushResult.failed;
      }

      return results;

    } catch (error) {
      console.error('❌ Failed to send notifications to users:', error);
      throw error;
    }
  }

  /**
   * Send FCM notifications
   */
  async sendFCMNotifications(deviceTokens, notification) {
    try {
      if (!this.fcmInitialized) {
        await this.initializeFCM();
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          ...notification.data,
          timestamp: Date.now().toString()
        },
        android: {
          priority: notification.priority || 'normal',
          notification: {
            sound: 'default',
            channel_id: 'event_updates'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const results = { success: 0, failed: 0, invalidTokens: [] };

      // Send to each device token
      for (const token of deviceTokens) {
        try {
          const response = await admin.messaging().send({
            ...message,
            token: token.token
          });

          if (response) {
            results.success++;
          }
        } catch (error) {
          console.error(`❌ FCM send failed for token ${token.token}:`, error.message);
          
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            results.invalidTokens.push(token.token);
          }
          
          results.failed++;
        }
      }

      // Remove invalid tokens
      if (results.invalidTokens.length > 0) {
        await this.removeInvalidTokens(results.invalidTokens);
      }

      return results;

    } catch (error) {
      console.error('❌ FCM notifications failed:', error);
      throw error;
    }
  }

  /**
   * Send Web Push notifications
   */
  async sendWebPushNotifications(subscriptions, notification) {
    try {
      if (!this.webPushInitialized) {
        await this.initializeWebPush();
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        data: notification.data,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'event-update',
        requireInteraction: notification.priority === 'high'
      });

      const results = { success: 0, failed: 0, invalidSubscriptions: [] };

      // Send to each subscription
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(subscription.subscription, payload);
          results.success++;
        } catch (error) {
          console.error(`❌ Web Push send failed for subscription ${subscription._id}:`, error.message);
          
          if (error.statusCode === 410 || error.statusCode === 404) {
            results.invalidSubscriptions.push(subscription._id);
          }
          
          results.failed++;
        }
      }

      // Remove invalid subscriptions
      if (results.invalidSubscriptions.length > 0) {
        await this.removeInvalidSubscriptions(results.invalidSubscriptions);
      }

      return results;

    } catch (error) {
      console.error('❌ Web Push notifications failed:', error);
      throw error;
    }
  }

  /**
   * Get device tokens for users
   */
  async getUserDeviceTokens(userIds) {
    try {
      const tokens = await DeviceToken.find({
        userId: { $in: userIds },
        isActive: true
      }).select('token platform');

      return tokens;
    } catch (error) {
      console.error('❌ Failed to get device tokens:', error);
      return [];
    }
  }

  /**
   * Get Web Push subscriptions for users
   */
  async getUserWebPushSubscriptions(userIds) {
    try {
      const subscriptions = await WebPushSubscription.find({
        userId: { $in: userIds },
        isActive: true
      }).select('subscription');

      return subscriptions;
    } catch (error) {
      console.error('❌ Failed to get Web Push subscriptions:', error);
      return [];
    }
  }

  /**
   * Remove invalid device tokens
   */
  async removeInvalidTokens(tokens) {
    try {
      await DeviceToken.updateMany(
        { token: { $in: tokens } },
        { isActive: false, updatedAt: new Date() }
      );
      console.log(`🧹 Removed ${tokens.length} invalid device tokens`);
    } catch (error) {
      console.error('❌ Failed to remove invalid tokens:', error);
    }
  }

  /**
   * Remove invalid Web Push subscriptions
   */
  async removeInvalidSubscriptions(subscriptionIds) {
    try {
      await WebPushSubscription.updateMany(
        { _id: { $in: subscriptionIds } },
        { isActive: false, updatedAt: new Date() }
      );
      console.log(`🧹 Removed ${subscriptionIds.length} invalid Web Push subscriptions`);
    } catch (error) {
      console.error('❌ Failed to remove invalid subscriptions:', error);
    }
  }

  /**
   * Register device token
   */
  async registerDeviceToken(userId, token, platform) {
    try {
      const deviceToken = await DeviceToken.findOneAndUpdate(
        { userId, token },
        {
          userId,
          token,
          platform,
          isActive: true,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`📱 Registered device token for user ${userId}`);
      return deviceToken;
    } catch (error) {
      console.error('❌ Failed to register device token:', error);
      throw error;
    }
  }

  /**
   * Register Web Push subscription
   */
  async registerWebPushSubscription(userId, subscription) {
    try {
      const webPushSubscription = await WebPushSubscription.findOneAndUpdate(
        { userId, 'subscription.endpoint': subscription.endpoint },
        {
          userId,
          subscription,
          isActive: true,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`🌐 Registered Web Push subscription for user ${userId}`);
      return webPushSubscription;
    } catch (error) {
      console.error('❌ Failed to register Web Push subscription:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getStats() {
    try {
      const deviceTokenCount = await DeviceToken.countDocuments({ isActive: true });
      const webPushSubscriptionCount = await WebPushSubscription.countDocuments({ isActive: true });

      return {
        deviceTokens: deviceTokenCount,
        webPushSubscriptions: webPushSubscriptionCount,
        total: deviceTokenCount + webPushSubscriptionCount
      };
    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      return null;
    }
  }
}

module.exports = new PushNotificationService();
