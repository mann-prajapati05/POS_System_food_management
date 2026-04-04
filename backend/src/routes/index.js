/**
 * MAIN ROUTES REGISTRY
 * 
 * Central location for all API route registrations
 * This keeps app.js clean and maintainable
 */

import express from 'express';
import ordersRouter from './orders.js';
import authRouter from './auth.js';

const router = express.Router();

/**
 * API v1 Routes
 * All routes are prefixed with /api/v1
 * (ready for future versioning)
 */

/**
 * Order Management Routes
 * POST   /api/orders              - Create order
 * GET    /api/orders/:id          - Get order
 * POST   /api/orders/:id/items    - Add items
 * PATCH  /api/orders/:id/...      - Update order
 * POST   /api/orders/:id/payment  - Process payment
 */
router.use('/orders', ordersRouter);

/**
 * Authentication Routes
 * POST /api/auth/register       - Register user
 * POST /api/auth/login          - Login user
 * POST /api/auth/logout         - Logout user
 */
router.use('/auth', authRouter);

/**
 * Health Check Endpoint
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
