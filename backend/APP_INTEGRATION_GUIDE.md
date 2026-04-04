/\*\*

- EXPRESS APPLICATION SETUP GUIDE
- Integration of POS database, routes, and Socket.io
-
- This file shows HOW to integrate all components
- Copy this into your app.js
  \*/

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Database
import { testConnection, closePool } from './db.js';

// Routes
import orderRouter from './routes/orderRouter.js';
import authRouter from './routes/authRouter.js';

dotenv.config();

// ======================================
// EXPRESS APP SETUP
// ======================================
const app = express();
const server = createServer(app);

// CORS Configuration (for frontend access)
app.use(
cors({
origin: process.env.FRONTEND_URL || 'http://localhost:3000',
credentials: true,
})
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================================
// SOCKET.IO REAL-TIME SETUP
// ======================================
const io = new SocketIOServer(server, {
cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
transports: ['websocket', 'polling'],
});

// Make io accessible to routes
app.locals.io = io;

/\*\*

- Socket.io Connection Handler
- Real-time communication for kitchen, tables, payments
  \*/
  io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

// Join user to room (e.g., 'kitchen', 'staff', 'admin')
socket.on('join_room', (role) => {
socket.join(role);
console.log(`  └─ User joined '${role}' room`);
});

// ======================================
// POS WORKFLOW EVENTS
// ======================================

/\*\*

- Order Created
- Broadcast to: admin, staff
- Payload: { orderId, tableId, staffMember, timestamp }
  \*/
  socket.on('order_created', (data) => {
  io.to('admin').to('staff').emit('order_created', data);
  console.log(`📝 Order created:`, data.orderId.substring(0, 8) + '...');
  });

/\*\*

- Send Order to Kitchen
- Broadcast to: kitchen
- Payload: { orderId, tableNumber, items, notes }
  \*/
  socket.on('order_sent_to_kitchen', (data) => {
  io.to('kitchen').emit('order_sent_to_kitchen', data);
  console.log(`👨‍🍳 Kitchen received order:`, data.orderId.substring(0, 8) + '...');
  });

/\*\*

- Order Status Update
- Broadcast to: kitchen, staff, admin, customer_display
- Payload: { orderId, status, tableNumber, timestamp }
  \*/
  socket.on('order*status_updated', (data) => {
  io.to('kitchen')
  .to('staff')
  .to('admin')
  .to(`table*${data.tableId}`)
    .emit('order_status_updated', data);
  console.log(`🔄 Order ${data.status}:`, data.orderId.substring(0, 8) + '...');
  });

/\*\*

- Payment Completed
- Broadcast to: staff, admin
- Payload: { orderId, amount, method, changeAmount }
  \*/
  socket.on('payment_completed', (data) => {
  io.to('admin').to('staff').emit('payment_completed', data);
  console.log(
  `💳 Payment received [${data.method}]:`,
  data.amount,
  'for order',
  data.orderId.substring(0, 8) + '...'
  );
  });

/\*\*

- Table Status Changed
- Broadcast to: admin, staff
- Payload: { tableId, tableNumber, status, floorName }
  \*/
  socket.on('table_status_changed', (data) => {
  io.to('admin').to('staff').emit('table_status_changed', data);
  console.log(
  `🪑 Table ${data.tableNumber} (${data.floorName}): ${data.status}`
  );
  });

socket.on('disconnect', () => {
console.log(`✗ Client disconnected: ${socket.id}`);
});
});

// ======================================
// API ROUTES
// ======================================

/\*\*

- Health Check Endpoint
- GET /health
  \*/
  app.get('/health', (req, res) => {
  res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  database: 'connected',
  });
  });

/\*\*

- Authentication Routes
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
  \*/
  app.use('/api/auth', authRouter);

/\*\*

