/**
 * EXPRESS APPLICATION SETUP
 * 
 * Main Express app configuration
 * Features:
 * - CORS enabled for frontend communication
 * - JSON/URL-encoded middleware
 * - Request logging
 * - All API routes mounted
 * - Error handling
 * 
 * Entry point: run this file directly or import in index.js
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Middleware imports
import { requestLogger, errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes imports
import apiRoutes from './routes/index.js';

// Database
import { ensureDatabaseAndSchema, testConnection } from './config/db.js';

dotenv.config();

// ======================================
// EXPRESS APP INITIALIZATION
// ======================================
const app = express();

// ======================================
// MIDDLEWARE
// ======================================

/**
 * CORS Configuration
 * Allow requests from frontend (localhost:3000, localhost:5173, etc.)
 */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

/**
 * Built-in Express middleware
 */
app.use(express.json()); // Parse JSON request bodies (limit: 10mb)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

/**
 * Custom middleware
 */
app.use(requestLogger); // Log all requests

// ======================================
// HEALTH CHECK ENDPOINT
// ======================================

/**
 * GET /health
 * Quick health check without hitting database
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /api-status
 * Detailed status with database check
 */
app.get('/api-status', async (req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: err.message,
    });
  }
});

// ======================================
// API ROUTES
// ======================================

/**
 * Mount all API routes under /api
 * This keeps routes modular and organized
 */
app.use('/api', apiRoutes);

// ======================================
// ERROR HANDLING MIDDLEWARE
// ======================================

/**
 * 404 Not Found Handler
 * Must come before global error handler
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 * Catches all errors from routes and middleware
 * Must be registered LAST
 */
app.use(errorHandler);

// ======================================
// SERVER STARTUP
// ======================================

const PORT = process.env.PORT || 3000;

/**
 * Start Express server
 * Runs on process.env.PORT or 3000
 */
export async function startServer() {
  try {
    // Test database connection on startup
    console.log('\n=== Starting Restaurant POS Backend ===\n');
    await ensureDatabaseAndSchema();
    await testConnection();

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

export default app;
