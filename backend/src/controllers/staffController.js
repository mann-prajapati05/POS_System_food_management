import {
  beginTransaction,
  commitTransaction,
  query,
  rollbackTransaction,
} from '../config/db.js';
import {
  emitOrderCreated,
  emitOrderSentToKitchen,
  emitTableStatusChanged,
  emitOrderItemChanged,
  emitPaymentCompleted,
} from '../services/socketEvents.js';

const PAYMENT_METHODS = new Set(['cash', 'card', 'digital', 'upi']);

function normalizePaymentMethod(method) {
  return method === 'digital' ? 'card' : method;
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function recalculateOrderTotal(client, orderId) {
  await client.query(
    `UPDATE orders
     SET total_price = COALESCE(
       (SELECT SUM(quantity * price_at_time) FROM order_items WHERE order_id = $1),
       0
     )
     WHERE id = $1`,
    [orderId]
  );
}

export async function openSession(req, res) {
  try {
    const staffId = req.user.id;

    const existing = await query(
      'SELECT id, status, opened_at FROM pos_sessions WHERE opened_by = $1 AND status = $2 ORDER BY opened_at DESC LIMIT 1',
      [staffId, 'open']
    );

    if (existing.rows[0]) {
      return res.status(409).json({
        error: 'An active session already exists for this staff user',
        session: existing.rows[0],
      });
    }

    const created = await query(
      `INSERT INTO pos_sessions (opened_by, status)
       VALUES ($1, 'open')
       RETURNING id, opened_by, status, opened_at`,
      [staffId]
    );

    return res.status(201).json({ session: created.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to open session' });
  }
}

export async function getCurrentSession(req, res) {
  try {
    const staffId = req.user.id;
    const result = await query(
      'SELECT id, opened_by, opened_at, closed_at, status FROM pos_sessions WHERE opened_by = $1 ORDER BY opened_at DESC LIMIT 1',
      [staffId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'No session found' });
    }

    return res.status(200).json({ session: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
}

export async function closeSession(req, res) {
  try {
    const staffId = req.user.id;
    const active = await query(
      'SELECT id FROM pos_sessions WHERE opened_by = $1 AND status = $2 ORDER BY opened_at DESC LIMIT 1',
      [staffId, 'open']
    );

    if (!active.rows[0]) {
      return res.status(404).json({ error: 'No active session found' });
    }

    const sessionId = active.rows[0].id;

    const summary = await query(
      `SELECT
         COUNT(*) FILTER (WHERE o.status = 'paid') AS paid_orders,
         COALESCE(SUM(o.total_price) FILTER (WHERE o.status = 'paid'), 0) AS total_sales
       FROM orders o
       WHERE o.session_id = $1`,
      [sessionId]
    );

    const closed = await query(
      `UPDATE pos_sessions
       SET status = 'closed',
           closed_at = CURRENT_TIMESTAMP,
           total_sales = $2,
           total_orders = $3
       WHERE id = $1
       RETURNING id, status, opened_at, closed_at, total_sales, total_orders`,
      [
        sessionId,
        summary.rows[0].total_sales,
        Number(summary.rows[0].paid_orders || 0),
      ]
    );

    return res.status(200).json({ session: closed.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close session' });
  }
}

export async function listFloorsAndTables(req, res) {
  try {
    const floorsResult = await query(
      'SELECT id, name, created_at FROM floors ORDER BY name ASC'
    );
    const tablesResult = await query(
      `SELECT id, floor_id, table_number, seats, status, created_at
       FROM tables
       ORDER BY floor_id, table_number`
    );

    const byFloor = new Map();
    for (const floor of floorsResult.rows) {
      byFloor.set(floor.id, { ...floor, tables: [] });
    }

    for (const table of tablesResult.rows) {
      if (byFloor.has(table.floor_id)) {
        byFloor.get(table.floor_id).tables.push(table);
      }
    }

    return res.status(200).json({ floors: [...byFloor.values()] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch floors and tables' });
  }
}

async function getActiveSessionForStaff(staffId) {
  const result = await query(
    'SELECT id FROM pos_sessions WHERE opened_by = $1 AND status = $2 ORDER BY opened_at DESC LIMIT 1',
    [staffId, 'open']
  );
  return result.rows[0]?.id || null;
}

export async function createOrder(req, res) {
  const client = await beginTransaction();
  try {
    const staffId = req.user.id;
    const { tableId, notes } = req.body;

    if (!tableId) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'tableId is required' });
    }

    if (!isUuid(tableId)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'tableId must be a valid UUID' });
    }

    const sessionId = await getActiveSessionForStaff(staffId);
    if (!sessionId) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Open a POS session first' });
    }

    const tableRes = await client.query(
      'SELECT id, status FROM tables WHERE id = $1 FOR UPDATE',
      [tableId]
    );

    if (!tableRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Table not found' });
    }

    const existingOpenOrder = await client.query(
      `SELECT id FROM orders
       WHERE table_id = $1 AND status != 'paid'
       ORDER BY created_at DESC LIMIT 1`,
      [tableId]
    );

    if (existingOpenOrder.rows[0]) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Table already has an active order' });
    }

    const orderRes = await client.query(
      `INSERT INTO orders (session_id, table_id, created_by, status, notes)
       VALUES ($1, $2, $3, 'draft', $4)
       RETURNING id, session_id, table_id, created_by, status, total_price, created_at`,
      [sessionId, tableId, staffId, notes || null]
    );

    await client.query('UPDATE tables SET status = $1 WHERE id = $2', ['occupied', tableId]);
    await commitTransaction(client);

    emitOrderCreated(orderRes.rows[0], sessionId);
    emitTableStatusChanged(tableId, 'occupied', sessionId);

    return res.status(201).json({ order: orderRes.rows[0] });
  } catch (err) {
    await rollbackTransaction(client);
    console.error('createOrder failed:', err.message);
    return res.status(500).json({ error: 'Failed to create order' });
  }
}

export async function addOrderItem(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId } = req.params;
    const { productId, quantity } = req.body;

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'productId and positive integer quantity are required' });
    }

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['draft', 'pending'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot modify items for current order state' });
    }

    const productRes = await client.query(
      'SELECT id, price, is_available FROM products WHERE id = $1',
      [productId]
    );
    if (!productRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!productRes.rows[0].is_available) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Product is not available' });
    }

    const existing = await client.query(
      'SELECT id, quantity FROM order_items WHERE order_id = $1 AND product_id = $2',
      [orderId, productId]
    );

    let item;
    if (existing.rows[0]) {
      const updated = await client.query(
        `UPDATE order_items
         SET quantity = quantity + $3
         WHERE order_id = $1 AND product_id = $2
         RETURNING id, order_id, product_id, quantity, price_at_time`,
        [orderId, productId, quantity]
      );
      item = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
         VALUES ($1, $2, $3, $4)
         RETURNING id, order_id, product_id, quantity, price_at_time`,
        [orderId, productId, quantity, productRes.rows[0].price]
      );
      item = inserted.rows[0];
    }

    await recalculateOrderTotal(client, orderId);

    const totalRes = await client.query('SELECT total_price FROM orders WHERE id = $1', [orderId]);
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1', [orderId]);
    await commitTransaction(client);

    if (orderSessionRes.rows[0]) {
      emitOrderItemChanged(orderId, orderSessionRes.rows[0].session_id, totalRes.rows[0].total_price);
    }
    return res.status(200).json({ item, totalPrice: totalRes.rows[0].total_price });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to add item' });
  }
}

export async function updateOrderItem(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId, itemId } = req.params;
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['draft', 'pending'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot modify items for current order state' });
    }

    const itemRes = await client.query(
      `UPDATE order_items
       SET quantity = $3
       WHERE id = $1 AND order_id = $2
       RETURNING id, order_id, product_id, quantity, price_at_time`,
      [itemId, orderId, quantity]
    );

    if (!itemRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order item not found' });
    }

    await recalculateOrderTotal(client, orderId);
    const totalRes = await client.query('SELECT total_price FROM orders WHERE id = $1', [orderId]);
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1', [orderId]);
    await commitTransaction(client);

    if (orderSessionRes.rows[0]) {
      emitOrderItemChanged(orderId, orderSessionRes.rows[0].session_id, totalRes.rows[0].total_price);
    }
    return res.status(200).json({ item: itemRes.rows[0], totalPrice: totalRes.rows[0].total_price });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to update item' });
  }
}

export async function removeOrderItem(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId, itemId } = req.params;

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['draft', 'pending'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot modify items for current order state' });
    }

    const deleted = await client.query(
      'DELETE FROM order_items WHERE id = $1 AND order_id = $2 RETURNING id',
      [itemId, orderId]
    );

    if (!deleted.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order item not found' });
    }

    await recalculateOrderTotal(client, orderId);
    const totalRes = await client.query('SELECT total_price FROM orders WHERE id = $1', [orderId]);
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1', [orderId]);
    await commitTransaction(client);

    if (orderSessionRes.rows[0]) {
      emitOrderItemChanged(orderId, orderSessionRes.rows[0].session_id, totalRes.rows[0].total_price);
    }
    return res.status(200).json({ message: 'Item removed', totalPrice: totalRes.rows[0].total_price });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to remove item' });
  }
}

export async function sendOrderToKitchen(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId } = req.params;

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['draft', 'pending'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Invalid order state transition' });
    }

    const countItems = await client.query('SELECT COUNT(*)::int AS count FROM order_items WHERE order_id = $1', [orderId]);
    if (countItems.rows[0].count === 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Cannot send empty order to kitchen' });
    }

    const updated = await client.query(
      `UPDATE orders
       SET status = 'to_cook',
           started_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, status, started_at`,
      [orderId]
    );

    const itemsRes = await client.query(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity, oi.price_at_time
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1', [orderId]);
    await commitTransaction(client);

    if (orderSessionRes.rows[0]) {
      emitOrderSentToKitchen(orderId, orderSessionRes.rows[0].session_id, itemsRes.rows);
    }
    return res.status(200).json({ order: updated.rows[0] });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to send order to kitchen' });
  }
}

export async function getOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const result = await query(
      `SELECT id, table_id, session_id, status, total_price, created_at, started_at, completed_at, paid_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json({ order: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch order status' });
  }
}

export async function processPayment(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId } = req.params;
    const { method, amount, upiReference } = req.body;
    const normalizedMethod = normalizePaymentMethod(method);

    if (!PAYMENT_METHODS.has(method)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const paymentMethodConfigRes = await client.query(
      'SELECT method, enabled FROM payment_method_settings WHERE method = $1',
      [normalizedMethod]
    );

    if (!paymentMethodConfigRes.rows[0] || paymentMethodConfigRes.rows[0].enabled !== true) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: `Payment method ${normalizedMethod} is currently disabled` });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    if (normalizedMethod === 'upi' && !upiReference) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'upiReference is required for UPI payments' });
    }

    const orderRes = await client.query(
      'SELECT id, status, total_price, table_id FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    const order = orderRes.rows[0];

    if (!order) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'paid') {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Order is already paid' });
    }

    if (order.status !== 'completed') {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Order must be completed before payment' });
    }

    if (Number(amount) < Number(order.total_price)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Payment amount is less than order total' });
    }

    const changeAmount = Number(amount) - Number(order.total_price);

    const paymentRes = await client.query(
      `INSERT INTO payments (order_id, method, status, amount, upi_reference, change_amount)
       VALUES ($1, $2, 'completed', $3, $4, $5)
       RETURNING id, order_id, method, status, amount, upi_reference, change_amount, created_at`,
      [orderId, normalizedMethod, amount, upiReference || null, changeAmount]
    );

    const orderPaidRes = await client.query(
      `UPDATE orders
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, status, total_price, paid_at, table_id`,
      [orderId]
    );

    await client.query('UPDATE tables SET status = $1 WHERE id = $2', ['available', order.table_id]);
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1', [orderId]);
    await commitTransaction(client);

    if (orderSessionRes.rows[0]) {
      emitPaymentCompleted(orderId, orderSessionRes.rows[0].session_id, normalizedMethod, amount);
      emitTableStatusChanged(order.table_id, 'available', orderSessionRes.rows[0].session_id);
    }

    return res.status(200).json({
      payment: paymentRes.rows[0],
      order: orderPaidRes.rows[0],
    });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to process payment' });
  }
}

export async function getSessionSummary(req, res) {
  try {
    const sessionId = req.params.sessionId;
    const staffId = req.user.id;

    const sessionRes = await query(
      'SELECT id, opened_by, opened_at, closed_at, status FROM pos_sessions WHERE id = $1',
      [sessionId]
    );
    const session = sessionRes.rows[0];

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.opened_by !== staffId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const summaryRes = await query(
      `SELECT
         COUNT(*) AS total_orders,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_orders,
         COALESCE(SUM(total_price) FILTER (WHERE status = 'paid'), 0) AS revenue
       FROM orders
       WHERE session_id = $1`,
      [sessionId]
    );

    const paymentBreakdownRes = await query(
      `SELECT method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE order_id IN (SELECT id FROM orders WHERE session_id = $1)
       GROUP BY method`,
      [sessionId]
    );

    return res.status(200).json({
      session,
      summary: summaryRes.rows[0],
      paymentBreakdown: paymentBreakdownRes.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch session summary' });
  }
}