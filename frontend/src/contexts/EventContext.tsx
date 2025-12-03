import { createContext, useContext, useState, useEffect, type ReactNode, type FC } from 'react';
import type { Socket } from 'socket.io-client';
import {
  authAPI,
  eventsAPI,
  usersAPI,
  bookingsAPI,
  notificationsAPI,
  createSocketConnection
} from '../lib/api';
import { toast } from '../hooks/use-toast';


// Normalize user object to ensure arrays exist
const withUserDefaults = (u: any) => u ? {
  ...u,
  createdEvents: Array.isArray(u.createdEvents) ? u.createdEvents : [],
  bookedEvents: Array.isArray(u.bookedEvents) ? u.bookedEvents : [],
} : null;

// Normalize event shape returned by server so frontend has consistent fields
const normalizeEvent = (e: any, fallback: any = {}) => {
  if (!e) return e;
  const base = { ...fallback, ...e };
  return {
    ...base,
    id: base.id || base._id,
    createdBy: base.createdBy || base.owner?._id || base.owner,
    createdByName: base.createdByName || base.owner?.name,
    createdByAvatar: base.createdByAvatar || base.owner?.displayPicture || base.owner?.avatar || undefined,
  };
};
// Updated Event interface to match backend
export interface Event {
  owner: any;
  attendees: any;
  paymentMethods: boolean;
  price: number;
  capacity(capacity: any): unknown;
  booked: number;
  ticketCategories: any;
  creatorId: string;
  _id?: string;
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  country: string;
  currency: string;
  totalSlots: number;
  bookedSlots: number;
  images: string[];
  ticketPricing: {
    vvip: { price: number; slots: number; includes: string[] };
    vip: { price: number; slots: number; includes: string[] };
    standard: { price: number; slots: number; includes: string[] };
    tableFor2: { price: number; slots: number; includes: string[] };
    tableFor5: { price: number; slots: number; includes: string[] };
    regular: { price: number; slots: number; includes: string[] };
  };
  paymentMethod: 'online' | 'pay-at-event' | 'both';
  contactInfo: {
    phone?: string;
    email?: string;
    whatsapp?: string;
  };
  tags: string[];
  createdBy: string;
  createdByName: string;
  createdByAvatar?: string;
  isBookable: boolean;
  status: 'active' | 'postponed' | 'cancelled' | 'updated' | 'published' | 'draft';
  statusDetails?: {
    message: string;
    updatedAt: string;
    newDate?: string;
    newTime?: string;
    newLocation?: string;
    originalDate?: string;
    originalTime?: string;
    originalLocation?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  bio: any;
  companyDescription: any;
  successfulEvents: any;
  pastEvents: any;
  partners: any;
  hostingCountries: any;
  _id?: string;
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  displayPicture?: string;
  avatar?: string;
  homeAddress?: string;
  companyAddress?: string;
  // Comments received about this user
  receivedComments?: {
    id: string;
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar?: string;
    eventId: string;
    eventName: string;
    comment: string;
    rating: number; // 1-5 stars
    createdAt: string;
  }[];
  createdEvents: string[];
  bookedEvents: string[];
  isRestricted?: boolean;
  isBanned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  _id?: string;
  id: string;
  eventId: string;
  userId: string;
  ticketType: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  bookingDate: string;
  status: 'confirmed' | 'cancelled' | 'pending';
}

export interface Notification {
  _id?: string;
  id: string;
  userId: string;
  type: 'booking_confirmed' | 'booking_cancelled' | 'event_updated' | 'refund_processed' | 'payment_reminder' | 'event_postponed';
  title: string;
  message: string;
  isRead: boolean;
  eventId?: string;
  bookingId?: string;
  createdAt: string;
}

interface EventContextType {
  events: Event[];
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Event management
  createEvent: (eventData: Omit<Event, 'id' | 'createdBy' | 'createdByName' | 'createdByAvatar' | 'bookedSlots' | 'status' | 'statusDetails' | '_id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  searchEvents: (query: string, location?: string) => Event[];
  updateEventStatus: (eventId: string, status: Event['status'], statusData: any) => Promise<boolean>;
  sendEventNotification: (eventId: string, notification: { type: string; message: string; eventTitle: string; newDate?: string; newTime?: string }) => Promise<boolean>;

  // Booking management
  bookEvent: (eventId: string, ticketType: string, quantity: number, notes?: string) => Promise<boolean>;
  bookEventWithTickets: (
    eventId: string,
    tickets: Array<{ type: string; quantity: number }>,
    paymentMethod: 'online' | 'pay-at-event',
    notes?: string
  ) => Promise<{ success: boolean; bookingId?: string; booking?: any }>;
  unbookEvent: (bookingId: string) => Promise<boolean>;
  getUserBookings: () => Promise<Booking[]>;

  // Authentication
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // User management
  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  toggleUserRestriction: (userId: string) => Promise<boolean>;
  toggleUserBan: (userId: string) => Promise<boolean>;
  addUserComment: (userId: string, comment: {
    eventId: string;
    eventName: string;
    comment: string;
    rating: number;
  }) => Promise<boolean>;

  // Notifications
  notifications: Notification[];
  markNotificationRead: (notificationId: string) => Promise<boolean>;
  getNotifications: () => Promise<Notification[]>;

  // Real-time
  socket: Socket | null;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    // Return safe defaults instead of throwing error during development
    // useEvents must be used within an EventProvider
    return {
      events: [],
      users: [],
      currentUser: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      createEvent: async () => false,
      updateEvent: async () => false,
      deleteEvent: async () => false,
      searchEvents: () => [],
      updateEventStatus: async () => false,
      sendEventNotification: async () => false,
      bookEvent: async () => false,
      bookEventWithTickets: async () => ({ success: false }),
      unbookEvent: async () => false,
      getUserBookings: async () => [],
      login: async () => false,
      register: async () => false,
      logout: () => {},
      updateUserProfile: async () => false,
      deleteUser: async () => false,
      toggleUserRestriction: async () => false,
      toggleUserBan: async () => false,
      addUserComment: async () => false,
      notifications: [],
      markNotificationRead: async () => false,
      getNotifications: async () => [],
      socket: null
    };
  }
  return context;
};

export const EventProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  // Keep a setter to allow forcing a re-render where needed
  const [, setAuthStateVersion] = useState(0);

