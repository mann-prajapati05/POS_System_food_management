/**
 * ORDER ROUTES
 * 
 * Complete REST API endpoints for POS order management
 * Base path: /api/orders
 */

import express from 'express';
import {
  createOrder,
  addOrderItem,
  getOrder,
  sendToKitchen,
  updateOrderStatus,
  processPayment,
  getSessionSummary,
  getKitchenDisplay,
  getTableStatusOverview,
  getDailyReport,
} from '../controller/orderController.js';

// TODO: Add authentication & authorization middleware
// import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ======================================
// ORDER MANAGEMENT ENDPOINTS
// ======================================

/**
 * POST /api/orders
 * Create new order (DRAFT status)
 * Required: sessionId, tableId, staffId
 */
router.post('/', createOrder);

/**
 * GET /api/orders/:orderId
 * Get complete order details with items
 */
router.get('/:orderId', getOrder);

/**
 * POST /api/orders/:orderId/items
 * Add item to order
 * Required: productId, quantity
 */
router.post('/:orderId/items', addOrderItem);

/**
 * PATCH /api/orders/:orderId/send-to-kitchen
 * Send order to kitchen (pending → to_cook)
 * Optional: kitchenStaffId (for assignment)
 */
router.patch('/:orderId/send-to-kitchen', sendToKitchen);

/**
 * PATCH /api/orders/:orderId/status
 * Update order status (kitchen use: to_cook → preparing → completed)
 * Required: status ('preparing' | 'completed')
 */
router.patch('/:orderId/status', updateOrderStatus);

/**
 * POST /api/orders/:orderId/payment
 * Process payment (cash/card/upi)
 * Required: method, amount
 * Optional: upiReference (for UPI payments)
 */
router.post('/:orderId/payment', processPayment);

// ======================================
// REPORTING & ANALYTICS ENDPOINTS
// ======================================

/**
 * GET /api/sessions/:sessionId/summary
 * Get session revenue, order count, payment breakdown
 */
router.get('/sessions/:sessionId/summary', getSessionSummary);

/**
 * GET /api/kitchen/display
 * Kitchen display system - active orders (to_cook, preparing)
 */
router.get('/kitchen/display', getKitchenDisplay);

/**
 * GET /api/tables/status
 * Current table status and occupancy
 */
router.get('/tables/status', getTableStatusOverview);

/**
 * GET /api/reports/daily
 * Daily revenue report
 * Optional: date (YYYY-MM-DD, defaults to today)
 */
router.get('/reports/daily', getDailyReport);

// ======================================
// ERROR HANDLING
// ======================================

router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default router;
