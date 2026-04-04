/**
 * GLOBAL ERROR HANDLING MIDDLEWARE
 * 
 * Catches errors from routes and sends formatted responses
 * Should be registered LAST in app.use() calls
 * 
 * Usage: app.use(errorHandler);
 */

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 NOT FOUND MIDDLEWARE
 * 
 * Called when route is not found
 * Should be registered BEFORE errorHandler
 * 
 * Usage: app.use(notFoundHandler);
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
};

/**
 * REQUEST LOGGING MIDDLEWARE
 * 
 * Logs all incoming requests
 * Usage: app.use(requestLogger);
 */
export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
};
