import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateToken, authorizeRoles, enforceActiveSession } from '../middleware/authMiddleware.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.use(authenticateToken, authorizeRoles('staff', 'admin'));

router.post('/create-order', enforceActiveSession, asyncHandler(createRazorpayOrder));
router.post('/verify', enforceActiveSession, asyncHandler(verifyRazorpayPayment));

export default router;
