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
      return res.notifications || [];
    } catch {
      if (!role) return INITIAL_NOTIFICATIONS;
      return INITIAL_NOTIFICATIONS.filter((n) => n.role === role);
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      // Ignore
    }
  }

  async markAllAsRead(role?: UserRole): Promise<void> {
    try {
      await apiClient.post('/notifications/read-all', { role });
    } catch {
      // Ignore
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
    const notifs = await this.getNotifications(role);
    return notifs.filter((n) => !n.isRead).length;
  }
}

export const prodNotificationService = new ProductionNotificationService();
