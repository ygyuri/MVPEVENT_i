/**
 * Notification Service
 *
 * Handles sending notifications to admins for important system events,
 * such as bulk resend job completions.
 *
 * @module notificationService
 */

const EmailService = require('./emailService');
const BulkResendLog = require('../models/BulkResendLog');

class NotificationService {
  /**
   * Send bulk resend completion notification to admin
   *
   * @param {string} auditLogId - Audit log ID for the completed bulk resend
   * @returns {Promise<Object>} Email send result
   */
  async sendBulkResendNotification(auditLogId) {
    try {
      // Load audit log with full details
      const auditLog = await BulkResendLog.findById(auditLogId)
        .populate('triggeredBy.userId', 'email firstName lastName name')
        .lean();

      if (!auditLog) {
        throw new Error(`Audit log ${auditLogId} not found`);
      }

      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      if (!adminEmail) {
        console.warn('⚠️  ADMIN_EMAIL not configured - skipping notification');
        return { skipped: true, reason: 'ADMIN_EMAIL not configured' };
      }

      // Determine status color and icon
      const statusConfig = {
        completed: { color: '#10b981', icon: '✅', label: 'Completed' },
        failed: { color: '#ef4444', icon: '❌', label: 'Failed' },
        cancelled: { color: '#f59e0b', icon: '⚠️', label: 'Cancelled' },
      };

      const config = statusConfig[auditLog.status] || statusConfig.completed;

      // Format duration
      const durationFormatted = auditLog.duration
        ? this._formatDuration(auditLog.duration)
        : 'N/A';

      // Build email HTML
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${config.color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
    .info-item { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; }
    .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 500; }
    .info-value { font-size: 20px; font-weight: 700; color: #111827; margin-top: 5px; }
    .filters { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 14px; }
    .filters p { margin: 5px 0; }
    .filters strong { color: #374151; }
    .error-box { background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-top: 15px; }
    .error-box h4 { margin: 0 0 10px 0; color: #991b1b; font-size: 14px; }
    .error-item { font-size: 13px; color: #7f1d1d; margin: 5px 0; padding: 5px; background: white; border-radius: 4px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.icon} Bulk Resend ${config.label}</h1>
    </div>

    <div class="content">
      <!-- Summary Section -->
      <div class="section">
        <div class="section-title">📊 Summary</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Orders Processed</div>
            <div class="info-value">${auditLog.stats?.totalOrdersProcessed || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tickets Updated</div>
            <div class="info-value">${auditLog.stats?.totalTicketsUpdated || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Emails Sent</div>
            <div class="info-value">${auditLog.stats?.totalEmailsSent || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Errors</div>
            <div class="info-value" style="color: ${auditLog.stats?.totalErrors > 0 ? '#dc2626' : '#10b981'};">
              ${auditLog.stats?.totalErrors || 0}
            </div>
          </div>
        </div>
      </div>

      <!-- Details Section -->
      <div class="section">
        <div class="section-title">ℹ️ Details</div>
        <div class="filters">
          <p><strong>Triggered by:</strong> ${auditLog.triggeredBy?.userName || 'N/A'} (${auditLog.triggeredBy?.userEmail || 'N/A'})</p>
          <p><strong>Role:</strong> ${auditLog.triggeredBy?.role || 'N/A'}</p>
          <p><strong>Execution mode:</strong> ${auditLog.executionMode || 'N/A'}</p>
          <p><strong>Duration:</strong> ${durationFormatted}</p>
          <p><strong>Started:</strong> ${new Date(auditLog.startTime).toLocaleString()}</p>
          ${auditLog.endTime ? `<p><strong>Completed:</strong> ${new Date(auditLog.endTime).toLocaleString()}</p>` : ''}
        </div>
      </div>

      <!-- Filters Section -->
      ${auditLog.filters ? `
      <div class="section">
        <div class="section-title">🔍 Filters Applied</div>
        <div class="filters">
          ${auditLog.filters.eventTitle ? `<p><strong>Event:</strong> ${auditLog.filters.eventTitle}</p>` : ''}
          ${auditLog.filters.startDate ? `<p><strong>Start Date:</strong> ${new Date(auditLog.filters.startDate).toLocaleDateString()}</p>` : ''}
          ${auditLog.filters.endDate ? `<p><strong>End Date:</strong> ${new Date(auditLog.filters.endDate).toLocaleDateString()}</p>` : ''}
          ${auditLog.filters.skipRecentlyResent ? `<p><strong>Duplicate Prevention:</strong> Skip orders resent within ${auditLog.filters.recentWindowMinutes} minutes</p>` : ''}
        </div>
      </div>
      ` : ''}

      <!-- Errors Section -->
      ${auditLog.errors && auditLog.errors.length > 0 ? `
      <div class="section">
        <div class="error-box">
          <h4>❌ Errors (${auditLog.errors.length})</h4>
          ${auditLog.errors.slice(0, 10).map(err => `
            <div class="error-item">
              <strong>Order ${err.orderNumber || err.orderId || 'Unknown'}:</strong> ${err.error || 'Unknown error'}
            </div>
          `).join('')}
          ${auditLog.errors.length > 10 ? `<p style="margin-top: 10px; font-size: 12px; color: #6b7280;">... and ${auditLog.errors.length - 10} more errors</p>` : ''}
        </div>
      </div>
      ` : ''}

      <!-- Job-level Error -->
      ${auditLog.error ? `
      <div class="section">
        <div class="error-box">
          <h4>❌ Job Failure</h4>
          <p style="color: #7f1d1d; font-size: 14px;">${auditLog.error}</p>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>This is an automated notification from Event-i</p>
      <p>Audit Log ID: ${auditLogId}</p>
    </div>
  </div>
</body>
</html>
      `;

      // Send email
      const result = await EmailService.transporter.sendMail({
        from: `"Event-i Notifications" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `${config.icon} Bulk Resend ${config.label} - ${auditLog.stats?.totalOrdersProcessed || 0} orders processed`,
        html: emailHtml,
      });

      console.log(`✅ Notification sent to ${adminEmail} for audit log ${auditLogId}`);

      // Update audit log to mark notification as sent
      await BulkResendLog.findByIdAndUpdate(auditLogId, {
        notificationSent: true,
        notificationSentAt: new Date(),
      });

      return { success: true, messageId: result.messageId, recipient: adminEmail };
    } catch (error) {
      console.error(`❌ Failed to send notification for audit log ${auditLogId}:`, error);
      throw error;
    }
  }

  /**
   * Format duration in milliseconds to human-readable string
   * @private
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = new NotificationService();
