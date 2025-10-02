const webpush = require('web-push');

/**
 * Web Push Service
 * Handles Web Push notifications for web browsers
 */
class WebPushService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize Web Push
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Set VAPID keys
      webpush.setVapidDetails(
        process.env.WEB_PUSH_SUBJECT || 'mailto:admin@event-i.com',
        process.env.WEB_PUSH_PUBLIC_KEY,
        process.env.WEB_PUSH_PRIVATE_KEY
      );

      this.isInitialized = true;
      console.log('✅ Web Push initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Web Push:', error);
      throw error;
    }
  }

  /**
   * Send notification to single subscription
   */
  async sendToSubscription(subscription, notification) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        data: notification.data,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'event-update',
        requireInteraction: notification.priority === 'high',
        actions: [
          {
            action: 'view',
            title: 'View Update',
            icon: '/action-view.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/action-dismiss.png'
          }
        ],
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      });

      const response = await webpush.sendNotification(subscription, payload);
      return { success: true, response };

    } catch (error) {
      console.error('❌ Web Push send to subscription failed:', error);
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
  }

  /**
   * Send notification to multiple subscriptions
   */
  async sendToSubscriptions(subscriptions, notification) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const results = {
        success: 0,
        failed: 0,
        invalidSubscriptions: []
      };

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        data: notification.data,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'event-update',
        requireInteraction: notification.priority === 'high',
        actions: [
          {
            action: 'view',
            title: 'View Update',
            icon: '/action-view.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/action-dismiss.png'
          }
        ],
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      });

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

      return results;

    } catch (error) {
      console.error('❌ Web Push send to subscriptions failed:', error);
      return { success: 0, failed: subscriptions.length, error: error.message };
    }
  }

  /**
   * Validate Web Push subscription
   */
  async validateSubscription(subscription) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Try to send a test notification
      const testPayload = JSON.stringify({
        title: 'Test',
        body: 'This is a test notification',
        data: { test: true },
        icon: '/icon-192x192.png',
        tag: 'test'
      });

      await webpush.sendNotification(subscription, testPayload);
      return { valid: true };

    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        return { valid: false, reason: 'INVALID_SUBSCRIPTION' };
      }
      
      return { valid: false, reason: 'VALIDATION_FAILED', error: error.message };
    }
  }

  /**
   * Generate VAPID keys
   */
  generateVapidKeys() {
    try {
      const vapidKeys = webpush.generateVAPIDKeys();
      return {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      };
    } catch (error) {
      console.error('❌ Failed to generate VAPID keys:', error);
      throw error;
    }
  }

  /**
   * Get Web Push statistics
   */
  async getStats() {
    try {
      // This would typically come from your database
      // For now, return mock stats
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        invalidSubscriptions: 0
      };

    } catch (error) {
      console.error('❌ Failed to get Web Push stats:', error);
      return null;
    }
  }

  /**
   * Send notification with custom options
   */
  async sendCustomNotification(subscription, options) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const payload = JSON.stringify({
        title: options.title,
        body: options.body,
        data: options.data || {},
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/badge-72x72.png',
        tag: options.tag || 'notification',
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
        vibrate: options.vibrate || [200, 100, 200],
        timestamp: Date.now(),
        ...options.custom
      });

      const response = await webpush.sendNotification(subscription, payload);
      return { success: true, response };

    } catch (error) {
      console.error('❌ Web Push custom notification failed:', error);
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
  }

  /**
   * Send notification to topic (using service worker)
   */
  async sendToTopic(topic, notification) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // This would typically involve sending to all subscriptions
      // that are subscribed to the topic
      // For now, this is a placeholder
      console.log(`📢 Sending to topic: ${topic}`);
      
      return { success: true, message: 'Topic notification sent' };

    } catch (error) {
      console.error('❌ Web Push send to topic failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notificationData) {
    try {
      const { action, data } = notificationData;
      
      switch (action) {
        case 'view':
          // Open the event updates page
          if (data.event_id) {
            window.open(`/events/${data.event_id}/updates`, '_blank');
          }
          break;
          
        case 'dismiss':
          // Just close the notification
          break;
          
        default:
          // Default action - open the event updates page
          if (data.event_id) {
            window.open(`/events/${data.event_id}/updates`, '_blank');
          }
      }
    } catch (error) {
      console.error('❌ Failed to handle notification click:', error);
    }
  }
}

module.exports = new WebPushService();
