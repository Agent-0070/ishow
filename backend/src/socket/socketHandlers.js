import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Store connected users and their socket IDs
const connectedUsers = new Map();

// Socket authentication middleware
export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Handle socket connections
export const handleConnection = (io) => {
  return (socket) => {
    console.log(`🔌 User ${socket.user.name} connected (${socket.id})`);

    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Handle user joining their room
    socket.on('user:join', (data) => {
      console.log(`👤 User ${socket.user.name} joined their notification room`);
      socket.emit('user:joined', {
        message: 'Connected to real-time notifications',
        userId: socket.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 User ${socket.user.name} disconnected (${reason})`);
      connectedUsers.delete(socket.userId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`🔌 Socket error for user ${socket.user.name}:`, error);
    });
  };
};

// Utility function to send notification to specific user
export const sendNotificationToUser = (io, userId, notification) => {
  try {
    const userRoom = `user_${userId}`;

    console.log(`🔔 Sending notification to user ${userId}:`, {
      type: notification.type,
      title: notification.title
    });

    io.to(userRoom).emit('newNotification', {
      id: notification._id || notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      read: notification.read || false,
      createdAt: notification.createdAt || new Date(),
      timestamp: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return false;
  }
};

// Utility function to send notification to multiple users
export const sendNotificationToUsers = (io, userIds, notification) => {
  try {
    let successCount = 0;

    userIds.forEach(userId => {
      const success = sendNotificationToUser(io, userId.toString(), notification);
      if (success) successCount++;
    });

    console.log(`🔔 Sent notifications to ${successCount}/${userIds.length} users`);
    return successCount;
  } catch (error) {
    console.error('Error sending notifications to users:', error);
    return 0;
  }
};

// Get connected users count
export const getConnectedUsersCount = () => {
  return connectedUsers.size;
};

// Get connected user info
export const getConnectedUser = (userId) => {
  return connectedUsers.get(userId);
};

// Check if user is connected
export const isUserConnected = (userId) => {
  return connectedUsers.has(userId);
};