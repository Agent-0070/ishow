import axios from 'axios';
import { io } from 'socket.io-client';

// Configure API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors gracefully and include original message for debugging
    if (!error.response) {
      console.warn('Network error:', error.message);
      const msg = error && error.message
        ? `Network connection failed (${error.message}). Please check your internet connection.`
        : 'Network connection failed. Please check your internet connection.';
      return Promise.reject(new Error(msg));
    }

    if (error.response?.status === 401) {
      // Token expired or invalid - only redirect if not already on auth page
      localStorage.removeItem('auth-token');
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData: { name: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  getMe: () => api.get('/auth/me'),
  
  updateProfile: (profileData: any) =>
    api.put('/auth/profile', profileData),
  
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', passwordData),
};

// Events API
export const eventsAPI = {
  getEvents: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    country?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/events', { params }),
  
  getEvent: (id: string) => api.get(`/events/${id}`),
  
  createEvent: (eventData: any) => api.post('/events', eventData),
  
  updateEvent: (id: string, eventData: any) => api.put(`/events/${id}`, eventData),
  
  deleteEvent: (id: string) => api.delete(`/events/${id}`),
  
  updateEventStatus: (id: string, statusData: {
    status: string;
    reason?: string;
    newDate?: string;
    newTime?: string;
    newLocation?: string;
  }) => api.patch(`/events/${id}/status`, statusData),

  sendEventNotification: (id: string, notification: {
    type: string;
    message: string;
    eventTitle: string;
    newDate?: string;
    newTime?: string
  }) => api.post(`/events/${id}/notify`, notification),
  
  addComment: (id: string, commentData: { comment: string; rating?: number }) =>
    api.post(`/events/${id}/comments`, commentData),
  
  getHostEvents: () => api.get('/events/host/my-events'),
};

// Users API
export const usersAPI = {
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) => api.get('/users', { params }),
  
  getUser: (id: string) => api.get(`/users/${id}`),
  
  updateUser: (id: string, userData: any) => api.put(`/users/${id}`, userData),
  
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  
  toggleUserBan: (id: string, banData: { isBanned: boolean; reason?: string }) =>
    api.patch(`/users/${id}/ban`, banData),
  
  addUserComment: (id: string, commentData: {
    comment: string;
    rating: number;
    eventId: string;
    eventName: string;
  }) => api.post(`/users/${id}/comments`, commentData),

  addCommentReply: (commentId: string, replyData: { text: string }) =>
    api.post(`/users/comments/${commentId}/reply`, replyData),

  deleteUserComment: (userId: string, commentId: string) =>
    api.delete(`/users/${userId}/comments/${commentId}`),
  
  getUserStats: () => api.get('/users/stats'),
};

// Bookings API
export const bookingsAPI = {
  createBooking: (bookingData: {
    eventId: string;
    tickets?: Array<{ type: string; quantity: number }>;
    paymentMethod: 'online' | 'pay-at-event';
    quantity?: number; // legacy support
    attendeeInfo?: { name: string; email: string; phone?: string };
    notes?: string;
  }) => api.post('/bookings', bookingData),
  
  getUserBookings: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/bookings/my-bookings', { params }),
  
  getBooking: (id: string) => api.get(`/bookings/${id}`),
  
  cancelBooking: (id: string, reason?: string) =>
    api.patch(`/bookings/${id}/cancel`, { reason }),
  
  getEventBookings: (eventId: string, params?: { page?: number; limit?: number; status?: string }) =>
    api.get(`/bookings/event/${eventId}`, { params }),
  
  checkInBooking: (id: string) => api.patch(`/bookings/${id}/checkin`),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  
  markAllAsRead: () => api.patch('/notifications/read-all'),
  
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  
  deleteAllNotifications: () => api.delete('/notifications'),
  
  getNotificationSettings: () => api.get('/notifications/settings'),
  
  updateNotificationSettings: (settings: any) =>
    api.put('/notifications/settings', settings),
};

// Upload API
export const uploadAPI = {
  uploadImage: (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  uploadImages: (imageFiles: File[]) => {
    const formData = new FormData();
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });
    return api.post('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  deleteImage: (publicId: string) => api.delete(`/upload/image/${publicId}`),
  
  getUploadSignature: () => api.get('/upload/signature'),
};

// Analytics API
export const analyticsAPI = {
  getDashboardAnalytics: (timeFrame?: string) =>
    api.get('/analytics/dashboard', { params: { timeFrame } }),
  
  getEventAnalytics: (eventId: string) =>
    api.get(`/analytics/events/${eventId}`),
  
  getPlatformAnalytics: (timeFrame?: string) =>
    api.get('/analytics/platform', { params: { timeFrame } }),
};

// Socket connection
export const createSocketConnection = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : '';

  const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    withCredentials: true,
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    // Join using authenticated user from socketAuth
    socket.emit('user:join', {});
  });

  return socket;
};

// Payment Receipt API
export const paymentReceiptAPI = {
  uploadReceipt: (receiptData: {
    eventId: string;
    bookingId: string;
    amount: number;
    receiptImage: string;
    receiptImagePublicId?: string;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;
  }) => api.post('/payment-receipts/upload', receiptData),

  getReceipts: (params?: {
    status?: string;
    eventId?: string;
    page?: number;
    limit?: number;
  }) => api.get('/payment-receipts', { params }),

  getUserReceipts: () => api.get('/payment-receipts/my-receipts'),

  getReceipt: (receiptId: string) => api.get(`/payment-receipts/${receiptId}`),

  confirmReceipt: (receiptId: string, verificationNotes?: string) =>
    api.patch(`/payment-receipts/${receiptId}/confirm`, { verificationNotes }),

  rejectReceipt: (receiptId: string, verificationNotes?: string) =>
    api.patch(`/payment-receipts/${receiptId}/reject`, { verificationNotes })
};

// Tickets API
export const ticketsAPI = {
  getMyTickets: () => api.get('/tickets/my-tickets'),

  downloadTicket: (id: string) => api.get(`/tickets/${id}/download`),

  validateTicket: (qrData: string) => api.post('/tickets/validate', { qrData }),

  useTicket: (ticketId: string) => api.patch(`/tickets/${ticketId}/use`),
};

export default api;

// Utility: convert receiptImage (which may be a relative '/uploads/...' path or a full URL)
// into an absolute URL pointing at the backend origin or the remote host.
export function getAbsoluteImageUrl(imagePath: string) {
  if (!imagePath) return imagePath;
  // If it's already an absolute URL, return as is
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');

  // If it's a relative path (starts with '/'), prefix backend origin
  if (imagePath.startsWith('/')) {
    return `${backendOrigin}${imagePath}`;
  }

  // Fallback: return as-is
  return imagePath;
}
