/**
 * POS ORDER CONTROLLER
 * 
 * Complete order management for restaurant POS system
 * Covers: Create, Read, Update, Delete, Payment, Reporting
 */

import {
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from '../config/db.js';

/**
 * CREATE ORDER (Draft state)
 * POST /api/orders
 * 
 * Request body:
 * {
 *   sessionId: UUID,
 *   tableId: UUID,
 *   staffId: UUID,
 *   notes: string (optional)
 * }
 */
export const createOrder = async (req, res) => {
  try {
    const { sessionId, tableId, staffId, notes } = req.body;

    // Validate input
    if (!sessionId || !tableId || !staffId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify session is open
    const sessionRes = await query(
      'SELECT status FROM pos_sessions WHERE id = $1',
      [sessionId]
    );

    if (!sessionRes.rows[0] || sessionRes.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Session is not open' });
    }

    // Verify table exists
    const tableRes = await query(
      'SELECT id, status FROM tables WHERE id = $1',
      [tableId]
    );

    if (!tableRes.rows[0]) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Create order
    const result = await query(
      `INSERT INTO orders (session_id, table_id, created_by, status, notes, created_at)
       VALUES ($1, $2, $3, 'draft', $4, CURRENT_TIMESTAMP)
       RETURNING id, status, created_at, total_price`,
      [sessionId, tableId, staffId, notes || null]
    );

    res.status(201).json({
      message: 'Order created successfully',
      order: result.rows[0],
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

/**
 * ADD ITEMS TO ORDER
 * POST /api/orders/:orderId/items
 * 
 * Request body:
 * {
 *   productId: UUID,
 *   quantity: number
 * }
 */
export const addOrderItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product or quantity' });
    }

    const client = await beginTransaction();

    try {
      // Get product price
      const productRes = await client.query(
        'SELECT price FROM products WHERE id = $1',
        [productId]
      );

      if (!productRes.rows[0]) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Product not found' });
      }

      const price = productRes.rows[0].price;

      // Add item to order
      const itemRes = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
         VALUES ($1, $2, $3, $4)
         RETURNING id, quantity, price_at_time`,
        [orderId, productId, quantity, price]
      );

      // Update order total
      await client.query(
        `UPDATE orders SET total_price = 
           (SELECT SUM(quantity * price_at_time) FROM order_items WHERE order_id = $1)
         WHERE id = $1`,
        [orderId]
      );

      await commitTransaction(client);

      res.status(201).json({
        message: 'Item added to order',
        item: itemRes.rows[0],
      });
    } catch (err) {
      await rollbackTransaction(client);
      throw err;
    }
  } catch (err) {
    console.error('Add order item error:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
};

/**
 * GET ORDER DETAILS
 * GET /api/orders/:orderId
 */
export const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await query(
      `SELECT 
        o.id, o.session_id, o.table_id, o.status, o.total_price,
        o.notes, o.created_at, o.started_at, o.completed_at, o.paid_at,
        u_staff.name as staff_member,
        u_kitchen.name as kitchen_staff,
        t.table_number, f.name as floor_name
       FROM orders o
       LEFT JOIN users u_staff ON o.created_by = u_staff.id
       LEFT JOIN users u_kitchen ON o.assigned_kitchen_user = u_kitchen.id
       LEFT JOIN tables t ON o.table_id = t.id
       LEFT JOIN floors f ON t.floor_id = f.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get items
    const itemsRes = await query(
      `SELECT oi.id, p.name, oi.quantity, oi.price_at_time,
              (oi.quantity * oi.price_at_time) as total
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    res.json({
      ...result.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to retrieve order' });
  }
};

/**
 * SEND ORDER TO KITCHEN
 * PATCH /api/orders/:orderId/send-to-kitchen
 * 
 * Status flow: draft → pending → to_cook
 */
export const sendToKitchen = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { kitchenStaffId } = req.body;

    const client = await beginTransaction();

    try {
      // Update to PENDING first
      await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2 AND status = $3',
        ['pending', orderId, 'draft']
      );

      // Then to TO_COOK with kitchen assignment
      const result = await client.query(
        `UPDATE orders 
         SET status = $1, assigned_kitchen_user = $2, started_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND status = $4
         RETURNING status, assigned_kitchen_user, started_at`,
        ['to_cook', kitchenStaffId || null, orderId, 'pending']
      );

      if (!result.rows[0]) {
        await rollbackTransaction(client);
        return res.status(400).json({ error: 'Invalid order state for this operation' });
      }

      await commitTransaction(client);

      // TODO: Emit Socket.io event
      // io.emit('order_sent_to_kitchen', { orderId, items: [...], table: ... });

      res.json({
        message: 'Order sent to kitchen',
        order: result.rows[0],
      });
    } catch (err) {
      await rollbackTransaction(client);
      throw err;
    }
  } catch (err) {
    console.error('Send to kitchen error:', err);
    res.status(500).json({ error: 'Failed to send order to kitchen' });
  }
};

/**
 * UPDATE ORDER STATUS (Kitchen use)
 * PATCH /api/orders/:orderId/status
 * 
 * Request body:
 * {
 *   status: 'preparing' | 'completed'
 * }
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['preparing', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date();
    }

    const result = await query(
      `UPDATE orders 
       SET status = $1${status === 'completed' ? ', completed_at = CURRENT_TIMESTAMP' : ''}
       WHERE id = $2
       RETURNING status, started_at, completed_at`,
      [status, orderId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // TODO: Emit Socket.io event
    // io.emit('order_status_updated', { orderId, status, completedAt: result.rows[0].completed_at });

    res.json({
      message: `Order status updated to ${status}`,
      order: result.rows[0],
    });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

/**
 * PROCESS PAYMENT
 * POST /api/orders/:orderId/payment
 * 
 * Request body:
 * {
 *   method: 'cash' | 'card' | 'upi',
 *   amount: number,
 *   upiReference: string (optional, for UPI payments)
 * }
 */
export const processPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { method, amount, upiReference } = req.body;

    const validMethods = ['cash', 'card', 'upi'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const client = await beginTransaction();

    try {
      // Get order
      const orderRes = await client.query(
        'SELECT total_price, table_id FROM orders WHERE id = $1',
        [orderId]
      );

      if (!orderRes.rows[0]) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderAmount = orderRes.rows[0].total_price;

      // Validate amount
      if (method === 'cash' && amount < orderAmount) {
        await rollbackTransaction(client);
        return res.status(400).json({ error: 'Insufficient payment amount' });
      }

      // Create payment
      const paymentRes = await client.query(
        `INSERT INTO payments (order_id, method, status, amount, upi_reference, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id, method, amount, status`,
        [orderId, method, 'completed', amount, upiReference || null]
      );

      // Update order status to PAID
      await client.query(
        'UPDATE orders SET status = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['paid', orderId]
      );

      // Mark table as AVAILABLE
      const changeAmount = method === 'cash' ? amount - orderAmount : 0;
      await client.query(
        'UPDATE tables SET status = $1 WHERE id = $2',
        ['available', orderRes.rows[0].table_id]
      );

      await commitTransaction(client);

      // TODO: Emit Socket.io event
      // io.emit('payment_completed', { orderId, amount, method, changeAmount, timestamp: new Date() });

      res.status(201).json({
        message: 'Payment processed successfully',
        payment: paymentRes.rows[0],
        change: changeAmount,
      });
    } catch (err) {
      await rollbackTransaction(client);
      throw err;
    }
  } catch (err) {
    console.error('Process payment error:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
};

/**
 * GET SESSION SUMMARY
 * GET /api/sessions/:sessionId/summary
 */
export const getSessionSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await query(
      `SELECT 
        ps.id, ps.opened_at, ps.closed_at, ps.status,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_price) as total_revenue,
        AVG(o.total_price) as avg_order_value,
        COUNT(DISTINCT t.id) as tables_used,
        u.name as opened_by
       FROM pos_sessions ps
       LEFT JOIN users u ON ps.opened_by = u.id
       LEFT JOIN orders o ON ps.id = o.session_id
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE ps.id = $1
       GROUP BY ps.id, ps.opened_at, ps.closed_at, ps.status, u.name`,
      [sessionId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const summary = result.rows[0];

    // Payment methods breakdown
    const paymentRes = await query(
      `SELECT method, COUNT(*) as count, SUM(amount) as total
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       WHERE o.session_id = $1 AND p.status = 'completed'
       GROUP BY method`,
      [sessionId]
    );

    summary.payment_breakdown = paymentRes.rows;

    res.json(summary);
  } catch (err) {
    console.error('Get session summary error:', err);
    res.status(500).json({ error: 'Failed to retrieve session summary' });
  }
};

/**
 * GET KITCHEN DISPLAY (Active orders)
 * GET /api/kitchen/display
 */
export const getKitchenDisplay = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM kitchen_display ORDER BY created_at ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get kitchen display error:', err);
    res.status(500).json({ error: 'Failed to retrieve kitchen display' });
  }
};

/**
 * GET TABLE STATUS OVERVIEW
 * GET /api/tables/status
 */
export const getTableStatusOverview = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM table_status_overview ORDER BY floor_name, table_number`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get table status error:', err);
    res.status(500).json({ error: 'Failed to retrieve table status' });
  }
};

/**
 * GENERATE DAILY REPORT
 * GET /api/reports/daily?date=YYYY-MM-DD
 */
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = new Date(date || new Date()).toISOString().split('T')[0];

    const result = await query(
      `SELECT
        COUNT(DISTINCT ps.id) as sessions,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_price) as total_revenue,
        AVG(o.total_price) as avg_order_value,
        MAX(o.total_price) as highest_order,
        MIN(o.total_price) as lowest_order
       FROM pos_sessions ps
       LEFT JOIN orders o ON ps.id = o.session_id
       WHERE DATE(ps.opened_at) = $1`,
      [reportDate]
    );

    res.json({
      date: reportDate,
      summary: result.rows[0],
    });
  } catch (err) {
    console.error('Generate daily report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};
