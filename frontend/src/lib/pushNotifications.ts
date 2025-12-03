// Push Notification Service
class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

  async initialize(): Promise<void> {
    try {
      // Skip service worker registration in development
      if (import.meta.env.DEV) {
        console.log('🔔 Skipping service worker registration in development');
        return;
      }

      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('🔔 Service Workers not supported');
        return;
      }

      // Check if push messaging is supported
      if (!('PushManager' in window)) {
        console.warn('🔔 Push messaging not supported');
        return;
      }

      // Register service worker
      await this.registerServiceWorker();

      console.log('🔔 Push notification service initialized');
    } catch (error) {
      console.error('🔔 Failed to initialize push notification service:', error);
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      // Register the service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('🔔 Service Worker registered successfully');

      // Listen for service worker updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔔 New service worker available');
              // Optionally notify user about update
              this.notifyAboutUpdate();
            }
          });
        }
      });

    } catch (error) {
      console.error('🔔 Service Worker registration failed:', error);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        console.warn('🔔 This browser does not support notifications');
        return 'denied';
      }

      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        console.log('🔔 Notification permission granted');
        // Subscribe to push notifications if we have a service worker
        await this.subscribeToPush();
      } else {
        console.warn('🔔 Notification permission denied');
      }

      return permission;
    } catch (error) {
      console.error('🔔 Error requesting notification permission:', error);
      return 'denied';
    }
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      if (!this.swRegistration) {
        console.warn('🔔 No service worker registration available');
        return null;
      }

      // Check if already subscribed
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Convert VAPID key - use ArrayBuffer instead of Uint8Array for compatibility
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        
        // Subscribe to push notifications
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any // Cast to any to handle type compatibility
        });

        console.log('🔔 Push subscription created');
        
        // Send subscription to server
        await this.sendSubscriptionToServer(subscription);
      }

      return subscription;
    } catch (error) {
      console.error('🔔 Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.warn('🔔 No auth token available for push subscription');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (response.ok) {
        console.log('🔔 Push subscription sent to server');
      } else {
        console.error('🔔 Failed to send push subscription to server');
      }
    } catch (error) {
      console.error('🔔 Error sending subscription to server:', error);
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        return false;
      }

      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        const successful = await subscription.unsubscribe();
        if (successful) {
          console.log('🔔 Successfully unsubscribed from push notifications');
          // Notify server about unsubscription
          await this.removeSubscriptionFromServer(subscription);
        }
        return successful;
      }
      return false;
    } catch (error) {
      console.error('🔔 Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return;

      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });
    } catch (error) {
      console.error('🔔 Error removing subscription from server:', error);
    }
  }

  // Show local notification
  showNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      if (this.swRegistration) {
        // Use service worker to show notification
        this.swRegistration.showNotification(title, {
          icon: '/placeholder.svg',
          badge: '/placeholder.svg',
          ...options
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          icon: '/placeholder.svg',
          ...options
        });
      }
    }
  }

  // Handle notification click
  private notifyAboutUpdate(): void {
    this.showNotification('App Updated', {
      body: 'A new version of the app is available. Refresh to update.',
      tag: 'app-update',
      requireInteraction: true
    });
  }

  // Utility function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if notifications are supported
  get isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get current permission status
  get permission(): NotificationPermission {
    return Notification.permission;
  }

  // Check if currently subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.swRegistration) return false;
      const subscription = await this.swRegistration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  }

  // Test notification
  async testNotification(): Promise<void> {
    if (this.permission === 'granted') {
      this.showNotification('Test Notification', {
        body: 'This is a test notification from IM-Host!',
        icon: '/placeholder.svg',
        tag: 'test-notification'
      });
    } else {
      console.warn('🔔 Cannot show test notification: permission not granted');
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export class for testing or multiple instances if needed
export { PushNotificationService };

// Utility hooks for React components
export const usePushNotifications = () => {
  const requestPermission = () => pushNotificationService.requestPermission();
  const showNotification = (title: string, options?: NotificationOptions) => 
    pushNotificationService.showNotification(title, options);
  const testNotification = () => pushNotificationService.testNotification();
  
  return {
    requestPermission,
    showNotification,
    testNotification,
    isSupported: pushNotificationService.isSupported,
    permission: pushNotificationService.permission
  };
};

export default pushNotificationService;
