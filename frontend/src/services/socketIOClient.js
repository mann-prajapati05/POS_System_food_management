// /**
//  * Socket.IO Integration Guide for Frontend
//  * 
//  * Real-time event handling for staff and kitchen dashboards
//  * Install socket.io-client: npm install socket.io-client
//  */

// import io from 'socket.io-client';

// const SOCKET_URL = 'http://localhost:3000';

// // ===== CONNECTION SETUP =====
// const socket = io(SOCKET_URL, {
//   reconnection: true,
//   reconnectionDelay: 1000,
//   reconnectionDelayMax: 5000,
//   reconnectionAttempts: 5,
//   withCredentials: true,  // Important for cookie auth
// });

// // ===== AUTHENTICAT USER & JOIN ROOMS =====

// /**
//  * Call this after successful login/signup
//  * This joins the user to role-based and session-specific rooms
//  */
// export function authenticateSocket(userId, role, sessionId) {
//   socket.emit('user_authenticated', {
//     userId,
//     role,  // 'staff' or 'kitchen'
//     sessionId,
//   });

//   console.log(`✅ Socket authenticated: ${role} in session ${sessionId}`);
// }

// // ===== LISTEN FOR STAFF DASHBOARD EVENTS =====

// /**
//  * New order created at a table
//  * Event: order_created
//  * Data: { orderId, tableId, status, createdAt, total }
//  */
// socket.on('order_created', (data) => {
//   console.log('📝 New order created:', data);
//   // Update staff dashboard with new order
//   // Add order to table display
//   // Play notification sound
// });

// /**
//  * Order sent to kitchen (status: to_cook)
//  * Event: order_sent_to_kitchen
//  * Data: { orderId, items, timestamp }
//  */
// socket.on('order_sent_to_kitchen', (data) => {
//   console.log('👨‍🍳 Order sent to kitchen:', data);
//   // Update staff dashboard - order now in kitchen queue
//   // Mark order as "in kitchen"
// });

// /**
//  * Order status updated (from kitchen: preparing → completed)
//  * Event: order_status_updated
//  * Data: { orderId, status, timestamp }
//  */
// socket.on('order_status_updated', (data) => {
//   console.log('🔄 Order status updated:', data);
//   // Update staff dashboard
//   // If status=completed, show "Ready for pickup"
//   // Notify staff via bell/notification
// });

// /**
//  * Payment completed and table released
//  * Event: payment_completed
//  * Data: { orderId, method, amount, timestamp }
//  */
// socket.on('payment_completed', (data) => {
//   console.log('💳 Payment completed:', data);
//   // Update staff dashboard
//   // Show payment confirmation
//   // Remove order from active orders
//   // Update session total
// });

// /**
//  * Table status changed
//  * Event: table_status_changed
//  * Data: { tableId, status, timestamp }
//  * Status: 'available' | 'occupied' | 'reserved'
//  */
// socket.on('table_status_changed', (data) => {
//   console.log('📍 Table status changed:', data);
//   // Update floor map on staff dashboard
//   // Show table availability/occupancy
//   // Update table color/styling
// });

// /**
//  * Order items modified (added/updated/removed)
//  * Event: order_item_changed
//  * Data: { orderId, newTotal, timestamp }
//  */
// socket.on('order_item_changed', (data) => {
//   console.log('🛒 Order items changed:', data);
//   // Update order total in staff dashboard
//   // Refresh order preview
// });

// /**
//  * Session ended (staff shift ended)
//  * Event: session_closed
//  * Data: { sessionId, summary: { revenue, orderCount, ... }, timestamp }
//  */
// socket.on('session_closed', (data) => {
//   console.log('🔚 Session closed:', data);
//   // Show session summary/report
//   // Disable order creation
//   // Show "Shift ended" message
// });

// // ===== LISTEN FOR KITCHEN DISPLAY EVENTS =====

// /**
//  * New order arrived in kitchen
//  * Event: order_sent_to_kitchen (kitchen receives this too)
//  * Data: { orderId, items, timestamp }
//  */
// socket.on('order_sent_to_kitchen', (data) => {
//   if (/* you are kitchen staff */) {
//     console.log('🆕 New order in kitchen:', data);
//     // Update kitchen display board
//     // Add order card to "To Cook" column
//     // Play alert sound
//     // Show order details (items, table number)
//   }
// });

// /**
//  * Kitchen staff update order status
//  * Example: Mark order as "Preparing"
//  */
// export function updateOrderStatusFromKitchen(orderId, newStatus, sessionId) {
//   socket.emit('kitchen_update', {
//     orderId,
//     status: newStatus,  // 'preparing' | 'completed'
//     sessionId,
//   });
// }

// // ===== CONNECTION STATUS =====

// socket.on('connect', () => {
//   console.log('✅ Connected to server:', socket.id);
// });

// socket.on('disconnect', () => {
//   console.log('⚠️  Disconnected from server');
// });

// socket.on('error', (error) => {
//   console.error('🔴 Socket error:', error);
// });

// // ===== EXAMPLE: STAFF DASHBOARD IMPLEMENTATION =====

// /**
//  * Start listening for staff dashboard updates
//  * Call this when staff logs in
//  */
// export function initStaffDashboard(userId, sessionId) {
//   authenticateSocket(userId, 'staff', sessionId);

//   // Dashboard will now receive real-time updates:
//   // - New orders created
//   // - Orders sent to kitchen
//   // - Kitchen updates order status
//   // - Payments completed
//   // - Table status changes

//   console.log('✅ Staff dashboard initialized with real-time updates');
// }

// /**
//  * Start listening for kitchen display
//  * Call this when kitchen staff logs in
//  */
// export function initKitchenDisplay(userId, sessionId) {
//   authenticateSocket(userId, 'kitchen', sessionId);

//   // Kitchen display will now receive:
//   // - New orders sent to kitchen
//   // - Staff queries (via REST, not Socket.io)

//   console.log('✅ Kitchen display initialized');
// }

// // ===== CLEANUP =====

// export function disconnectSocket() {
//   socket.disconnect();
//   console.log('Socket disconnected');
// }

// export default socket;
