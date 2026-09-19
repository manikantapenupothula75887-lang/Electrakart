/**
 * ElectraKart Notification Service
 * Manages operational alerts, order status notifications,
 * low-stock warnings, and KYC review events across all roles.
 */

import { Notification, UserRole } from '../types';

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    userId: 'usr-customer-1',
    role: 'CUSTOMER',
    title: 'Order EK-10025 Dispatched',
    message: 'Part 1 of your order has been dispatched from Vijayawada Electricals with OTP 4821.',
    type: 'ORDER_UPDATE',
    isRead: false,
    linkActionUrl: '/orders/ord-10025',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    userId: 'usr-retailer-1',
    role: 'RETAILER',
    title: 'New Order Received',
    message: 'You have a new fulfillment allocation for 3 coils Polycab 2.5 sq.mm FR wire.',
    type: 'ORDER_UPDATE',
    isRead: false,
    linkActionUrl: '/retailer',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    userId: 'usr-retailer-1',
    role: 'RETAILER',
    title: 'Low Stock Alert',
    message: 'Anchor Roma 6M Switch Plate stock is below reorder threshold (4 remaining).',
    type: 'INVENTORY_LOW',
    isRead: true,
    linkActionUrl: '/retailer',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-4',
    userId: 'usr-admin-1',
    role: 'ADMIN',
    title: 'Partner Onboarding Pending',
    message: 'Krishna Power & Cables Mart (Vijayawada) submitted GST documentation for verification.',
    type: 'KYC_STATUS',
    isRead: false,
    linkActionUrl: '/admin',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

export interface INotificationService {
  getNotifications(role?: UserRole): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(role?: UserRole): Promise<void>;
  sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>;
  getUnreadCount(role?: UserRole): Promise<number>;
}

class DemoNotificationService implements INotificationService {
  private readonly STORAGE_KEY = 'electrakart_notifications';

  private loadNotifications(): Notification[] {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  }

  private saveNotifications(notifs: Notification[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifs));
  }

  async getNotifications(role?: UserRole): Promise<Notification[]> {
    const notifs = this.loadNotifications();
    if (!role) return notifs;
    return notifs.filter((n) => n.role === role);
  }

  async markAsRead(id: string): Promise<void> {
    const notifs = this.loadNotifications();
    const target = notifs.find((n) => n.id === id);
    if (target) {
      target.isRead = true;
      this.saveNotifications(notifs);
    }
  }

  async markAllAsRead(role?: UserRole): Promise<void> {
    const notifs = this.loadNotifications();
    notifs.forEach((n) => {
      if (!role || n.role === role) {
        n.isRead = true;
      }
    });
    this.saveNotifications(notifs);
  }

  async sendNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<Notification> {
    const notifs = this.loadNotifications();
    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNotif, ...notifs];
    this.saveNotifications(updated);
    return newNotif;
  }

  async getUnreadCount(role?: UserRole): Promise<number> {
    const notifs = await this.getNotifications(role);
    return notifs.filter((n) => !n.isRead).length;
  }
}

export const notificationService: INotificationService = new DemoNotificationService();
