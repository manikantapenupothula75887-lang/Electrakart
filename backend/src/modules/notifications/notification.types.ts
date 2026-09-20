/**
 * ElectraKart Production Notification Architecture Types
 * Provider-independent event models, channel definitions, and provider interfaces.
 */

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';

export type NotificationEventType =
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PAYMENT_SUCCESS'
  | 'ORDER_PAYMENT_FAILED'
  | 'ORDER_CANCELLED'
  | 'ORDER_DISPATCHED'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_REFUNDED'
  | 'FULFILLMENT_ASSIGNED'
  | 'FULFILLMENT_ACCEPTED'
  | 'FULFILLMENT_PREPARING'
  | 'FULFILLMENT_PACKED'
  | 'FULFILLMENT_HANDOVER'
  | 'ESTIMATE_UPLOADED'
  | 'ESTIMATE_PROCESSED'
  | 'ESTIMATE_NEEDS_CLARIFICATION'
  | 'ESTIMATE_READY_FOR_QUOTE'
  | 'QUOTATION_CREATED'
  | 'QUOTATION_EXPIRING'
  | 'QUOTATION_EXPIRED'
  | 'LOW_STOCK_ALERT'
  | 'STOCK_TRANSFER_CREATED'
  | 'STOCK_TRANSFER_COMPLETED'
  | 'PARTNER_KYC_STATUS'
  | 'ADMIN_ALERT';

export interface NotificationEvent {
  eventType: NotificationEventType;
  userId?: string;
  role?: 'CUSTOMER' | 'RETAILER' | 'DISTRIBUTOR' | 'ADMIN';
  title: string;
  message: string;
  entityType?: 'ORDER' | 'FULFILLMENT' | 'ESTIMATE' | 'QUOTATION' | 'INVENTORY' | 'USER' | 'ADMIN';
  entityId?: string;
  linkActionUrl?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  metadata?: Record<string, any>;
  channels?: NotificationChannel[];
  isCriticalTransactional?: boolean; // Critical notifications bypass optional opt-outs
}

export interface ProviderSendResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  error?: string;
}

export interface EmailSendInput {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  eventType: NotificationEventType;
  metadata?: Record<string, any>;
}

export interface IEmailProvider {
  name: string;
  sendEmail(input: EmailSendInput): Promise<ProviderSendResult>;
}

export interface SmsSendInput {
  to: string;
  message: string; // Concise transactional SMS (<= 160 chars recommended)
  eventType: NotificationEventType;
  metadata?: Record<string, any>;
}

export interface ISmsProvider {
  name: string;
  sendSms(input: SmsSendInput): Promise<ProviderSendResult>;
}

export interface WhatsAppSendInput {
  to: string;
  templateName: string;
  templateParams?: Record<string, string>;
  messageText?: string;
  eventType: NotificationEventType;
  metadata?: Record<string, any>;
}

export interface IWhatsAppProvider {
  name: string;
  sendWhatsApp(input: WhatsAppSendInput): Promise<ProviderSendResult>;
}

export interface InAppNotificationRecord {
  id: string;
  userId: string;
  role: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkActionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationDeliveryLog {
  id: string;
  notificationId?: string | null;
  channel: NotificationChannel;
  provider: string;
  providerMessageId?: string | null;
  recipient: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  attemptCount: number;
  lastError?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserChannelPreferences {
  userId: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}
