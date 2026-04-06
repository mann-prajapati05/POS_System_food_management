import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { requireAuth, attachPOSContext, authorizeRole, enforceActiveSession } from '../middleware/authMiddleware.js';
import {
  validateRequest,
  validateUuidParam,
  validateOpenSessionBody,
  validateKitchenStatusBody,
} from '../middleware/validationMiddleware.js';
import {
  assignKitchenOrder,
  getKitchenBoard,
  getKitchenOrderById,
  getKitchenOrders,
  markKitchenItemPrepared,
  updateKitchenOrderStatus,
} from '../controllers/kitchenController.js';
import { getCurrentSession, openSession } from '../controllers/staffController.js';

const router = express.Router();

router.use(requireAuth, attachPOSContext, authorizeRole('kitchen', 'admin'));

router.post('/sessions/open', validateOpenSessionBody, validateRequest, asyncHandler(openSession));
router.get('/sessions/current', asyncHandler(getCurrentSession));

router.get('/orders', asyncHandler(getKitchenOrders));
router.get('/board', asyncHandler(getKitchenBoard));
router.get('/orders/:orderId', validateUuidParam('orderId'), validateRequest, asyncHandler(getKitchenOrderById));
router.patch('/orders/:orderId/assign', enforceActiveSession, validateUuidParam('orderId'), validateRequest, asyncHandler(assignKitchenOrder));
router.patch('/orders/:orderId/items/:itemId/prepared', enforceActiveSession, validateUuidParam('orderId'), validateUuidParam('itemId'), validateRequest, asyncHandler(markKitchenItemPrepared));
router.patch('/orders/:orderId/status', enforceActiveSession, validateUuidParam('orderId'), validateKitchenStatusBody, validateRequest, asyncHandler(updateKitchenOrderStatus));

export default router;
