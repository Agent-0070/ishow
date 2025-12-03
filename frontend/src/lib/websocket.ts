import { io, Socket } from 'socket.io-client';

class WebSocketClient {
  private socket: Socket | null = null;

  // Backward-compatible wrappers
  send(event: string, payload: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, payload);
    } else {
      console.warn('🔌 Cannot send: socket not connected', { event });
    }
  }
  on<T = any>(event: string, handler: (data: T) => void) {
    if (!this.socket) {
      console.warn('🔌 Cannot subscribe: socket not initialized', { event });
      return () => {};
    }
    this.socket.on(event, handler);
    return () => this.socket?.off(event, handler);
  }

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Join user room if authenticated
      const token = localStorage.getItem('auth-token');
      if (token) {
        this.socket?.emit('join', token);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🔌 Max reconnection attempts reached');
      }
    });

    // Event-specific listeners
    this.socket.on('eventUpdated', (event) => {
      console.log('📅 Event updated:', event);
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('eventUpdated', { detail: event }));
    });

    this.socket.on('eventCreated', (event) => {
      console.log('📅 New event created:', event);
      window.dispatchEvent(new CustomEvent('eventCreated', { detail: event }));
    });

    this.socket.on('eventDeleted', (eventId) => {
      console.log('📅 Event deleted:', eventId);
      window.dispatchEvent(new CustomEvent('eventDeleted', { detail: { eventId } }));
    });

    this.socket.on('bookingConfirmed', (booking) => {
      console.log('🎫 Booking confirmed:', booking);
      window.dispatchEvent(new CustomEvent('bookingConfirmed', { detail: booking }));
    });

    this.socket.on('bookingCancelled', (booking) => {
      console.log('🎫 Booking cancelled:', booking);
      window.dispatchEvent(new CustomEvent('bookingCancelled', { detail: booking }));
    });

    this.socket.on('newNotification', (notification) => {
      console.log('🔔 New notification:', notification);
      window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
    });

    // Chat messages
    this.socket.on('chatMessage', (message) => {
      console.log('💬 Chat message:', message);
      window.dispatchEvent(new CustomEvent('chatMessage', { detail: message }));
    });

    // User status updates
    this.socket.on('userStatusUpdate', (update) => {
      console.log('👤 User status update:', update);
      window.dispatchEvent(new CustomEvent('userStatusUpdate', { detail: update }));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket manually disconnected');
    }
  }

  // Send events
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('🔌 Cannot emit event: WebSocket not connected');
    }
  }

  // Join specific rooms
  joinRoom(roomId: string) {
    this.emit('joinRoom', roomId);
  }

  leaveRoom(roomId: string) {
    this.emit('leaveRoom', roomId);
  }

  // Chat functionality
  sendChatMessage(roomId: string, message: string) {
    this.emit('chatMessage', { roomId, message });
  }

  // Event-specific methods
  subscribeToEvent(eventId: string) {
    this.joinRoom(`event_${eventId}`);
  }

  unsubscribeFromEvent(eventId: string) {
    this.leaveRoom(`event_${eventId}`);
  }

  // Booking updates
  subscribeToBookingUpdates(userId: string) {
    this.joinRoom(`user_bookings_${userId}`);
  }

  // Get connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced usage)
  get socketInstance(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();

// Export class for testing or multiple instances if needed
export { WebSocketClient };

// Utility function to set up event listeners in components
export const useWebSocketEvent = (eventName: string, handler: (event: CustomEvent) => void) => {
  const eventHandler = (event: Event) => handler(event as CustomEvent);
  
  window.addEventListener(eventName, eventHandler);
  
  return () => {
    window.removeEventListener(eventName, eventHandler);
  };
};

export default wsClient;
