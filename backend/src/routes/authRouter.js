import express from 'express';
import { adminLogin, adminSignup, login, me, signup } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.post('/admin/signup', asyncHandler(adminSignup));
router.post('/admin/login', asyncHandler(adminLogin));
router.get('/me', authenticateToken, asyncHandler(me));

export default router;