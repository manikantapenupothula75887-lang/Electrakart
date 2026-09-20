/**
 * ElectraKart Production Notification Service
 * Orchestrates event publishing, channel routing, user preferences,
 * in-app persistence with strict IDOR protection, and resilient provider dispatch.
 */

import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { config } from '../../config/environment.js';
import {
  NotificationChannel,
  NotificationEvent,
  UserChannelPreferences,
  ProviderSendResult,
} from './notification.types.js';
import { renderTemplates } from './templates.js';
import {
  getEmailProvider,
  getSmsProvider,
  getWhatsAppProvider,
} from './providers/providerFactory.js';

export class NotificationService {
  /**
   * Publishes a business event across configured notification channels.
   * Resilient: Provider failures NEVER throw or roll back caller transactions.
   */
  async publishEvent(event: NotificationEvent): Promise<{
    inAppId?: string;
    logs: Array<{ channel: NotificationChannel; status: string; logId: string }>;
  }> {
    const notifId = `notif-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const results: Array<{ channel: NotificationChannel; status: string; logId: string }> = [];

    // 1. Persist In-App Notification if target user / role is present
    if (event.userId || event.role) {
      try {
        await db.query(
          `INSERT INTO notifications (
            id, user_id, role, title, message, type, link_action_url,
            entity_type, entity_id, is_read, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10, NOW(), NOW())`,
          [
            notifId,
            event.userId || null,
            event.role || 'CUSTOMER',
            event.title,
            event.message,
            event.eventType,
            event.linkActionUrl || null,
            event.entityType || null,
            event.entityId || null,
            JSON.stringify(event.metadata || {}),
          ]
        );
        results.push({ channel: 'IN_APP', status: 'DELIVERED', logId: notifId });
      } catch (err) {
        console.error('[NotificationService] Failed to save in-app notification:', err);
      }
    }

    // 2. Fetch User Channel Preferences
    const prefs = event.userId ? await this.getUserPreferences(event.userId) : null;
    const rendered = renderTemplates(event);

    // Helper to log delivery attempt
    const recordLog = async (
      channel: NotificationChannel,
      provider: string,
      recipient: string,
      sendRes: ProviderSendResult
    ) => {
      const logId = `log-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        await db.query(
          `INSERT INTO notification_logs (
            id, notification_id, channel, provider, provider_message_id, recipient,
            status, attempt_count, last_error, sent_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, NOW(), NOW())`,
          [
            logId,
            notifId,
            channel,
            provider,
            sendRes.providerMessageId || null,
            recipient,
            sendRes.status,
            sendRes.error || null,
            sendRes.success ? new Date() : null,
          ]
        );
        results.push({ channel, status: sendRes.status, logId });
      } catch (logErr) {
        console.error(`[NotificationService] Failed to record log for ${channel}:`, logErr);
      }
    };

    // 3. Dispatch to EMAIL
    const canSendEmail =
      config.emailEnabled &&
      event.recipientEmail &&
      (event.isCriticalTransactional || !prefs || prefs.email);

    if (canSendEmail && event.recipientEmail) {
      const emailProvider = getEmailProvider();
      try {
        const sendRes = await emailProvider.sendEmail({
          to: event.recipientEmail,
          subject: rendered.email.subject,
          textBody: rendered.email.textBody,
          htmlBody: rendered.email.htmlBody,
          eventType: event.eventType,
          metadata: event.metadata,
        });
        await recordLog('EMAIL', emailProvider.name, event.recipientEmail, sendRes);
      } catch (err: any) {
        await recordLog('EMAIL', emailProvider.name, event.recipientEmail, {
          success: false,
          provider: emailProvider.name,
          status: 'FAILED',
          error: err.message || 'Email provider exception',
        });
      }
    }

    // 4. Dispatch to SMS
    const canSendSms =
      config.smsEnabled &&
      event.recipientPhone &&
      (event.isCriticalTransactional || !prefs || prefs.sms);

    if (canSendSms && event.recipientPhone) {
      const smsProvider = getSmsProvider();
      try {
        const sendRes = await smsProvider.sendSms({
          to: event.recipientPhone,
          message: rendered.sms.text,
          eventType: event.eventType,
          metadata: event.metadata,
        });
        await recordLog('SMS', smsProvider.name, event.recipientPhone, sendRes);
      } catch (err: any) {
        await recordLog('SMS', smsProvider.name, event.recipientPhone, {
          success: false,
          provider: smsProvider.name,
          status: 'FAILED',
          error: err.message || 'SMS provider exception',
        });
      }
    }

    // 5. Dispatch to WHATSAPP
    const canSendWhatsApp =
      config.whatsappEnabled &&
      event.recipientPhone &&
      (event.isCriticalTransactional || !prefs || prefs.whatsapp);

    if (canSendWhatsApp && event.recipientPhone) {
      const whatsAppProvider = getWhatsAppProvider();
      try {
        const sendRes = await whatsAppProvider.sendWhatsApp({
          to: event.recipientPhone,
          templateName: rendered.whatsapp.templateName,
          templateParams: rendered.whatsapp.templateParams,
          messageText: rendered.whatsapp.messageText,
          eventType: event.eventType,
          metadata: event.metadata,
        });
        await recordLog('WHATSAPP', whatsAppProvider.name, event.recipientPhone, sendRes);
      } catch (err: any) {
        await recordLog('WHATSAPP', whatsAppProvider.name, event.recipientPhone, {
          success: false,
          provider: whatsAppProvider.name,
          status: 'FAILED',
          error: err.message || 'WhatsApp provider exception',
        });
      }
    }

    return { inAppId: notifId, logs: results };
  }

  /**
   * Retrieves in-app notifications with strict IDOR and role tenancy checks.
   */
  async getNotifications(
    requestingUser: { id: string; role: string },
    options: { limit?: number; offset?: number; unreadOnly?: boolean; role?: string } = {}
  ) {
    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    let sql = 'SELECT * FROM notifications WHERE ';
    const params: any[] = [];

    // Tenancy isolation: Customers can strictly only view their own user notifications
    if (requestingUser.role === 'CUSTOMER') {
      params.push(requestingUser.id);
      sql += `user_id = $${params.length}`;
    } else if (requestingUser.role === 'RETAILER') {
      // Retailer views their own user alerts or unassigned general retailer broadcasts
      params.push(requestingUser.id);
      sql += `(user_id = $${params.length} OR (user_id IS NULL AND role = 'RETAILER'))`;
    } else if (requestingUser.role === 'DISTRIBUTOR') {
      // Distributor views their own user alerts or unassigned general distributor broadcasts
      params.push(requestingUser.id);
      sql += `(user_id = $${params.length} OR (user_id IS NULL AND role = 'DISTRIBUTOR'))`;
    } else if (requestingUser.role === 'ADMIN') {
      // Admin can view all notifications, or filter by requested role
      if (options.role) {
        params.push(options.role);
        sql += `role = $${params.length}`;
      } else {
        sql += '1=1';
      }
    } else {
      params.push(requestingUser.id);
      sql += `user_id = $${params.length}`;
    }

    if (options.unreadOnly) {
      sql += ' AND is_read = FALSE';
    }

    sql += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const res = await db.query(sql, params);

    const notifications = res.rows.map((n) => ({
      id: n.id,
      userId: n.user_id,
      role: n.role,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      linkActionUrl: n.link_action_url,
      entityType: n.entity_type,
      entityId: n.entity_id,
      readAt: n.read_at,
      metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {},
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    return notifications;
  }

  /**
   * Fast unread notification count scoped strictly to user.
   */
  async getUnreadCount(requestingUser: { id: string; role: string }): Promise<number> {
    let sql = 'SELECT COUNT(*) AS count FROM notifications WHERE is_read = FALSE AND ';
    const params: any[] = [];

    if (requestingUser.role === 'CUSTOMER') {
      params.push(requestingUser.id);
      sql += `user_id = $${params.length}`;
    } else if (requestingUser.role === 'RETAILER') {
      params.push(requestingUser.id);
      sql += `(user_id = $${params.length} OR (user_id IS NULL AND role = 'RETAILER'))`;
    } else if (requestingUser.role === 'DISTRIBUTOR') {
      params.push(requestingUser.id);
      sql += `(user_id = $${params.length} OR (user_id IS NULL AND role = 'DISTRIBUTOR'))`;
    } else {
      params.push(requestingUser.id);
      sql += `user_id = $${params.length}`;
    }

    const res = await db.query<{ count: string }>(sql, params);
    return parseInt(res.rows[0]?.count || '0', 10);
  }

  /**
   * Marks a single notification as read with strict IDOR verification.
   */
  async markAsRead(notificationId: string, requestingUser: { id: string; role: string }) {
    const existingRes = await db.query('SELECT user_id, role FROM notifications WHERE id = $1', [
      notificationId,
    ]);

    if (existingRes.rows.length === 0) {
      const err: any = new Error(`Notification '${notificationId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const n = existingRes.rows[0];

    // IDOR Protection
    if (requestingUser.role === 'CUSTOMER' && n.user_id !== requestingUser.id) {
      const err: any = new Error('Access denied: You cannot mark another user’s notification as read.');
      err.statusCode = 403;
      throw err;
    }

    if (requestingUser.role === 'RETAILER' && n.user_id && n.user_id !== requestingUser.id) {
      const err: any = new Error('Access denied: Unauthorized access to partner notification.');
      err.statusCode = 403;
      throw err;
    }

    if (requestingUser.role === 'DISTRIBUTOR' && n.user_id && n.user_id !== requestingUser.id) {
      const err: any = new Error('Access denied: Unauthorized access to distributor notification.');
      err.statusCode = 403;
      throw err;
    }

    await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = NOW() WHERE id = $1',
      [notificationId]
    );

    return { success: true, notificationId };
  }

  /**
   * Marks all notifications as read for the requesting user.
   */
  async markAllAsRead(requestingUser: { id: string; role: string }) {
    let sql = 'UPDATE notifications SET is_read = TRUE, read_at = NOW(), updated_at = NOW() WHERE is_read = FALSE AND ';
    const params: any[] = [];

    if (requestingUser.role === 'CUSTOMER') {
      params.push(requestingUser.id);
      sql += `user_id = $${params.length}`;
    } else if (requestingUser.role === 'RETAILER') {
      params.push(requestingUser.id);
      sql += `(user_id = $${params.length} OR (user_id IS NULL AND role = 'RETAILER'))`;
    } else if (requestingUser.role === 'DISTRIBUTOR') {
      params.push(requestingUser.id);
      sql += `(user_id = $${params.length} OR (user_id IS NULL AND role = 'DISTRIBUTOR'))`;
    } else {
      params.push(requestingUser.id);
      sql += `user_id = $${params.length}`;
    }

    await db.query(sql, params);
    return { success: true };
  }

  /**
   * Retrieves channel preferences for a user.
   */
  async getUserPreferences(userId: string): Promise<UserChannelPreferences> {
    const res = await db.query(
      'SELECT channel, is_enabled FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    const prefs: UserChannelPreferences = {
      userId,
      inApp: true,
      email: true,
      sms: true,
      whatsapp: true,
    };

    for (const row of res.rows) {
      if (row.channel === 'IN_APP') prefs.inApp = row.is_enabled;
      if (row.channel === 'EMAIL') prefs.email = row.is_enabled;
      if (row.channel === 'SMS') prefs.sms = row.is_enabled;
      if (row.channel === 'WHATSAPP') prefs.whatsapp = row.is_enabled;
    }

    return prefs;
  }

  /**
   * Updates user channel preferences with server-side validation.
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<Omit<UserChannelPreferences, 'userId'>>
  ): Promise<UserChannelPreferences> {
    const channels: Array<{ channel: NotificationChannel; val?: boolean }> = [
      { channel: 'IN_APP', val: updates.inApp },
      { channel: 'EMAIL', val: updates.email },
      { channel: 'SMS', val: updates.sms },
      { channel: 'WHATSAPP', val: updates.whatsapp },
    ];

    for (const c of channels) {
      if (c.val !== undefined) {
        await db.query(
          `INSERT INTO notification_preferences (id, user_id, channel, event_category, is_enabled, updated_at)
           VALUES ($1, $2, $3, 'ALL', $4, NOW())
           ON CONFLICT (user_id, channel, event_category)
           DO UPDATE SET is_enabled = $4, updated_at = NOW()`,
          [`pref-${userId}-${c.channel}`, userId, c.channel, c.val]
        );
      }
    }

    return this.getUserPreferences(userId);
  }

  /**
   * Retries delivery of a failed notification log.
   */
  async retryNotification(logId: string) {
    let logRes = await db.query('SELECT * FROM notification_logs WHERE id = $1', [logId]);
    if (logRes.rows.length === 0) {
      logRes = await db.query(
        "SELECT * FROM notification_logs WHERE notification_id = $1 ORDER BY created_at DESC LIMIT 1",
        [logId]
      );
    }
    if (logRes.rows.length === 0) {
      const err: any = new Error(`Notification log '${logId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const log = logRes.rows[0];
    const notifRes = await db.query('SELECT * FROM notifications WHERE id = $1', [log.notification_id]);
    const notif = notifRes.rows[0] || {};

    let sendRes: ProviderSendResult;

    if (log.channel === 'EMAIL') {
      const provider = getEmailProvider();
      sendRes = await provider.sendEmail({
        to: log.recipient,
        subject: notif.title || 'ElectraKart Update',
        textBody: notif.message || '',
        htmlBody: `<p>${notif.message || ''}</p>`,
        eventType: notif.type || 'ORDER_CONFIRMED',
      });
    } else if (log.channel === 'SMS') {
      const provider = getSmsProvider();
      sendRes = await provider.sendSms({
        to: log.recipient,
        message: notif.message || '',
        eventType: notif.type || 'ORDER_CONFIRMED',
      });
    } else if (log.channel === 'WHATSAPP') {
      const provider = getWhatsAppProvider();
      sendRes = await provider.sendWhatsApp({
        to: log.recipient,
        templateName: 'general_notification',
        messageText: notif.message || '',
        eventType: notif.type || 'ORDER_CONFIRMED',
      });
    } else {
      sendRes = { success: true, provider: 'in_app', status: 'DELIVERED' };
    }

    await db.query(
      `UPDATE notification_logs
       SET status = $1, attempt_count = attempt_count + 1, last_error = $2,
           provider_message_id = COALESCE($3, provider_message_id),
           sent_at = CASE WHEN $4 = TRUE THEN NOW() ELSE sent_at END,
           updated_at = NOW()
       WHERE id = $5`,
      [sendRes.status, sendRes.error || null, sendRes.providerMessageId || null, sendRes.success, logId]
    );

    return {
      logId,
      success: sendRes.success,
      status: sendRes.status,
      attemptCount: log.attempt_count + 1,
    };
  }

  /**
   * Processes incoming delivery receipt webhooks with cryptographic HMAC verification and idempotency.
   */
  async handleWebhook(
    channel: NotificationChannel,
    payload: any,
    rawBody: string,
    signatureHeader?: string
  ): Promise<{ status: string; providerMessageId?: string; isDuplicate: boolean }> {
    // 1. Webhook Signature Verification
    let secret = '';
    if (channel === 'EMAIL') secret = config.emailWebhookSecret;
    if (channel === 'SMS') secret = config.smsWebhookSecret;
    if (channel === 'WHATSAPP') secret = config.whatsappWebhookSecret;

    if (secret) {
      if (!signatureHeader) {
        const err: any = new Error(`Missing required webhook signature header for ${channel}`);
        err.statusCode = 401;
        throw err;
      }

      const expectedSig1 = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const expectedSig2 = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim();

      const isValid =
        (cleanHeader.length === expectedSig1.length &&
          crypto.timingSafeEqual(Buffer.from(cleanHeader), Buffer.from(expectedSig1))) ||
        (cleanHeader.length === expectedSig2.length &&
          crypto.timingSafeEqual(Buffer.from(cleanHeader), Buffer.from(expectedSig2)));

      if (!isValid) {
        const err: any = new Error(`Invalid webhook signature for ${channel}`);
        err.statusCode = 403;
        throw err;
      }
    }

    // 2. Extract provider message ID & normalized delivery status
    const providerMessageId = payload.providerMessageId || payload.messageId || payload.id;
    const incomingStatus = (payload.status || 'DELIVERED').toUpperCase();

    if (!providerMessageId) {
      return { status: 'IGNORED', isDuplicate: false };
    }

    // 3. Idempotency Check: Don't re-process already finalized receipt
    const existingRes = await db.query(
      'SELECT id, status FROM notification_logs WHERE provider_message_id = $1 LIMIT 1',
      [providerMessageId]
    );

    if (existingRes.rows.length === 0) {
      return { status: 'NOT_FOUND', providerMessageId, isDuplicate: false };
    }

    const existingLog = existingRes.rows[0];
    if (existingLog.status === 'DELIVERED' && incomingStatus === 'DELIVERED') {
      return { status: 'ALREADY_DELIVERED', providerMessageId, isDuplicate: true };
    }

    // 4. Update status in delivery logs
    const normalizedStatus =
      incomingStatus === 'DELIVERED'
        ? 'DELIVERED'
        : incomingStatus === 'READ'
        ? 'READ'
        : incomingStatus === 'FAILED'
        ? 'FAILED'
        : 'SENT';

    await db.query(
      `UPDATE notification_logs
       SET status = $1::varchar,
           delivered_at = CASE WHEN $1::varchar IN ('DELIVERED', 'READ') THEN NOW() ELSE delivered_at END,
           updated_at = NOW()
       WHERE id = $2`,
      [normalizedStatus, existingLog.id]
    );

    return { status: normalizedStatus, providerMessageId, isDuplicate: false };
  }

  /**
   * Dispatches a LOW_STOCK_ALERT to partner/admin with anti-spam cooldown protection.
   * If an alert was already triggered for the same SKU and user within the cooldown window (default 60 mins),
   * the duplicate alert is suppressed.
   */
  async publishLowStockAlert(params: {
    partnerId: string;
    partnerRole?: 'RETAILER' | 'DISTRIBUTOR' | 'ADMIN';
    skuId: string;
    skuCode: string;
    productName: string;
    currentStock: number;
    threshold?: number;
    recipientEmail?: string;
    recipientPhone?: string;
    cooldownMinutes?: number;
  }): Promise<{ dispatched: boolean; reason?: string; notification?: any }> {
    const cooldownMins = params.cooldownMinutes ?? 60;

    // Check if alert was recently sent
    const recentRes = await db.query(
      `SELECT id, created_at FROM notifications
       WHERE entity_type = 'INVENTORY'
         AND entity_id = $1
         AND user_id = $2
         AND type = 'LOW_STOCK_ALERT'
         AND created_at > NOW() - ($3 || ' minutes')::interval
       LIMIT 1`,
      [params.skuCode, params.partnerId, cooldownMins]
    );

    if (recentRes.rows.length > 0) {
      return {
        dispatched: false,
        reason: `COOLDOWN_ACTIVE: Alert for SKU ${params.skuCode} was sent within the last ${cooldownMins} minutes.`,
      };
    }

    const threshold = params.threshold ?? 10;
    const result = await this.publishEvent({
      eventType: 'LOW_STOCK_ALERT',
      userId: params.partnerId,
      role: params.partnerRole || 'RETAILER',
      title: `Low Stock Warning: ${params.productName}`,
      message: `Stock level for ${params.productName} (${params.skuCode}) has dropped to ${params.currentStock} units (Threshold: ${threshold}). Please reorder immediately.`,
      entityType: 'INVENTORY',
      entityId: params.skuCode,
      linkActionUrl: `/partner/inventory`,
      recipientEmail: params.recipientEmail,
      recipientPhone: params.recipientPhone,
      metadata: {
        skuId: params.skuId,
        skuCode: params.skuCode,
        productName: params.productName,
        currentStock: params.currentStock,
        threshold,
      },
    });

    return { dispatched: true, notification: result };
  }
}

export const notificationService = new NotificationService();
