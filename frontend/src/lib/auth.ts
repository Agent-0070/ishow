import { authAPI } from './api';

// API Response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'host' | 'guest';
  avatar?: string;
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'host' | 'guest';
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Authentication Service
export class AuthService {
  // Login
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.data) {
        localStorage.setItem('auth-token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Trigger app state update
        window.dispatchEvent(new Event('auth-change'));
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  }

  // Register
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await authAPI.register({
        name: data.name,
        email: data.email,
        password: data.password
      });
      
      if (response.data) {
        localStorage.setItem('auth-token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Trigger app state update
        window.dispatchEvent(new Event('auth-change'));
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    // Trigger app state update
    window.dispatchEvent(new Event('auth-change'));
  }

  // Get current user
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth-token');
  }

  // Get token
  getToken(): string | null {
    return localStorage.getItem('auth-token');
  }

  // Update profile
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await authAPI.updateProfile(data);
      
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Profile update failed' 
      };
    }
  }

  // Change password
  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await authAPI.changePassword(passwordData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Password change failed' 
      };
    }
  }
}

export const authService = new AuthService();
