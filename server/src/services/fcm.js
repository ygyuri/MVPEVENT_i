const admin = require('firebase-admin');

/**
 * Firebase Cloud Messaging Service
 * Handles FCM notifications for mobile devices
 */
class FCMService {
  constructor() {
    this.isInitialized = false;
    this.app = null;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Check if already initialized
      if (admin.apps.length > 0) {
        this.app = admin.app();
        this.isInitialized = true;
        console.log('✅ FCM already initialized');
        return;
      }

      // Initialize with service account
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

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FCM_PROJECT_ID
      });

      this.isInitialized = true;
      console.log('✅ Firebase Cloud Messaging initialized');

    } catch (error) {
      console.error('❌ Failed to initialize FCM:', error);
      throw error;
    }
  }

  /**
   * Send notification to single device
   */
  async sendToDevice(token, notification) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const message = {
        token: token,
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
            channel_id: 'event_updates',
            icon: 'ic_notification',
            color: '#2196F3'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: notification.title,
                body: notification.body
              }
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      return { success: true, messageId: response };

    } catch (error) {
      console.error('❌ FCM send to device failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToDevices(tokens, notification) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const message = {
        tokens: tokens,
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
            channel_id: 'event_updates',
            icon: 'ic_notification',
            color: '#2196F3'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: notification.title,
                body: notification.body
              }
            }
          }
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      
      return {
        success: response.successCount,
        failed: response.failureCount,
        responses: response.responses
      };

    } catch (error) {
      console.error('❌ FCM send to devices failed:', error);
      return { success: 0, failed: tokens.length, error: error.message };
    }
  }

  /**
   * Send notification to topic
   */
  async sendToTopic(topic, notification) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const message = {
        topic: topic,
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

      const response = await admin.messaging().send(message);
      return { success: true, messageId: response };

    } catch (error) {
      console.error('❌ FCM send to topic failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe device to topic
   */
  async subscribeToTopic(tokens, topic) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      return { success: true, response };

    } catch (error) {
      console.error('❌ FCM subscribe to topic failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe device from topic
   */
  async unsubscribeFromTopic(tokens, topic) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      return { success: true, response };

    } catch (error) {
      console.error('❌ FCM unsubscribe from topic failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate FCM token
   */
  async validateToken(token) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Try to send a test message
      const message = {
        token: token,
        data: {
          test: 'true'
        }
      };

      await admin.messaging().send(message);
      return { valid: true };

    } catch (error) {
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        return { valid: false, reason: 'INVALID_TOKEN' };
      }
      
      return { valid: false, reason: 'VALIDATION_FAILED', error: error.message };
    }
  }

  /**
   * Get FCM statistics
   */
  async getStats() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // This would typically come from your database
      // For now, return mock stats
      return {
        totalTokens: 0,
        activeTokens: 0,
        invalidTokens: 0
      };

    } catch (error) {
      console.error('❌ Failed to get FCM stats:', error);
      return null;
    }
  }
}

module.exports = new FCMService();
