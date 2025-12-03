import apiClient from './api';

// API Response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Booking Types
export interface Property {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  hostId: string;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  guestId: string;
  hostId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
  property?: Property;
  guest?: any;
  host?: any;
}

export interface BookingRequest {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  specialRequests?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface PaymentRequest {
  bookingId: string;
  paymentMethodId: string;
  amount: number;
}

export interface Ticket {
  id: string;
  bookingId: string;
  qrCode: string;
  checkInCode: string;
  isUsed: boolean;
  createdAt: string;
}

// Booking Service
export class BookingService {
  // Get all properties with filters
  async getProperties(filters?: {
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
  }): Promise<ApiResponse<Property[]>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    return apiClient.get(`/properties?${params.toString()}`);
  }

  // Get property by ID
  async getProperty(id: string): Promise<ApiResponse<Property>> {
    return apiClient.get(`/properties/${id}`);
  }

  // Check availability
  async checkAvailability(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<ApiResponse<{ available: boolean; conflictingBookings?: string[] }>> {
    return apiClient.post('/bookings/check-availability', {
      propertyId,
      checkIn,
      checkOut,
    });
  }

  // Create booking
  async createBooking(bookingData: BookingRequest): Promise<ApiResponse<Booking>> {
    return apiClient.post('/bookings', bookingData);
  }

  // Get user bookings
  async getMyBookings(): Promise<ApiResponse<Booking[]>> {
    return apiClient.get('/bookings/my-bookings');
  }

  // Get booking by ID
  async getBooking(id: string): Promise<ApiResponse<Booking>> {
    return apiClient.get(`/bookings/${id}`);
  }

  // Cancel booking
  async cancelBooking(id: string, reason?: string): Promise<ApiResponse<Booking>> {
    return apiClient.put(`/bookings/${id}/cancel`, { reason });
  }

  // Update booking
  async updateBooking(id: string, updates: Partial<BookingRequest>): Promise<ApiResponse<Booking>> {
    return apiClient.put(`/bookings/${id}`, updates);
  }

  // Get payment methods
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    return apiClient.get('/payments/methods');
  }

  // Add payment method
  async addPaymentMethod(method: Omit<PaymentMethod, 'id'>): Promise<ApiResponse<PaymentMethod>> {
    return apiClient.post('/payments/methods', method);
  }

  // Process payment
  async processPayment(paymentData: PaymentRequest): Promise<ApiResponse<{
    paymentId: string;
    status: 'success' | 'failed';
    transactionId?: string;
    receipt?: string;
  }>> {
    return apiClient.post('/payments/process', paymentData);
  }

  // Generate ticket
  async generateTicket(bookingId: string): Promise<ApiResponse<Ticket>> {
    return apiClient.post(`/bookings/${bookingId}/ticket`);
  }

  // Verify ticket
  async verifyTicket(ticketId: string, code: string): Promise<ApiResponse<{
    valid: boolean;
    booking?: Booking;
  }>> {
    return apiClient.post('/tickets/verify', { ticketId, code });
  }

  // Use ticket for check-in
  async checkInWithTicket(ticketId: string): Promise<ApiResponse<{
    success: boolean;
    checkInTime: string;
  }>> {
    return apiClient.post(`/tickets/${ticketId}/check-in`);
  }

  // Get booking analytics (for hosts/admins)
  async getBookingAnalytics(filters?: {
    startDate?: string;
    endDate?: string;
    propertyId?: string;
  }): Promise<ApiResponse<{
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    occupancyRate: number;
    monthlyData: Array<{
      month: string;
      bookings: number;
      revenue: number;
    }>;
  }>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value);
        }
      });
    }
    
    return apiClient.get(`/analytics/bookings?${params.toString()}`);
  }

  // Search properties with AI-powered recommendations
  async searchPropertiesAI(query: string, preferences?: {
    budget?: number;
    location?: string;
    amenities?: string[];
    travelPurpose?: 'business' | 'leisure' | 'family';
  }): Promise<ApiResponse<{
    properties: Property[];
    recommendations: string[];
    similarSearches: string[];
  }>> {
    return apiClient.post('/properties/search-ai', { query, preferences });
  }

  // Get property reviews
  async getPropertyReviews(propertyId: string): Promise<ApiResponse<Array<{
    id: string;
    guestName: string;
    rating: number;
    comment: string;
    createdAt: string;
    images?: string[];
  }>>> {
    return apiClient.get(`/properties/${propertyId}/reviews`);
  }

  // Submit review
  async submitReview(bookingId: string, review: {
    rating: number;
    comment: string;
    images?: File[];
  }): Promise<ApiResponse<{ id: string }>> {
    if (review.images && review.images.length > 0) {
      // Handle image uploads
      const imageUploadPromises = review.images.map(image => {
        const formData = new FormData();
        formData.append('image', image);
        return apiClient.post('/reviews/images', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });
      
      const imageResults = await Promise.all(imageUploadPromises);
      const imageUrls = imageResults
        .filter(result => result.data?.success)
        .map(result => (result.data as { data: { url: string } })?.data?.url)
        .filter(Boolean);

      return apiClient.post(`/bookings/${bookingId}/review`, {
        rating: review.rating,
        comment: review.comment,
        images: imageUrls,
      });
    }

    return apiClient.post(`/bookings/${bookingId}/review`, {
      rating: review.rating,
      comment: review.comment,
    });
  }
}

export const bookingService = new BookingService();
