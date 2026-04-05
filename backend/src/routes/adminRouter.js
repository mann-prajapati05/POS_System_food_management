import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { requireAuth, attachPOSContext, authorizeRole } from '../middleware/authMiddleware.js';
import { uploadProductImage } from '../middleware/uploadMiddleware.js';
import {
  validateRequest,
  validateUuidParam,
  validateAdminPosQuery,
  validateAdminPosBody,
  validatePaymentMethodParam,
  validateOpenSessionBody,
} from '../middleware/validationMiddleware.js';
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
  updateFloor,
  deleteFloor,
  createTable,
  updateTable,
  deleteTable,
  listFloorsTables,
  listPaymentMethods,
  updatePaymentMethod,
  listSessions,
  openPosSession,
  closeActiveSession,
  getAdminSessionSummary,
  getSalesReport,
  getTopProducts,
  getAdminDashboard,
  listPos,
  createPos,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(requireAuth, attachPOSContext, authorizeRole('admin'));

router.get('/dashboard', asyncHandler(getAdminDashboard));
router.get('/pos', asyncHandler(listPos));
router.post('/pos', asyncHandler(createPos));

router.post('/users', validateAdminPosBody, validateRequest, asyncHandler(createUser));
router.get('/users', validateAdminPosQuery, validateRequest, asyncHandler(listUsers));
router.patch('/users/:userId', validateUuidParam('userId'), validateAdminPosBody, validateRequest, asyncHandler(updateUser));
router.delete('/users/:userId', validateUuidParam('userId'), validateAdminPosQuery, validateRequest, asyncHandler(deleteUser));

router.post('/categories', validateAdminPosBody, validateRequest, asyncHandler(createCategory));
router.get('/categories', validateAdminPosQuery, validateRequest, asyncHandler(listCategories));
router.patch('/categories/:categoryId', validateUuidParam('categoryId'), validateAdminPosBody, validateRequest, asyncHandler(updateCategory));
router.delete('/categories/:categoryId', validateUuidParam('categoryId'), validateAdminPosQuery, validateRequest, asyncHandler(deleteCategory));

router.post('/products', uploadProductImage.single('image'), validateAdminPosBody, validateRequest, asyncHandler(createProduct));
router.get('/products', validateAdminPosQuery, validateRequest, asyncHandler(listProducts));
router.patch('/products/:productId', uploadProductImage.single('image'), validateUuidParam('productId'), validateAdminPosBody, validateRequest, asyncHandler(updateProduct));
router.patch('/products/:productId/availability', validateUuidParam('productId'), validateAdminPosBody, validateRequest, asyncHandler(updateProductAvailability));
router.delete('/products/:productId', validateUuidParam('productId'), validateAdminPosQuery, validateRequest, asyncHandler(deleteProduct));

router.post('/floors', validateAdminPosBody, validateRequest, asyncHandler(createFloor));
router.patch('/floors/:floorId', validateUuidParam('floorId'), validateAdminPosBody, validateRequest, asyncHandler(updateFloor));
router.delete('/floors/:floorId', validateUuidParam('floorId'), validateAdminPosQuery, validateRequest, asyncHandler(deleteFloor));
router.get('/floors-tables', validateAdminPosQuery, validateRequest, asyncHandler(listFloorsTables));
router.post('/floors/:floorId/tables', validateUuidParam('floorId'), validateAdminPosBody, validateRequest, asyncHandler(createTable));
router.patch('/tables/:tableId', validateUuidParam('tableId'), validateAdminPosBody, validateRequest, asyncHandler(updateTable));
router.delete('/tables/:tableId', validateUuidParam('tableId'), validateAdminPosQuery, validateRequest, asyncHandler(deleteTable));

router.get('/payment-methods', validateAdminPosQuery, validateRequest, asyncHandler(listPaymentMethods));
router.patch('/payment-methods/:method', validatePaymentMethodParam, validateAdminPosBody, validateRequest, asyncHandler(updatePaymentMethod));

router.get('/sessions', validateAdminPosQuery, validateRequest, asyncHandler(listSessions));
router.post('/sessions/open', validateOpenSessionBody, validateAdminPosQuery, validateRequest, asyncHandler(openPosSession));
router.patch('/sessions/current/close', validateAdminPosQuery, validateRequest, asyncHandler(closeActiveSession));
router.get('/sessions/:sessionId/summary', validateUuidParam('sessionId'), validateAdminPosQuery, validateRequest, asyncHandler(getAdminSessionSummary));

router.get('/reports/sales', validateAdminPosQuery, validateRequest, asyncHandler(getSalesReport));
router.get('/reports/top-products', validateAdminPosQuery, validateRequest, asyncHandler(getTopProducts));

export default router;
