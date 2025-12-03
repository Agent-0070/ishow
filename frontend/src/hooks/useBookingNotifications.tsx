import { useState, useEffect, useCallback, type ReactElement } from 'react';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Ban,
  Heart,
  HeartCrack,
  FileText,
  DollarSign,
  CreditCard,
  MessageSquare,
  Ticket
} from 'lucide-react';
import { notificationsAPI, createSocketConnection } from '../lib/api';

export interface BookingNotification {
  id: string;
  _id?: string;
  type: 'booking_confirmed' | 'booking_cancelled' | 'event_updated' | 'refund_processed' | 'payment_reminder' | 'event_postponed' | 'event_cancelled' | 'payment_confirmed' | 'payment_rejected' | 'payment_receipt' | 'ticket_generated';
  title: string;
  message: string;
  timestamp: Date;
  createdAt?: string;
  read: boolean;
  bookingId?: string;
  eventId?: string;
  userId?: string;
  data?: any;
  metadata?: {
    refundAmount?: number;
    newDate?: string;
    newLocation?: string;
    paymentDue?: Date;
  };
}

export const useBookingNotifications = () => {
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addNotification = useCallback((notification: Omit<BookingNotification, 'id' | 'timestamp'>) => {
    const newNotification: BookingNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Fetch real notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await notificationsAPI.getNotifications();
        const apiNotifications: BookingNotification[] = (response.data || [])
          .filter((notification: any) => notification && notification._id) // Filter out invalid notifications
          .map((notification: any) => ({
              id: notification._id,
              _id: notification._id,
              type: notification.type || 'booking_confirmed', // Default type if missing
              title: notification.title || 'Notification',
              message: notification.message || 'You have a new notification',
              timestamp: new Date(notification.createdAt || Date.now()),
              createdAt: notification.createdAt,
              read: notification.read || false,
              data: notification.data || {},
              eventId: notification.data?.eventId,
              bookingId: notification.data?.bookingId,
              userId: notification.user,
              metadata: notification.data?.metadata || {},
            }));

        setNotifications(apiNotifications);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }

    // Set up real-time socket connection for instant notifications
    const initializeSocket = () => {
      const token = localStorage.getItem('auth-token');
      if (!token) return;

      const socket = createSocketConnection();

      socket.on('connect', () => {
        console.log('🔔 Real-time notifications connected');
        socket.emit('user:join', { token });
      });

      socket.on('newNotification', (notification: any) => {
        console.log('🔔 Real-time notification received:', notification);

        // Add the new notification to the list
        const newNotification: BookingNotification = {
          id: notification._id || Date.now().toString(),
          _id: notification._id,
          type: notification.type || 'booking_confirmed',
          title: notification.title || 'New Notification',
          message: notification.message || 'You have a new notification',
          timestamp: new Date(notification.createdAt || Date.now()),
          createdAt: notification.createdAt,
          read: false,
          data: notification.data || {},
          eventId: notification.data?.eventId,
          bookingId: notification.data?.bookingId,
          userId: notification.user,
          metadata: notification.data?.metadata || {},
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Trigger browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/favicon.svg',
            tag: newNotification.id,
          });
        }

        // Trigger custom event for toast notifications
        window.dispatchEvent(new CustomEvent('newNotification', {
          detail: {
            type: newNotification.type,
            title: newNotification.title,
            message: newNotification.message,
            eventId: newNotification.eventId,
            metadata: newNotification.metadata,
          }
        }));
      });

      socket.on('disconnect', () => {
        console.log('🔔 Real-time notifications disconnected');
      });

      // Note: we don't currently persist the socket reference here; if needed,
      // consider returning it or storing in a ref for cleanup.
    };

    // Initialize real-time connection
    initializeSocket();

    // Fallback polling every 2 minutes (reduced from 30 seconds since we have real-time)
    const pollInterval = setInterval(fetchNotifications, 120000);

    // Listen for new booking notifications from the EventContext
    const handleNewNotification = (event: CustomEvent) => {
      const notificationData = event.detail;
      addNotification({
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        read: false,
        bookingId: notificationData.bookingId,
        eventId: notificationData.eventId,
        userId: notificationData.userId,
        metadata: notificationData.metadata
      });
    };

    // Listen for clear all notifications event
    const handleClearAllNotifications = () => {
      setNotifications([]);
    };

    // Listen for refresh notifications event
    const handleRefreshNotifications = () => {
      fetchNotifications();
    };

    // Listen for both old and new notification event names
    window.addEventListener('newBookingNotification', handleNewNotification as EventListener);
    window.addEventListener('newNotification', handleNewNotification as EventListener);
    window.addEventListener('clearAllNotifications', handleClearAllNotifications as EventListener);
    window.addEventListener('refreshNotifications', handleRefreshNotifications as EventListener);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('newBookingNotification', handleNewNotification as EventListener);
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
      window.removeEventListener('clearAllNotifications', handleClearAllNotifications as EventListener);
      window.removeEventListener('refreshNotifications', handleRefreshNotifications as EventListener);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      console.log('🗑️ Frontend: Attempting to delete notification:', {
        id,
        idType: typeof id,
        idLength: id?.length
      });

      await notificationsAPI.deleteNotification(id);

      console.log('✅ Frontend: Notification deleted successfully:', id);
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
    } catch (error) {
      const err: any = error;
      const errData = err?.response?.data ?? err?.message ?? String(err);
      const status = err?.response?.status;
      console.error('❌ Frontend: Failed to delete notification:', {
        id,
        error: errData,
        status
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationsByType = (type: BookingNotification['type']) => {
    return notifications.filter(n => n.type === type);
  };

  const refreshNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await notificationsAPI.getNotifications();
      const apiNotifications: BookingNotification[] = (response.data || [])
        .filter((notification: any) => notification && notification._id) // Filter out invalid notifications
        .map((notification: any) => ({
          id: notification._id,
          _id: notification._id,
          type: notification.type || 'booking_confirmed', // Default type if missing
          title: notification.title || 'Notification',
          message: notification.message || 'You have a new notification',
          timestamp: new Date(notification.createdAt || Date.now()),
          createdAt: notification.createdAt,
          read: notification.read || false,
          data: notification.data || {},
          eventId: notification.data?.eventId,
          bookingId: notification.data?.bookingId,
          userId: notification.user,
        }));

      setNotifications(apiNotifications);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    getNotificationsByType,
    refreshNotifications
  };
};

export const getNotificationIcon = (type: BookingNotification['type']): ReactElement => {
  const iconClass = "h-5 w-5 rounded-full p-1 backdrop-blur-sm border border-opacity-30 shadow-sm";

  switch (type) {
    case 'booking_confirmed':
      return <CheckCircle className={`${iconClass} text-green-600 bg-green-50 border-green-200`} />;
    case 'booking_cancelled':
      return <XCircle className={`${iconClass} text-red-600 bg-red-50 border-red-200`} />;
    case 'event_updated':
      return <Calendar className={`${iconClass} text-blue-600 bg-blue-50 border-blue-200`} />;
    case 'event_postponed':
      return <Clock className={`${iconClass} text-orange-600 bg-orange-50 border-orange-200`} />;
    case 'event_cancelled':
      return <Ban className={`${iconClass} text-red-600 bg-red-50 border-red-200`} />;
    case 'payment_confirmed':
      return <Heart className={`${iconClass} text-green-600 bg-green-50 border-green-200`} />;
    case 'payment_rejected':
      return <HeartCrack className={`${iconClass} text-red-600 bg-red-50 border-red-200`} />;
    case 'payment_receipt':
      return <FileText className={`${iconClass} text-purple-600 bg-purple-50 border-purple-200`} />;
    case 'refund_processed':
      return <DollarSign className={`${iconClass} text-green-600 bg-green-50 border-green-200`} />;
    case 'payment_reminder':
      return <CreditCard className={`${iconClass} text-yellow-600 bg-yellow-50 border-yellow-200`} />;
    case 'ticket_generated':
      return <Ticket className={`${iconClass} text-purple-600 bg-purple-50 border-purple-200`} />;
    default:
      return <MessageSquare className={`${iconClass} text-blue-600 bg-blue-50 border-blue-200`} />;
  }
};

export const getNotificationColor = (type: BookingNotification['type']): string => {
  switch (type) {
    case 'booking_confirmed': return 'text-green-600';
    case 'booking_cancelled': return 'text-red-600';
    case 'event_updated': return 'text-blue-600';
    case 'event_postponed': return 'text-yellow-600';
    case 'event_cancelled': return 'text-red-600';
    case 'payment_confirmed': return 'text-green-600';
    case 'payment_rejected': return 'text-red-600';
    case 'payment_receipt': return 'text-blue-600';
    case 'refund_processed': return 'text-green-600';
    case 'payment_reminder': return 'text-orange-600';
    default: return 'text-gray-600';
  }
};
