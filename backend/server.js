import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { connectDB } from "./src/config/db.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";
import { socketAuth, handleConnection } from "./src/socket/socketHandlers.js";

import authRoutes from "./src/routes/authRoutes.js";
import eventRoutes from "./src/routes/eventRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import paymentReceiptRoutes from "./src/routes/paymentReceiptRoutes.js";
import ticketRoutes from "./src/routes/ticketRoutes.js";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// Core middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.set("trust proxy", 1);
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Static uploads with CORS for images
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CLIENT_URL = process.env.CLIENT_URL || 'https://ishow-ng.web.app' || 'http://localhost:3000';
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', DEFAULT_CLIENT_URL);
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// Health
app.get("/", (req,res)=> res.json({ ok: true, name: "Backend API" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payment-receipts", paymentReceiptRoutes);
app.use("/api/tickets", ticketRoutes);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://ishow-ng.web.app' || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket authentication middleware
io.use(socketAuth);

// Handle socket connections
io.on('connection', handleConnection(io));

// Make io available globally for notifications
global.io = io;

// 404 & errors
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// Prefer MONGODB_URI, fallback to MONGO_URI, then local
const URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/event_platform";

connectDB(URI).then(()=>{
  httpServer.listen(PORT, ()=> {
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    console.log(`✅ API running at ${backendUrl}`);
    console.log(`🔌 Socket.IO server ready for real-time notifications (CORS origin: ${process.env.CLIENT_URL || DEFAULT_CLIENT_URL})`);
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
      console.warn('⚠️ No MongoDB connection string provided in env (MONGODB_URI or MONGO_URI). Using local MongoDB.');
    }
  });
});
