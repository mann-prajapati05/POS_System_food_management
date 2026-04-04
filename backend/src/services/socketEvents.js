/**
 * Socket.IO Event Emitter
 * 
 * Centralized event broadcasting for real-time updates
 * Events: order_created, order_sent_to_kitchen, order_status_updated, 
 *         payment_completed, table_status_changed, session_closed
 */

let io = null;

export function initializeSocketIO(socketIOInstance) {
  io = socketIOInstance;
  console.log('✅ Socket.IO initialized for event broadcasting');
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocketIO() first.');
  }
  return io;
}

/**
 * Broadcast order created event
 * @param {Object} order - Order details
 * @param {string} sessionId - Session ID
 */
export function emitOrderCreated(order, sessionId) {
  if (!io) return;
  io.to(`session:${sessionId}`).emit('order_created', {
    orderId: order.id,
    tableId: order.table_id,
    status: order.status,
    createdAt: order.created_at,
    total: order.total,
  });
}

/**
 * Broadcast order sent to kitchen
 * @param {string} orderId - Order ID
 * @param {string} sessionId - Session ID
 * @param {Array} items - Order items
 */
export function emitOrderSentToKitchen(orderId, sessionId, items) {
  if (!io) return;
  // Broadcast to kitchen staff
  io.to('role:kitchen').emit('order_sent_to_kitchen', {
    orderId,
    items,
    timestamp: new Date().toISOString(),
  });
  // Broadcast to session staff
  io.to(`session:${sessionId}`).emit('order_sent_to_kitchen', {
    orderId,
    status: 'to_cook',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast order status change (kitchen updates)
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New status (preparing|completed)
 * @param {string} sessionId - Session ID
 */
export function emitOrderStatusUpdated(orderId, newStatus, sessionId) {
  if (!io) return;
  io.to(`session:${sessionId}`).emit('order_status_updated', {
    orderId,
    status: newStatus,
    timestamp: new Date().toISOString(),
  });
  if (newStatus === 'completed') {
    io.to('role:kitchen').emit('order_status_updated', {
      orderId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });
  }
}

export function emitKitchenOrderAssigned(orderId, kitchenUserId, sessionId) {
  if (!io) return;
  io.to('role:kitchen').emit('kitchen_order_assigned', {
    orderId,
    kitchenUserId,
    timestamp: new Date().toISOString(),
  });
  io.to(`session:${sessionId}`).emit('kitchen_order_assigned', {
    orderId,
    kitchenUserId,
    timestamp: new Date().toISOString(),
  });
}

export function emitOrderItemPrepared(orderId, itemId, sessionId, preparedBy) {
  if (!io) return;
  io.to('role:kitchen').emit('order_item_prepared', {
    orderId,
    itemId,
    preparedBy,
    timestamp: new Date().toISOString(),
  });
  io.to(`session:${sessionId}`).emit('order_item_prepared', {
    orderId,
    itemId,
    preparedBy,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast payment completed
 * @param {string} orderId - Order ID
 * @param {string} sessionId - Session ID
 * @param {string} method - Payment method (cash|card|upi)
 * @param {number} amount - Payment amount
 */
export function emitPaymentCompleted(orderId, sessionId, method, amount) {
  if (!io) return;
  io.to(`session:${sessionId}`).emit('payment_completed', {
    orderId,
    method,
    amount,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast table status change
 * @param {string} tableId - Table ID
 * @param {string} status - Table status (available|occupied|reserved)
 * @param {string} sessionId - Session ID
 */
export function emitTableStatusChanged(tableId, status, sessionId) {
  if (!io) return;
  io.to(`session:${sessionId}`).emit('table_status_changed', {
    tableId,
    status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast session closed (end of shift)
 * @param {string} sessionId - Session ID
 * @param {Object} summary - Session summary (revenue, order count, etc)
 */
export function emitSessionClosed(sessionId, summary) {
  if (!io) return;
  io.to(`session:${sessionId}`).emit('session_closed', {
    sessionId,
    summary,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast order item added/updated
 * @param {string} orderId - Order ID
 * @param {string} sessionId - Session ID
 * @param {number} newTotal - Updated order total
 */
export function emitOrderItemChanged(orderId, sessionId, newTotal) {
  if (!io) return;
  io.to(`session:${sessionId}`).emit('order_item_changed', {
    orderId,
    newTotal,
    timestamp: new Date().toISOString(),
  });
  io.to('role:kitchen').emit('order_item_changed', {
    orderId,
    newTotal,
    timestamp: new Date().toISOString(),
  });
}

export default {
  initializeSocketIO,
  getIO,
  emitOrderCreated,
  emitOrderSentToKitchen,
  emitOrderStatusUpdated,
  emitKitchenOrderAssigned,
  emitOrderItemPrepared,
  emitPaymentCompleted,
  emitTableStatusChanged,
  emitSessionClosed,
  emitOrderItemChanged,
};