- Order Management Routes
- POST /api/orders - Create order
- GET /api/orders/:id - Get order
- POST /api/orders/:id/items - Add items
- PATCH /api/orders/:id/send-to-kitchen - Send to kitchen
- PATCH /api/orders/:id/status - Update status
- POST /api/orders/:id/payment - Process payment
- GET /api/sessions/:id/summary - Session summary
- GET /api/kitchen/display - Kitchen queue
- GET /api/tables/status - Table status
- GET /api/reports/daily - Daily report
  \*/
  app.use('/api/orders', orderRouter);

// ======================================
// MIDDLEWARE FOR CATCHING UNKNOWN ROUTES
// ======================================
app.use((req, res) => {
res.status(404).json({
error: 'Route not found',
path: req.path,
method: req.method,
});
});

// ======================================
// GLOBAL ERROR HANDLER
// ======================================
app.use((err, req, res, next) => {
console.error('Global error handler:', err);
res.status(err.status || 500).json({
error: err.message || 'Internal server error',
...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
});
});

// ======================================
// SERVER STARTUP
// ======================================
const PORT = process.env.PORT || 3000;

async function startServer() {
try {
// Test database connection
console.log('\n=== Starting Restaurant POS Backend ===\n');
await testConnection();

    // Start server
    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`✓ Real-time events: Socket.io enabled\n`);
    });

} catch (err) {
console.error('Failed to start server:', err);
process.exit(1);
}
}

// ======================================
// GRACEFUL SHUTDOWN
// ======================================
process.on('SIGINT', async () => {
console.log('\n\n🛑 Shutting down gracefully...');
server.close(() => {
console.log('✓ Server closed');
});
await closePool();
process.exit(0);
});

// Start application
startServer();

export default app;

/\*\*

- ======================================
- USAGE EXAMPLES
- ======================================
-
- 1.  CREATE ORDER:
-
- POST /api/orders
- {
-      "sessionId": "uuid",
-      "tableId": "uuid",
-      "staffId": "uuid",
-      "notes": "No onion"
- }
-
- Response:
- {
-      "message": "Order created successfully",
-      "order": {
-        "id": "uuid",
-        "status": "draft",
-        "created_at": "2026-04-04T10:30:00Z",
-        "total_price": 0
-      }
- }
-
- ======================================
-
- 2.  ADD ITEMS TO ORDER:
-
- POST /api/orders/{orderId}/items
- {
-      "productId": "uuid",
-      "quantity": 2
- }
-
- ======================================
-
- 3.  SEND TO KITCHEN:
-
- PATCH /api/orders/{orderId}/send-to-kitchen
- Body (optional):
- {
-      "kitchenStaffId": "uuid"
- }
-
- Socket event emitted:
- io.emit('order_sent_to_kitchen', { orderId, items, table })
-
- ======================================
-
- 4.  PROCESS PAYMENT:
-
- POST /api/orders/{orderId}/payment
- {
-      "method": "cash",
-      "amount": 399.99
- }
-
- Socket event emitted:
- io.emit('payment_completed', { orderId, amount, method })
-
- ======================================
-
- 5.  GET SESSION SUMMARY:
-
- GET /api/sessions/{sessionId}/summary
-
- Response:
- {
-      "id": "uuid",
-      "status": "open",
-      "total_orders": 12,
-      "total_revenue": 4799.88,
-      "payment_breakdown": [
-        { "method": "cash", "count": 8, "total": 3200.00 },
-        { "method": "card", "count": 4, "total": 1599.88 }
-      ]
- }
-
- ======================================
-
- FRONTEND SOCKET.IO EXAMPLES:
-
- // Connect
- const socket = io('http://localhost:3000');
-
- // Join kitchen room
- socket.emit('join_room', 'kitchen');
-
- // Listen for new orders
- socket.on('order_sent_to_kitchen', (data) => {
- console.log('New order:', data.items);
- // Update kitchen display
- });
-
- // Listen for status updates
- socket.on('order_status_updated', (data) => {
- console.log('Order status:', data.status);
- // Update customer display
- });
-
- // Listen for payments
- socket.on('payment_completed', (data) => {
- console.log('Payment received:', data.amount);
- // Update table status
- });
  \*/