  // More reliable authentication check - prioritize currentUser state
  const isAuthenticated = !!currentUser;





  // Error handler
  const handleError = (err: any) => {
    console.error('EventContext Error:', err);
    if (err.response?.data?.message) {
      setError(err.response.data.message);
    } else if (err.message) {
      setError(err.message);
    } else {
      setError('An unexpected error occurred');
    }
  };

  // Initialize and fetch data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user is already authenticated
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

        if (token && savedUser) {
          try {
            // First restore user from localStorage for immediate UI update
            const parsedUser = JSON.parse(savedUser);
            setCurrentUser(withUserDefaults(parsedUser));

            // Then fetch fresh user data from server
            await fetchUserData();
            initializeSocket();
          } catch (authErr) {
            localStorage.removeItem('auth-token');
            localStorage.removeItem('user');
            setCurrentUser(null);
          }
        } else if (token && !savedUser) {
          // Token exists but no saved user, fetch from server
          try {
            await fetchUserData();
            initializeSocket();
          } catch (authErr) {
            localStorage.removeItem('auth-token');
          }
        }

        // Always fetch public events
        try {
          await fetchEvents();
        } catch (eventsErr) {
          // Events fetch failed, but continue
        }

      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Listen for auth changes from the auth service
    const handleAuthChange = () => {
      const token = localStorage.getItem('auth-token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setCurrentUser(withUserDefaults(parsedUser));
          initializeSocket();
        } catch (error) {
          console.error('Error parsing user data:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
      }
    };

    window.addEventListener('auth-change', handleAuthChange);

    // Cleanup socket on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  // Initialize Socket.io connection
  const initializeSocket = () => {
    if (!socket) {
      const newSocket = createSocketConnection();
      setSocket(newSocket);

      // Listen for real-time events
      newSocket.on('eventUpdated', (updatedEvent: Event) => {
        setEvents(prev => prev.map(event =>
          event.id === updatedEvent.id ? updatedEvent : event
        ));
      });

      newSocket.on('eventCreated', (newEvent: Event) => {
        setEvents(prev => [newEvent, ...prev]);
      });

      newSocket.on('eventDeleted', (eventId: string) => {
        setEvents(prev => prev.filter(event => event.id !== eventId));
      });

      newSocket.on('bookingConfirmed', (booking: Booking) => {
        // Update event booked slots
        setEvents(prev => prev.map(event =>
          event.id === booking.eventId
            ? { ...event, bookedSlots: event.bookedSlots + booking.quantity }
            : event
        ));
      });

      newSocket.on('newNotification', (notification: Notification) => {
        if (notification.userId === currentUser?.id) {
          setNotifications(prev => [notification, ...prev]);
        }
      });
    }
  };

  // Fetch current user data
  const fetchUserData = async () => {
      try {
        const response = await authAPI.getMe();
        setCurrentUser(withUserDefaults(response.data));

        // Fetch user's notifications
        const notificationResponse = await notificationsAPI.getNotifications();
        setNotifications(notificationResponse.data);

      } catch (err) {
        // If user fetch fails, remove invalid token
        localStorage.removeItem('auth-token');
        handleError(err);
      }
  };

  // Fetch all events
  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getEvents();
      console.log('📅 Events API response:', response.data);
      // Support both array response and wrapped { data: { events } }
      const eventsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.data?.events || []);

