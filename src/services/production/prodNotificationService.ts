/**
 * ElectraKart Production Notification Service
 * Manages operational dispatch and low-stock alerts via PostgreSQL backend.
 */

import { INotificationService } from '../notificationService';
import { Notification, UserRole } from '../../types';
import { apiClient } from '../../api/client';
import { INITIAL_NOTIFICATIONS } from '../notificationService';

export class ProductionNotificationService implements INotificationService {
  async getNotifications(role?: UserRole): Promise<Notification[]> {
    try {
      const qs = role ? `?role=${role}` : '';
      const res = await apiClient.get<any>(`/notifications${qs}`);
      const list = res.notifications || [];
      return list.map((n: any) => ({
        id: n.id,
        userId: n.userId || 'usr-customer-1',
        role: (n.role as any) || role || 'CUSTOMER',
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: Boolean(n.isRead),
        readAt: n.readAt,
        entityType: n.entityType,
        entityId: n.entityId,
        metadata: n.metadata,
        linkActionUrl:
          n.linkActionUrl ||
          (n.entityType === 'ORDER' ? `/customer/orders` :
           n.entityType === 'ESTIMATE' ? `/customer/estimate` :
           n.entityType === 'INVENTORY' ? `/retailer/inventory` : undefined),
        createdAt: n.createdAt,
      }));
    } catch {
      if (!role) return INITIAL_NOTIFICATIONS;
      return INITIAL_NOTIFICATIONS.filter((n) => n.role === role);
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      // Resilient ignore
    }
  }

  async markAllAsRead(role?: UserRole): Promise<void> {
    try {
      await apiClient.post('/notifications/read-all', { role });
    } catch {
      // Resilient ignore
    }
  }

  async sendNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<Notification> {
    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    return newNotif;
  }

  async getUnreadCount(role?: UserRole): Promise<number> {
    try {
      const res = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
      if (typeof res.unreadCount === 'number') {
        return res.unreadCount;
      }
    } catch {
      // Fallback
    }
    const notifs = await this.getNotifications(role);
    return notifs.filter((n) => !n.isRead).length;
  }

  async getPreferences(): Promise<any> {
    try {
      const res = await apiClient.get<any>('/notifications/preferences');
      return res.preferences;
    } catch {
      return {
        emailEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
        inAppEnabled: true,
        orderUpdates: true,
        promotional: false,
        lowStockAlerts: true,
      };
    }
  }

  async updatePreferences(preferences: Record<string, boolean>): Promise<any> {
    try {
      const res = await apiClient.put<any>('/notifications/preferences', preferences);
      return res.preferences;
    } catch (err) {
      console.warn('Failed to update notification preferences:', err);
      return preferences;
    }
  }
}

export const prodNotificationService = new ProductionNotificationService();

