import { useState, useEffect, type FC } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { usePushNotifications } from '../lib/pushNotifications';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationCenterProps {
  className?: string;
}

export const NotificationSystem: FC<NotificationCenterProps> = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { requestPermission, isSupported, permission } = usePushNotifications();

  // Listen for new notification events
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      const { type, title, message } = event.detail;

      // Map notification types to toast types
      let toastType: Toast['type'] = 'info';
      if (type === 'payment_confirmed' || type === 'booking_confirmed') {
        toastType = 'success';
      } else if (type === 'payment_rejected' || type === 'event_cancelled') {
        toastType = 'error';
      } else if (type === 'event_postponed') {
        toastType = 'warning';
      }

      // Add toast notification
      addToast({
        type: toastType,
        title,
        message,
        duration: 6000 // Show for 6 seconds
      });
    };

    window.addEventListener('newNotification', handleNewNotification as EventListener);

    return () => {
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, []);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    setUnreadCount(prev => prev + 1);
    
    // Auto remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = "fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-notification border backdrop-blur-md z-notification";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-notification-success/90 border-notification-success text-white animate-toast-enter`;
      case 'error':
        return `${baseStyles} bg-notification-error/90 border-notification-error text-white animate-toast-enter`;
      case 'warning':
        return `${baseStyles} bg-notification-warning/90 border-notification-warning text-white animate-toast-enter`;
      case 'info':
      default:
        return `${baseStyles} bg-notification-info/90 border-notification-info text-white animate-toast-enter`;
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 animate-touch-feedback"
        >
          <span className={`text-xl ${unreadCount > 0 ? 'animate-bell-ring' : ''}`}>🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-notification-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-notification-bounce">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Notification Center Dropdown */}
      {isOpen && (
        <div className="fixed top-16 right-4 w-80 bg-glass-light backdrop-blur-md border-gray-300 rounded-lg shadow-glass-lg z-dropdown animate-slide-in-right">
          <div className="p-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {isSupported && permission === 'default' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const perm = await requestPermission();
                        if (perm === 'granted') {
                          addToast({ type: 'success', title: 'Push Notifications Enabled', message: 'You will receive real-time updates' });
                        } else if (perm === 'denied') {
                          addToast({ type: 'warning', title: 'Notifications Denied', message: 'You have denied notification permission' });
                        }
                      } catch (err) {
                        addToast({ type: 'error', title: 'Error', message: 'Failed to request notification permission' });
                      }
                    }}
                  >
                    Enable Notifications
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUnreadCount(0);
                    setIsOpen(false);
                  }}
                >
                  Mark all read
                </Button>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">We'll notify you when there are updates</p>
            </div>
          </div>
          
          <div className="p-4 border-t border-glass-border">
            <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
              View All Notifications
            </Button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-notification">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={getToastStyles(toast.type)}
            style={{ top: `${1 + index * 5}rem` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-lg">{getIcon(toast.type)}</span>
                <div>
                  <h4 className="font-medium text-sm">{toast.title}</h4>
                  <p className="text-xs mt-1 opacity-90">{toast.message}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeToast(toast.id)}
                className="text-white hover:bg-white/20 p-1 h-auto"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Push notification opt-in removed to avoid automatic UI prompt */}
    </>
  );
};

// Email notification component
export const EmailNotificationSettings: FC = () => {
  const [emailSettings, setEmailSettings] = useState({
    bookingConfirmations: true,
    paymentAlerts: true,
    systemUpdates: false,
    marketingEmails: false,
  });

  return (
    <div className="space-y-4 p-6 bg-glass-light backdrop-blur-md border-gray-300 rounded-lg">
      <h3 className="text-lg font-semibold">Email Notification Preferences</h3>
      
      {Object.entries(emailSettings).map(([key, value], index) => (
        <div 
          key={key}
          className="flex items-center justify-between p-3 bg-background/30 rounded-lg animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, [key]: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      ))}
    </div>
  );
};
