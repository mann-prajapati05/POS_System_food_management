import express from 'express';
import {
  addOrderItem,
  closeSession,
  createOrder,
  getCurrentSession,
  getOrderStatus,
  getSessionSummary,
  listFloorsAndTables,
  openSession,
  processPayment,
  removeOrderItem,
  sendOrderToKitchen,
  updateOrderItem,
} from '../controllers/staffController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.use(authenticateToken, authorizeRoles('staff'));

router.post('/sessions/open', asyncHandler(openSession));
router.get('/sessions/current', asyncHandler(getCurrentSession));
router.patch('/sessions/current/close', asyncHandler(closeSession));
router.get('/sessions/:sessionId/summary', asyncHandler(getSessionSummary));

router.get('/floors-tables', asyncHandler(listFloorsAndTables));

router.post('/orders', asyncHandler(createOrder));
router.post('/orders/:orderId/items', asyncHandler(addOrderItem));
router.patch('/orders/:orderId/items/:itemId', asyncHandler(updateOrderItem));
router.delete('/orders/:orderId/items/:itemId', asyncHandler(removeOrderItem));
router.patch('/orders/:orderId/send-to-kitchen', asyncHandler(sendOrderToKitchen));
router.get('/orders/:orderId/status', asyncHandler(getOrderStatus));
router.post('/orders/:orderId/payment', asyncHandler(processPayment));

export default router;