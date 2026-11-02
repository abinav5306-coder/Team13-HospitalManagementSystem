import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getPatientNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  confirmNotificationTaken,
  snoozeNotification,
  sendTestReminder,
  clearTestNotifications
} from '../services/api';

const NotificationContext = createContext(null);

// Gentle Web Audio API synthesizer chime (no external audio files required)
function playGentleChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Second tone (G#5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    gain2.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Audio autoplay might be restricted before user interaction
  }
}

export function NotificationProvider({ children }) {
  const { patientUser, isPatientAuthenticated } = useAuth();
  const username = patientUser?.username || '';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeToast, setActiveToast] = useState(null);
  const [testModeOpen, setTestModeOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const seenDueIdsRef = useRef(new Set());
  const toastTimeoutRef = useRef(null);

  // Trigger browser notification if permission granted
  const showBrowserNotification = useCallback((title, body) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: 'med-reminder-' + Date.now()
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('Browser notification error:', err);
      }
    }
  }, []);

  // Request browser permission
  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setBrowserPermission(result);
        if (result === 'granted') {
          showBrowserNotification(
            'MedCare Reminders Enabled',
            'You will now receive timely medicine alerts on your device.'
          );
        }
        return result;
      } catch (e) {
        console.warn('Could not request notification permission:', e);
      }
    }
    return 'denied';
  };

  // Fetch notifications for current patient
  const fetchNotifications = useCallback(async (isBackground = false) => {
    if (!username) return;
    try {
      if (!isBackground) setLoading(true);
      const data = await getPatientNotifications(username);
      if (data && data.success) {
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(data.unreadCount || 0);
        setDueCount(data.dueCount || 0);

        // Check if there are newly Due notifications that haven't triggered a toast yet
        const newlyDue = notifs.filter(
          n => n.status === 'Due' && !n.is_read && !seenDueIdsRef.current.has(n.id)
        );

        if (newlyDue.length > 0) {
          const latest = newlyDue[0];
          seenDueIdsRef.current.add(latest.id);

          // Play gentle chime
          playGentleChime();

          // Show Toast popup
          setActiveToast(latest);
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            setActiveToast(null);
          }, 8000);

          // Show system browser notification
          showBrowserNotification(
            latest.notification_title,
            latest.notification_message
          );
        }
      }
    } catch (err) {
      console.error('Failed to load patient notifications:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [username, showBrowserNotification]);

  // Initial load and periodic polling every 20 seconds
  useEffect(() => {
    if (isPatientAuthenticated && username) {
      fetchNotifications(false);
      const interval = setInterval(() => {
        fetchNotifications(true);
      }, 20000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setDueCount(0);
      setActiveToast(null);
      seenDueIdsRef.current.clear();
    }
  }, [isPatientAuthenticated, username, fetchNotifications]);

  // Mark single notification as read
  const markRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  // Mark all notifications as read
  const markAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await markAllNotificationsRead(username);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // Handle Mark as Taken
  const handleTakeMedicine = async (notificationId) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, status: 'Confirmed Taken', is_read: true, taken_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      setDueCount(prev => Math.max(0, prev - 1));

      if (activeToast?.id === notificationId) {
        setActiveToast(null);
      }

      const res = await confirmNotificationTaken(notificationId);
      return res;
    } catch (err) {
      console.error('Error confirming taken from notification:', err);
      // Refresh to restore accurate state
      fetchNotifications(true);
      throw err;
    }
  };

  // Handle Remind Me Later (Snooze 10m or 15m)
  const handleSnooze = async (notificationId, snoozeMinutes = 10) => {
    try {
      const now = Date.now();
      const snoozeUntil = new Date(now + snoozeMinutes * 60 * 1000).toISOString();

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? {
                ...n,
                status: 'Snoozed',
                notification_type: 'Snoozed Reminder',
                snooze_until: snoozeUntil
              }
            : n
        )
      );
      setDueCount(prev => Math.max(0, prev - 1));

      if (activeToast?.id === notificationId) {
        setActiveToast(null);
      }

      const res = await snoozeNotification(notificationId, snoozeMinutes);
      return res;
    } catch (err) {
      console.error('Error snoozing reminder:', err);
      fetchNotifications(true);
      throw err;
    }
  };

  // Handle Triggering Test Reminder from Test Mode
  const handleSendTestReminder = async (testParams) => {
    try {
      const res = await sendTestReminder({
        ...testParams,
        patientUsername: username
      });

      if (res && res.success && res.notification) {
        const testNotif = res.notification;
        // Prepend to notifications state
        setNotifications(prev => [testNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
        if (testNotif.status === 'Due') {
          setDueCount(prev => prev + 1);
        }

        // Play gentle chime
        playGentleChime();

        // Show immediate active toast
        setActiveToast(testNotif);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 9000);

        // Show browser notification if granted
        showBrowserNotification(
          testNotif.notification_title,
          testNotif.notification_message
        );

        return testNotif;
      }
    } catch (err) {
      console.error('Error sending test reminder:', err);
      throw err;
    }
  };

  // Clear test notifications
  const handleClearTestReminders = async () => {
    try {
      setNotifications(prev => prev.filter(n => !n.is_test));
      await clearTestNotifications(username);
      fetchNotifications(true);
    } catch (err) {
      console.error('Error clearing test notifications:', err);
    }
  };

  const dismissToast = () => {
    setActiveToast(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        dueCount,
        loading,
        activeToast,
        dismissToast,
        testModeOpen,
        setTestModeOpen,
        browserPermission,
        requestBrowserPermission,
        markRead,
        markAllRead,
        handleTakeMedicine,
        handleSnooze,
        handleSendTestReminder,
        handleClearTestReminders,
        refreshNotifications: () => fetchNotifications(false),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      dueCount: 0,
      loading: false,
      activeToast: null,
      dismissToast: () => {},
      testModeOpen: false,
      setTestModeOpen: () => {},
      browserPermission: 'default',
      requestBrowserPermission: async () => 'default',
      markRead: async () => {},
      markAllRead: async () => {},
      handleTakeMedicine: async () => {},
      handleSnooze: async () => {},
      handleSendTestReminder: async () => {},
      handleClearTestReminders: async () => {},
      refreshNotifications: () => {}
    };
  }
  return context;
}
