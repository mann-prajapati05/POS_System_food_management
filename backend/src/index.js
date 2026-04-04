/**
 * APPLICATION ENTRY POINT
 * 
 * This is the main file that starts the server
 * Run with: npm start
 * 
 * Structure:
 * src/
 * ├── app.js          - Express app configuration
 * ├── index.js        - Entry point (this file)
 * ├── config/         - Configuration (db, etc.)
 * ├── controllers/    - Route controllers
 * ├── routes/         - Route definitions
 * └── middleware/     - Custom middleware
 */

import app, { startServer } from './app.js';
import { closePool } from './config/db.js';

// Start the server
startServer();

// ======================================
// GRACEFUL SHUTDOWN
// ======================================

/**
 * Handle SIGINT (Ctrl+C)
 * Clean up database connections before exiting
 */
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  try {
    await closePool();
    console.log('✓ All resources cleaned up');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
