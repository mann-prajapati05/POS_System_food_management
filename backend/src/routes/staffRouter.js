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
import {
  requireAuth,
  attachPOSContext,
  authorizeRole,
  enforceActiveSession,
} from '../middleware/authMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.use(requireAuth, attachPOSContext, authorizeRole('staff'));

router.post('/sessions/open', asyncHandler(openSession));
router.get('/sessions/current', asyncHandler(getCurrentSession));
router.patch('/sessions/current/close', asyncHandler(closeSession));
router.get('/sessions/:sessionId/summary', asyncHandler(getSessionSummary));

router.get('/floors-tables', asyncHandler(listFloorsAndTables));

router.post('/orders', enforceActiveSession, asyncHandler(createOrder));
router.post('/orders/:orderId/items', enforceActiveSession, asyncHandler(addOrderItem));
router.patch('/orders/:orderId/items/:itemId', enforceActiveSession, asyncHandler(updateOrderItem));
router.delete('/orders/:orderId/items/:itemId', enforceActiveSession, asyncHandler(removeOrderItem));
router.patch('/orders/:orderId/send-to-kitchen', enforceActiveSession, asyncHandler(sendOrderToKitchen));
router.get('/orders/:orderId/status', asyncHandler(getOrderStatus));
router.post('/orders/:orderId/payment', enforceActiveSession, asyncHandler(processPayment));

export default router;