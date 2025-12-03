import apiClient from './api';
import wsClient from  './websocket';

// API Response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: string;
  isRead: boolean;
  reactions?: Array<{
    emoji: string;
    userId: string;
    timestamp: string;
  }>;
}

export interface Chat {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
    isOnline: boolean;
    lastSeen?: string;
  }>;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatTyping {
  chatId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

// Chat Service
export class ChatService {
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Set up WebSocket event listeners
    wsClient.on('message', this.handleNewMessage.bind(this));
    wsClient.on('typing', this.handleTyping.bind(this));
    wsClient.on('user_online', this.handleUserOnline.bind(this));
    wsClient.on('user_offline', this.handleUserOffline.bind(this));
    wsClient.on('message_read', this.handleMessageRead.bind(this));
  }

  // Get all chats for current user
  async getChats(): Promise<ApiResponse<Chat[]>> {
    return apiClient.get('/chats');
  }

  // Get chat by ID
  async getChat(chatId: string): Promise<ApiResponse<Chat>> {
    return apiClient.get(`/chats/${chatId}`);
  }

  // Get messages for a chat
  async getMessages(chatId: string, page = 1, limit = 50): Promise<ApiResponse<{
    messages: ChatMessage[];
    hasMore: boolean;
    total: number;
  }>> {
    return apiClient.get(`/chats/${chatId}/messages?page=${page}&limit=${limit}`);
  }

  // Send text message
  async sendMessage(chatId: string, content: string): Promise<ApiResponse<ChatMessage>> {
    const response = await apiClient.post<ChatMessage>(`/chats/${chatId}/messages`, {
      content,
      type: 'text',
    });

    // Also send via WebSocket for real-time delivery
    if (response.status === 200 && response.data) {
      wsClient.send('message', {
        chatId,
        message: response.data,
      });
    }

    return {
      success: response.status === 200,
      data: response.data,
    };
  }

  // Send file message
  async sendFile(
    chatId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<ChatMessage>> {
    // Upload file first
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResponse = await apiClient.post('/chats/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onProgress(progress);
      } : undefined,
    });
    
    if (uploadResponse.status !== 200) {
      return {
        success: false,
        error: 'File upload failed',
      };
    }

    // Send message with file reference
    const messageResponse = await apiClient.post<ChatMessage>(`/chats/${chatId}/messages`, {
      content: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      fileUrl: (uploadResponse.data as any)?.url,
      fileName: file.name,
      fileSize: file.size,
    });

    // Send via WebSocket
    if (messageResponse.status === 200 && messageResponse.data) {
      wsClient.send('message', {
        chatId,
        message: messageResponse.data,
      });
    }

    return {
      success: messageResponse.status === 200,
      data: messageResponse.data,
    };
  }

  // Start a new chat (e.g., between guest and host)
  async startChat(participantIds: string[], bookingId?: string): Promise<ApiResponse<Chat>> {
    return apiClient.post('/chats', {
      participantIds,
      bookingId,
    });
  }

  // Mark messages as read
  async markAsRead(chatId: string, messageIds: string[]): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>(`/chats/${chatId}/read`, { messageIds });
    
    // Notify other participants via WebSocket
    wsClient.send('messages_read', {
      chatId,
      messageIds,
    } as any);

    return {
      success: response.status === 200,
      data: response.data,
    };
  }

  // Send typing indicator
  sendTyping(chatId: string, isTyping: boolean) {
    wsClient.send('typing', {
      chatId,
      isTyping,
    } as any);

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      const timeoutKey = `${chatId}_typing`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        this.sendTyping(chatId, false);
        this.typingTimeouts.delete(timeoutKey);
      }, 3000);

      this.typingTimeouts.set(timeoutKey, timeout);
    }
  }

  // Add reaction to message
  async addReaction(messageId: string, emoji: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>(`/messages/${messageId}/reactions`, { emoji });
    
    // Send via WebSocket
    wsClient.send('reaction', {
      chatId: '', // You may need to pass chatId as a parameter to this method
      message: {
        id: messageId,
        chatId: '',
        senderId: '',
        content: `Reaction added: ${emoji}`,
        type: 'system',
        timestamp: new Date().toISOString(),
        isRead: false
      }
    });

    return {
      success: response.status === 200,
      data: response.data,
    };
  }

  // Remove reaction from message
  async removeReaction(messageId: string, emoji: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<void>(`/messages/${messageId}/reactions/${emoji}`);
    
    // Send via WebSocket
    wsClient.send('reaction_removed', {
      chatId: '', // You may need to pass chatId as a parameter to this method
      message: {
        id: messageId,
        chatId: '',
        senderId: '',
        content: `Reaction removed: ${emoji}`,
        type: 'system',
        timestamp: new Date().toISOString(),
        isRead: false
      }
    });

    return {
      success: response.status === 200,
      data: response.data,
    };
  }

  // Search messages
  async searchMessages(query: string, chatId?: string): Promise<ApiResponse<ChatMessage[]>> {
    const params = new URLSearchParams({ query });
    if (chatId) params.append('chatId', chatId);
    
    return apiClient.get(`/chats/search?${params.toString()}`);
  }

  // Get support chat (for customer service)
  async getSupportChat(): Promise<ApiResponse<Chat>> {
    return apiClient.post('/chats/support');
  }

  // Report inappropriate message
  async reportMessage(messageId: string, reason: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/messages/${messageId}/report`, { reason });
  }

  // Event handlers for WebSocket messages
  private handleNewMessage(data: { chatId: string; message: ChatMessage }) {
    // Emit custom event for UI to handle
    window.dispatchEvent(new CustomEvent('chat:new_message', { detail: data }));
  }

  private handleTyping(data: ChatTyping) {
    window.dispatchEvent(new CustomEvent('chat:typing', { detail: data }));
  }

  private handleUserOnline(data: { userId: string }) {
    window.dispatchEvent(new CustomEvent('chat:user_online', { detail: data }));
  }

  private handleUserOffline(data: { userId: string }) {
    window.dispatchEvent(new CustomEvent('chat:user_offline', { detail: data }));
  }

  private handleMessageRead(data: { chatId: string; messageIds: string[]; userId: string }) {
    window.dispatchEvent(new CustomEvent('chat:message_read', { detail: data }));
  }

  // Voice/Video call initiation
  async initiateCall(chatId: string, type: 'voice' | 'video'): Promise<ApiResponse<{
    callId: string;
    roomToken: string;
    serverUrl: string;
  }>> {
    const response = await apiClient.post<{
      callId: string;
      roomToken: string;
      serverUrl: string;
    }>(`/chats/${chatId}/call`, { type });
    
    // Notify other participants
    if (response.data?.callId) {
      wsClient.send('call_initiated', {
        chatId,
        message: {
          id: '',
          chatId,
          senderId: '',
          content: `Call initiated: ${type}`,
          type: 'system',
          timestamp: new Date().toISOString(),
          isRead: false
        }
      });
    }

    return {
      success: response.status === 200,
      data: response.data,
    };
  }

  // Join call
  async joinCall(callId: string): Promise<ApiResponse<{
    roomToken: string;
    serverUrl: string;
  }>> {
    const response = await apiClient.post<{
      roomToken: string;
      serverUrl: string;
    }>(`/calls/${callId}/join`);

    // Notify other participants
    wsClient.send('call_joined', {
      chatId: '', // You may need to pass chatId as a parameter to this method
      message: {
        id: '',
        chatId: '',
        senderId: '',
        content: `User joined call: ${callId}`,
        type: 'system',
        timestamp: new Date().toISOString(),
        isRead: false
      }
    });

    return {
      success: response.status === 200,
      data: response.data,
    };
  }

  // End call
  async endCall(callId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>(`/calls/${callId}/end`);
    
    // Notify other participants
    wsClient.send('call_ended', {
      chatId: '',
      message: {
        id: '',
        chatId: '',
        senderId: '',
        content: 'Call ended',
        type: 'system',
        timestamp: new Date().toISOString(),
        isRead: false
      }
    });

    return {
      success: response.status === 200,
      data: response.data,
    };
  }
}

export const chatService = new ChatService();
