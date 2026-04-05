import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { closeConnection, ensureDatabaseAndSchema, testConnection, getPoolStatus } from './config/db.js';
import { initializeSocketIO } from './services/socketEvents.js';
import authRouter from './routes/authRouter.js';
import staffRouter from './routes/staffRouter.js';
import adminRouter from './routes/adminRouter.js';
import kitchenRouter from './routes/kitchenRouter.js';
import paymentRouter from './routes/paymentRouter.js';

dotenv.config();

const app = express();

// CORS configuration for both HTTP and WebSocket
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.use('/', (req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use('/auth', authRouter);
app.use('/staff', staffRouter);
app.use('/admin', adminRouter);
app.use('/kitchen', kitchenRouter);
app.use('/api/payments', paymentRouter);

app.get('/health', async (req, res) => {
  try {
    await testConnection();
    const poolStatus = await getPoolStatus();
    res.status(200).json({
      status: 'OK',
      server: 'running',
      database: 'connected',
      timestamp: new Date().toISOString(),
      pool: poolStatus,
    });
  } catch (err) {
    console.error('❌ Health check failed:', err.message);
    res.status(503).json({
      status: 'FAILED',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Catch 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

// Global error handler middleware (must be last)
app.use((err, req, res, next) => {
  console.error('🔴 Express Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Initialize Socket.IO event service
initializeSocketIO(io);

// ===== SOCKET.IO CONNECTION HANDLING =====
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Handle user authentication and role setup
  socket.on('user_authenticated', (data) => {
    const { userId, role, sessionId } = data;

    // Tag socket with user info
    socket.userId = userId;
    socket.userRole = role;
    socket.sessionId = sessionId;

    // Join role-based room for broadcast updates
    socket.join(`role:${role}`);
    console.log(`✅ User ${userId} (${role}) joined room: role:${role}`);

    // Join session-specific room
    if (sessionId) {
      socket.join(`session:${sessionId}`);
      console.log(`✅ User ${userId} joined session room: session:${sessionId}`);
    }

    // Notify others in session that user joined
    io.to(`session:${sessionId}`).emit('user_joined', {
      userId,
      role,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle real-time order updates from kitchen
  socket.on('kitchen_update', (data) => {
    const { orderId, status, sessionId } = data;
    // Broadcast to session staff dashboard
    io.to(`session:${sessionId}`).emit('order_status_updated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    if (socket.sessionId && socket.userId) {
      io.to(`session:${socket.sessionId}`).emit('user_left', {
        userId: socket.userId,
        role: socket.userRole,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`🔴 Socket error [${socket.id}]:`, error);
  });
});

async function startServer() {
  try {
    await ensureDatabaseAndSchema();
    await testConnection();
    console.log('✅ Database connection established');

    await new Promise((resolve, reject) => {
      const onError = (error) => {
        httpServer.off('listening', onListening);
        reject(error);
      };

      const onListening = () => {
        httpServer.off('error', onError);
        resolve();
      };

      httpServer.once('error', onError);
      httpServer.once('listening', onListening);
      httpServer.listen(PORT);
    });

    console.log(`🚀 Server running on port ${PORT}`);
    console.log('📡 WebSocket enabled for real-time updates');
    console.log(`http://localhost:${PORT}/`);
  } catch (err) {
    if (err?.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error('Close the process using this port or set a different PORT in .env');
    }
    console.error('❌ Startup failed:', err.message);
    await closeConnection();
    process.exit(1);
  }
}

// Global error handlers to prevent silent crashes
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await closeConnection();
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await closeConnection();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  io.close();
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  io.close();
  await closeConnection();
  process.exit(0);
});

startServer();

export { app, httpServer, io };

