import { body, param, query, validationResult } from 'express-validator';

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errorCode: 'VALIDATION_ERROR',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

export const validateUuidParam = (name) =>
  param(name).isUUID().withMessage(`${name} must be a valid UUID`);

export const validateOpenSessionBody = [
  body('notes').optional().isString().withMessage('notes must be a string').isLength({ max: 500 }).withMessage('notes must be at most 500 characters'),
];

export const validateOrderItemBody = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('quantity').isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
];

export const validateOrderItemUpdateBody = [
  body('quantity').isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
];

export const validatePaymentBody = [
  body('method').isIn(['cash', 'card', 'digital', 'upi']).withMessage('Invalid payment method'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('upiReference')
    .if(body('method').equals('upi'))
    .notEmpty()
    .withMessage('upiReference is required for UPI payments'),
];

export const validateKitchenStatusBody = [
  body('status').isIn(['preparing', 'completed']).withMessage('status must be preparing or completed'),
];

export const validateAdminPosQuery = [
  query('posId').optional().isUUID().withMessage('posId must be a valid UUID'),
];

export const validateAdminPosBody = [
  body('posId').optional().isUUID().withMessage('posId must be a valid UUID'),
];

export const validatePaymentMethodParam = [
  param('method').isIn(['cash', 'card', 'digital', 'upi']).withMessage('Invalid payment method'),
];
