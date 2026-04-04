/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors and pass to Express error middleware
 * Usage: router.post('/path', asyncHandler(async (req, res) => { ... }))
 */

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
