import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Package,
  Truck,
  IndianRupee,
  FileText,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Settings,
  X,
  Smartphone,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Notification, UserRole } from '../../types';
import { notificationService } from '../../services';

interface NotificationBellProps {
  role?: UserRole;
  variant?: 'light' | 'dark';
  align?: 'left' | 'right';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  role,
  variant = 'light',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<any>({
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    orderUpdates: true,
    lowStockAlerts: true,
    promotional: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [list, count] = await Promise.all([
        notificationService.getNotifications(role),
        notificationService.getUnreadCount(role),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      if ((notificationService as any).getPreferences) {
        const prefs = await (notificationService as any).getPreferences();
        if (prefs) setPreferences(prefs);
      }
    } catch (err) {
      console.warn('Failed to load notification preferences:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();

    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [role]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPreferences(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(role);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleItemClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.linkActionUrl) {
      navigate(notif.linkActionUrl);
    }
  };

  const handleSavePreference = async (key: string, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    if ((notificationService as any).updatePreferences) {
      setSavingPrefs(true);
      try {
        await (notificationService as any).updatePreferences(updated);
      } catch (err) {
        console.error('Failed to update preference:', err);
      } finally {
        setSavingPrefs(false);
      }
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ORDER_PLACED':
      case 'ORDER_CONFIRMED':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'ORDER_DISPATCHED':
      case 'FULFILLMENT_ASSIGNED':
      case 'FULFILLMENT_PACKED':
        return <Truck className="w-4 h-4 text-amber-500" />;
      case 'ORDER_DELIVERED':
      case 'ORDER_PAYMENT_SUCCESS':
        return <IndianRupee className="w-4 h-4 text-emerald-500" />;
      case 'ESTIMATE_PROCESSED':
      case 'ESTIMATE_NEEDS_CLARIFICATION':
      case 'QUOTATION_CREATED':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'INVENTORY_LOW':
      case 'ORDER_CANCELLED':
      case 'ORDER_PAYMENT_FAILED':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const isDark = variant === 'dark';

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className={`relative flex items-center justify-center p-2 rounded-xl transition-colors ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
        }`}
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full ring-2 ring-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div
            className={`px-4 py-3 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 hover:text-amber-400 hover:underline"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className={`p-1 rounded-lg transition-colors ${
                  showPreferences
                    ? 'bg-amber-500/20 text-amber-500'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Channel Preferences"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preferences Subpanel (Toggleable) */}
          {showPreferences && (
            <div
              className={`p-3 border-b text-xs ${
                isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-amber-50/50'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-2 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-amber-500" /> Channel Preferences
                </span>
                {savingPrefs && <span className="text-[10px] text-amber-500 animate-pulse">Saving...</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.inAppEnabled ?? true}
                    onChange={(e) => handleSavePreference('inAppEnabled', e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="flex items-center gap-1"><Bell className="w-3 h-3 text-slate-400" /> In-App</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.smsEnabled ?? true}
                    onChange={(e) => handleSavePreference('smsEnabled', e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-slate-400" /> SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled ?? true}
                    onChange={(e) => handleSavePreference('emailEnabled', e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.whatsappEnabled ?? true}
                    onChange={(e) => handleSavePreference('whatsappEnabled', e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-slate-400" /> WhatsApp</span>
                </label>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold">No notifications yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Updates about orders, estimates, and dispatches will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    !notif.isRead
                      ? isDark
                        ? 'bg-slate-800/40 hover:bg-slate-800'
                        : 'bg-amber-50/30 hover:bg-amber-50/80'
                      : isDark
                      ? 'hover:bg-slate-800/30'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          !notif.isRead ? 'font-bold' : 'font-medium'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.linkActionUrl && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 mt-1.5 hover:underline">
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-500/20 shrink-0 mt-1.5"
                      title="Mark as read"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className={`px-4 py-2 border-t text-center text-[10px] font-medium ${
              isDark ? 'border-slate-800 bg-slate-950 text-slate-500' : 'border-slate-100 bg-slate-50 text-slate-400'
            }`}
          >
            Real-time Operational Dispatch & Alert Network
          </div>
        </div>
      )}
    </div>
  );
};
