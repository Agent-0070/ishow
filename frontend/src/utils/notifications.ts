/**
 * Utility functions for managing notifications
 */

// Trigger a refresh of notifications
export const triggerNotificationRefresh = () => {
  window.dispatchEvent(new CustomEvent('refreshNotifications'));
};

// Add a new notification (for real-time updates)
export const addNotification = (notification: {
  type: string;
  title: string;
  message: string;
  bookingId?: string;
  eventId?: string;
  userId?: string;
  metadata?: any;
}) => {
  window.dispatchEvent(new CustomEvent('newNotification', {
    detail: notification
  }));
};

// Clear all notifications
export const clearAllNotifications = () => {
  window.dispatchEvent(new CustomEvent('clearAllNotifications'));
};

// Show a toast notification
export const showToastNotification = (notification: {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}) => {
  window.dispatchEvent(new CustomEvent('showToast', {
    detail: notification
  }));
};
