import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory,
  createProduct,
  listProducts,
  updateProduct,
  updateProductAvailability,
  deleteProduct,
  createFloor,
  createTable,
  updateTable,
  listFloorsTables,
  listPaymentMethods,
  updatePaymentMethod,
  listSessions,
  getAdminSessionSummary,
  getSalesReport,
  getTopProducts,
  getAdminDashboard,
  listPos,
  createPos,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.get('/dashboard', asyncHandler(getAdminDashboard));
router.get('/pos', asyncHandler(listPos));
router.post('/pos', asyncHandler(createPos));

router.post('/users', asyncHandler(createUser));
router.get('/users', asyncHandler(listUsers));
router.patch('/users/:userId', asyncHandler(updateUser));
router.delete('/users/:userId', asyncHandler(deleteUser));

router.post('/categories', asyncHandler(createCategory));
router.get('/categories', asyncHandler(listCategories));
router.patch('/categories/:categoryId', asyncHandler(updateCategory));
router.delete('/categories/:categoryId', asyncHandler(deleteCategory));

router.post('/products', asyncHandler(createProduct));
router.get('/products', asyncHandler(listProducts));
router.patch('/products/:productId', asyncHandler(updateProduct));
router.patch('/products/:productId/availability', asyncHandler(updateProductAvailability));
router.delete('/products/:productId', asyncHandler(deleteProduct));

router.post('/floors', asyncHandler(createFloor));
router.get('/floors-tables', asyncHandler(listFloorsTables));
router.post('/floors/:floorId/tables', asyncHandler(createTable));
router.patch('/tables/:tableId', asyncHandler(updateTable));

router.get('/payment-methods', asyncHandler(listPaymentMethods));
router.patch('/payment-methods/:method', asyncHandler(updatePaymentMethod));

router.get('/sessions', asyncHandler(listSessions));
router.get('/sessions/:sessionId/summary', asyncHandler(getAdminSessionSummary));

router.get('/reports/sales', asyncHandler(getSalesReport));
router.get('/reports/top-products', asyncHandler(getTopProducts));

export default router;
