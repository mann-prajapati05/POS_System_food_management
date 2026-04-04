import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  assignKitchenOrder,
  getKitchenBoard,
  getKitchenOrderById,
  getKitchenOrders,
  markKitchenItemPrepared,
  updateKitchenOrderStatus,
} from '../controllers/kitchenController.js';

const router = express.Router();

router.use(authenticateToken, authorizeRoles('kitchen'));

router.get('/orders', asyncHandler(getKitchenOrders));
router.get('/board', asyncHandler(getKitchenBoard));
router.get('/orders/:orderId', asyncHandler(getKitchenOrderById));
router.patch('/orders/:orderId/assign', asyncHandler(assignKitchenOrder));
router.patch('/orders/:orderId/items/:itemId/prepared', asyncHandler(markKitchenItemPrepared));
router.patch('/orders/:orderId/status', asyncHandler(updateKitchenOrderStatus));

export default router;
