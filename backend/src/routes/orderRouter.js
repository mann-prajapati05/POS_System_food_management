import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
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
} from '../controllers/orderController.js';

const OrderRouter = express.Router();

// ======================================
// ORDER MANAGEMENT ENDPOINTS
// ======================================

OrderRouter.post('/', asyncHandler(createOrder));
OrderRouter.get('/:orderId', asyncHandler(getOrder));
OrderRouter.post('/:orderId/items', asyncHandler(addOrderItem));
OrderRouter.patch('/:orderId/send-to-kitchen', asyncHandler(sendToKitchen));
OrderRouter.patch('/:orderId/status', asyncHandler(updateOrderStatus));
OrderRouter.post('/:orderId/payment', asyncHandler(processPayment));

// ======================================
// REPORTING & ANALYTICS ENDPOINTS
// ======================================

OrderRouter.get('/sessions/:sessionId/summary', asyncHandler(getSessionSummary));
OrderRouter.get('/kitchen/display', asyncHandler(getKitchenDisplay));
OrderRouter.get('/tables/status', asyncHandler(getTableStatusOverview));
OrderRouter.get('/reports/daily', asyncHandler(getDailyReport));

// ======================================
// ERROR HANDLING
// ======================================

OrderRouter.use((err, req, res, next) => {
  console.error('🔴 Order route error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default OrderRouter;