      // Normalize to frontend shape: ensure id and creator fields exist
      const normalized = eventsData.map((e: any) => ({
        ...e,
        id: e.id || e._id,
        createdBy: e.createdBy || (e.owner?._id || e.owner),
        createdByName: e.createdByName || e.owner?.name,
        createdByAvatar: e.createdByAvatar || e.owner?.displayPicture || e.owner?.avatar || undefined,
      }));

      setEvents(normalized);
    } catch (err) {
      handleError(err);
    }
  };

  // Fetch all users (admin only)
  const fetchUsers = async () => {
    try {
      if (currentUser?.role === 'admin') {
        const response = await usersAPI.getUsers();
        setUsers(response.data);
      }
    } catch (err) {
      handleError(err);
    }
  };

  // Event management functions
  const createEvent = async (eventData: Omit<Event, 'id' | 'createdBy' | 'createdByName' | 'createdByAvatar' | 'bookedSlots' | 'status' | 'statusDetails' | '_id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      if (!currentUser) return false;

      const response = await eventsAPI.createEvent(eventData);
      const newEventRaw = response.data;
      const newEvent = normalizeEvent(newEventRaw);
      setEvents(prev => [newEvent, ...prev]);

      // Update current user's created events
      if (currentUser) {
        setCurrentUser(prev => prev ? {
          ...prev,
          createdEvents: [...prev.createdEvents, newEvent.id || newEvent._id]
        } : null);
      }

      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<boolean> => {
    try {
      const response = await eventsAPI.updateEvent(eventId, updates);
      const updatedEventRaw = response.data;
      setEvents(prev => prev.map(event => {
        if (event.id === eventId || event._id === eventId) {
          const normalized = normalizeEvent(updatedEventRaw, event);
          return { ...event, ...normalized };
        }
        return event;
      }));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    try {
      await eventsAPI.deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId && event._id !== eventId));

      // Update current user's created events
      if (currentUser) {
        setCurrentUser(prev => prev ? {
          ...prev,
          createdEvents: prev.createdEvents.filter(id => id !== eventId)
        } : null);
      }

      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const updateEventStatus = async (eventId: string, status: Event['status'], statusData: any): Promise<boolean> => {
    try {
      console.log('🔄 Updating event status:', { eventId, status, statusData });
      const response = await eventsAPI.updateEventStatus(eventId, statusData);
      const updatedEvent = response.data;
      console.log('✅ Received updated event from server:', updatedEvent);
      console.log('📅 Updated event date info:', {
        date: updatedEvent.date,
        dateType: typeof updatedEvent.date,
        time: updatedEvent.time,
        status: updatedEvent.status,
        statusDetails: updatedEvent.statusDetails
      });

      // Check if date is being parsed correctly
      if (updatedEvent.date) {
        const parsedDate = new Date(updatedEvent.date);
        console.log('📅 Date parsing check:', {
          originalDate: updatedEvent.date,
          parsedDate: parsedDate.toISOString(),
          isValidDate: !isNaN(parsedDate.getTime())
        });
      }

      // Normalize and merge the server response into existing event in local state
      const updatedEventRaw = updatedEvent;
      setEvents(prev => {
        const newEvents = prev.map(event => {
          if (event.id === eventId || event._id === eventId) {
            const normalized = normalizeEvent(updatedEventRaw, event);
            const updatedEventData = {
              ...event,
              ...normalized,
              id: normalized.id || event.id || event._id,
              statusDetails: normalized.statusDetails || event.statusDetails
            };
            console.log('📝 Updating event in state (status):', { eventId, oldEvent: event, normalized, updatedEventData });
            return updatedEventData;
          }
          return event;
        });

        const updatedEventInState = newEvents.find(e => e.id === eventId || e._id === eventId);
        console.log('✅ Final updated event in state:', updatedEventInState);
        return newEvents;
      });

      // Force a refresh of events from server to ensure consistency
      setTimeout(() => {
        console.log('🔄 Refreshing events from server for consistency...');
        fetchEvents();
      }, 500);

      return true;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Update event status failed';
      try {
        toast({ title: 'Update event status failed', description: message, variant: 'destructive' as any });
      } catch {}
      handleError(err);
      return false;
    }
  };

  const sendEventNotification = async (eventId: string, notification: {
    type: string;
    message: string;
    eventTitle: string;
    newDate?: string;
    newTime?: string
  }): Promise<boolean> => {
    try {
      await eventsAPI.sendEventNotification(eventId, notification);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  // Booking functions
  const bookEvent = async (eventId: string, ticketType: string, quantity: number, notes?: string): Promise<boolean> => {
    try {
      if (!currentUser) return false;

      const response = await bookingsAPI.createBooking({
        eventId,
        tickets: [{ type: ticketType, quantity }],
        paymentMethod: 'online',
        attendeeInfo: { name: currentUser.name, email: currentUser.email },
        notes: notes || ''
      });
      const booking = response.data;

      // Update event booked slots
      setEvents(prev => prev.map(event =>
        (event.id === eventId || event._id === eventId)
          ? { ...event, bookedSlots: (event.bookedSlots || 0) + quantity }
          : event
      ));

      // Update current user's booked events
      setCurrentUser(prev => prev ? {
        ...prev,
        bookedEvents: [...prev.bookedEvents, booking.id || booking._id]
      } : null);

      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  // Multi-ticket booking
  const bookEventWithTickets = async (
    eventId: string,
    tickets: Array<{ type: string; quantity: number }>,
    paymentMethod: 'online' | 'pay-at-event',
    notes?: string
  ): Promise<{ success: boolean; bookingId?: string; booking?: any }> => {
    try {
      if (!currentUser) return { success: false };

      const response = await bookingsAPI.createBooking({
        eventId,
        tickets,
        paymentMethod,
        attendeeInfo: { name: currentUser.name, email: currentUser.email },
        notes: notes || ''
      });
      const booking = response.data;

      const totalQty = tickets.reduce((sum, t) => sum + t.quantity, 0);

      setEvents(prev => prev.map(event =>
        (event.id === eventId || event._id === eventId)
          ? { ...event, bookedSlots: (event.bookedSlots || 0) + totalQty }
          : event
      ));

      setCurrentUser(prev => prev ? {
        ...prev,
        bookedEvents: [...prev.bookedEvents, booking.id || booking._id]
      } : null);

      return {
        success: true,
        bookingId: booking._id || booking.id,
        booking
      };
    } catch (err) {
      handleError(err);
      return { success: false };
    }
  };

  const unbookEvent = async (bookingId: string): Promise<boolean> => {
    try {
      await bookingsAPI.cancelBooking(bookingId);

      // Update current user's booked events
      if (currentUser) {
        setCurrentUser(prev => prev ? {
          ...prev,
          bookedEvents: prev.bookedEvents.filter(id => id !== bookingId)
        } : null);
      }

      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const getUserBookings = async (): Promise<Booking[]> => {
    try {
      const response = await bookingsAPI.getUserBookings();
      return response.data;
    } catch (err) {
      handleError(err);
      return [];
    }
  };

  // Authentication functions
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login({ email, password });
      // Backend returns { token, user } at root
      const { token, user } = response.data;

      // Set token and user immediately
      localStorage.setItem('auth-token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(withUserDefaults(user));
      setAuthStateVersion(prev => prev + 1); // Force re-render

      // Trigger auth change event
      window.dispatchEvent(new Event('auth-change'));

      // Force a small delay to ensure state propagation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Initialize socket after login
      initializeSocket();

      // Fetch user notifications (non-blocking)
      try {
        const notificationResponse = await notificationsAPI.getNotifications();
        setNotifications(notificationResponse.data);
      } catch (notifErr) {
        // Notifications fetch failed, but continue
      }

      return true;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Login failed';
      try {
        toast({ title: 'Login failed', description: message, variant: 'destructive' as any });
      } catch {}
      handleError(err);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.register({ name, email, password });
      // Backend returns { token, user } at root
      const { token, user } = response.data;

      // Set token and user immediately
      localStorage.setItem('auth-token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(withUserDefaults(user));
      setAuthStateVersion(prev => prev + 1); // Force re-render

      // Trigger auth change event
      window.dispatchEvent(new Event('auth-change'));

      // Force a small delay to ensure state propagation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Initialize socket after registration
      initializeSocket();

      // Fetch user notifications (non-blocking)
      try {
        const notificationResponse = await notificationsAPI.getNotifications();
        setNotifications(notificationResponse.data);
      } catch (notifErr) {
        // Notifications fetch failed, but continue
      }

      return true;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Registration failed';
      try {
        toast({ title: 'Registration failed', description: message, variant: 'destructive' as any });
      } catch {}
      console.error('❌ Registration failed:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status
      });
      handleError(err);
      return false; // Return false instead of throwing
    }
  };

  const logout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setNotifications([]);

    // Disconnect socket
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // User management functions
  const updateUserProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      if (!currentUser) return false;

      const response = await authAPI.updateProfile(updates);

      // Update the current user with the response data (server returns full user)
      const updatedUserRaw = { ...currentUser, ...response.data };
      const updatedUser = withUserDefaults(updatedUserRaw);
      setCurrentUser(updatedUser);

      // Also update localStorage to persist the changes
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update any events owned by this user to show new name/avatar immediately
      setEvents(prev => prev.map(e =>
        (e.createdBy === (updatedUser.id || updatedUser._id))
          ? { ...e, createdByName: updatedUser.name, createdByAvatar: updatedUser.displayPicture || updatedUser.avatar }
          : e
      ));

      console.log('✅ Profile updated successfully:', updatedUser);
      return true;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Update profile failed';
      try {
        toast({ title: 'Update profile failed', description: message, variant: 'destructive' as any });
      } catch {}
      handleError(err);
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      await usersAPI.deleteUser(userId);
      setUsers(prev => prev.filter(user => (user.id || user._id) !== userId));

      if ((currentUser?.id || currentUser?._id) === userId) {
        logout();
      }

      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const toggleUserRestriction = async (userId: string): Promise<boolean> => {
    try {
      // Note: API doesn't have this method, so we'll use updateUser instead
      const userToUpdate = users.find(u => (u.id || u._id) === userId);
      if (!userToUpdate) return false;

      const response = await usersAPI.updateUser(userId, {
        isRestricted: !userToUpdate.isRestricted
      });
      const updatedUser = response.data;

      setUsers(prev => prev.map(user =>
        (user.id || user._id) === userId ? updatedUser : user
      ));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const toggleUserBan = async (userId: string): Promise<boolean> => {
    try {
      const userToUpdate = users.find(u => (u.id || u._id) === userId);
      if (!userToUpdate) return false;

      const response = await usersAPI.toggleUserBan(userId, {
        isBanned: !userToUpdate.isBanned
      });
      const updatedUser = response.data;

      setUsers(prev => prev.map(user =>
        (user.id || user._id) === userId ? updatedUser : user
      ));

      if ((currentUser?.id || currentUser?._id) === userId && updatedUser.isBanned) {
        logout();
      }

      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const addUserComment = async (userId: string, comment: {
    eventId: string;
    eventName: string;
    comment: string;
    rating: number;
  }): Promise<boolean> => {
    try {
      if (!currentUser) return false;

      await usersAPI.addUserComment(userId, {
        comment: comment.comment,
        rating: comment.rating,
        eventId: comment.eventId,
        eventName: comment.eventName
      });

      // React Query will handle state updates automatically


      // Refresh users if admin
      if (currentUser.role === 'admin') {
        await fetchUsers();
      }

      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  // Notification functions
  const markNotificationRead = async (notificationId: string): Promise<boolean> => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => prev.map(notif =>
        (notif.id || notif._id) === notificationId ? { ...notif, isRead: true } : notif
      ));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const getNotifications = async (): Promise<Notification[]> => {
    try {
      const response = await notificationsAPI.getNotifications();
      setNotifications(response.data);
      return response.data;
    } catch (err) {
      handleError(err);
      return [];
    }
  };

  // Search function (client-side filtering for now)
  const searchEvents = (query: string, location?: string): Event[] => {
    return events.filter(event => {
      const matchesQuery = event.title.toLowerCase().includes(query.toLowerCase()) ||
                          event.description.toLowerCase().includes(query.toLowerCase()) ||
                          event.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      const matchesLocation = !location || event.location.toLowerCase().includes(location.toLowerCase()) ||
                             event.country.toLowerCase().includes(location.toLowerCase());
      return matchesQuery && matchesLocation;
    });
  };

  // Fetch users when current user is admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  return (
    <EventContext.Provider value={{
      events,
      users,
      currentUser,
      isAuthenticated,
      loading,
      error,
      createEvent,
      updateEvent,
      deleteEvent,
      searchEvents,
      updateEventStatus,
      sendEventNotification,
      bookEvent,
      bookEventWithTickets,
      unbookEvent,
      getUserBookings,
      login,
      register,
      logout,
      updateUserProfile,
      deleteUser,
      toggleUserRestriction,
      toggleUserBan,
      addUserComment,
      notifications,
      markNotificationRead,
      getNotifications,
      socket
    }}>
      {children}
    </EventContext.Provider>
  );
};