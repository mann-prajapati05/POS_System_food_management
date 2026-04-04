import express from 'express';
import {
  addOrderItem,
  closeSession,
  createOrder,
  getOrderDetails,
  getCurrentSession,
  getOrderStatus,
  getSessionSummary,
  listCategories,
  listFloorsAndTables,
  listProducts,
  listSessionOrders,
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
  authenticateToken,
  authorizeRoles,
} from '../middleware/authMiddleware.js';
import {
  validateRequest,
  validateUuidParam,
  validateOpenSessionBody,
  validateOrderItemBody,
  validateOrderItemUpdateBody,
  validatePaymentBody,
} from '../middleware/validationMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.use(authenticateToken, authorizeRoles('staff', 'admin'));

router.post('/sessions/open', validateOpenSessionBody, validateRequest, asyncHandler(openSession));
router.get('/sessions/current', asyncHandler(getCurrentSession));
router.patch('/sessions/current/close', asyncHandler(closeSession));
router.get('/sessions/:sessionId/summary', validateUuidParam('sessionId'), validateRequest, asyncHandler(getSessionSummary));

router.get('/floors-tables', asyncHandler(listFloorsAndTables));
router.get('/categories', asyncHandler(listCategories));
router.get('/products', asyncHandler(listProducts));
router.get('/orders', asyncHandler(listSessionOrders));

router.post('/orders', enforceActiveSession, asyncHandler(createOrder));
router.get('/orders/:orderId', validateUuidParam('orderId'), validateRequest, asyncHandler(getOrderDetails));
router.post('/orders/:orderId/items', enforceActiveSession, validateUuidParam('orderId'), validateOrderItemBody, validateRequest, asyncHandler(addOrderItem));
router.patch('/orders/:orderId/items/:itemId', enforceActiveSession, validateUuidParam('orderId'), validateUuidParam('itemId'), validateOrderItemUpdateBody, validateRequest, asyncHandler(updateOrderItem));
router.delete('/orders/:orderId/items/:itemId', enforceActiveSession, validateUuidParam('orderId'), validateUuidParam('itemId'), validateRequest, asyncHandler(removeOrderItem));
router.patch('/orders/:orderId/send-to-kitchen', enforceActiveSession, validateUuidParam('orderId'), validateRequest, asyncHandler(sendOrderToKitchen));
router.get('/orders/:orderId/status', validateUuidParam('orderId'), validateRequest, asyncHandler(getOrderStatus));
router.post('/orders/:orderId/payment', enforceActiveSession, validateUuidParam('orderId'), validatePaymentBody, validateRequest, asyncHandler(processPayment));

export default router;