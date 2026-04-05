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

function parsePreparedQuantityFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return 0;
  try {
    const parsed = JSON.parse(notes);
    const value = Number(parsed?.preparedQuantity || 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function normalizePreparedQuantity(itemRow) {
  const quantity = Number(itemRow?.quantity || 0);
  const parsedPrepared = parsePreparedQuantityFromNotes(itemRow?.notes);
  const prepared = Math.max(parsedPrepared, itemRow?.is_prepared ? quantity : 0);
  return Math.min(prepared, quantity);
}

function serializePreparedQuantity(preparedQuantity) {
  const safe = Math.max(0, Number(preparedQuantity || 0));
  if (!safe) return null;
  return JSON.stringify({ preparedQuantity: safe });
}

export async function openSession(req, res) {
  try {
    const staffId = req.user.id;
    const posId = req.user.posId;
    const { notes } = req.body || {};

    const existing = await query(
      `SELECT id, pos_id, status, opened_at, notes
       FROM pos_sessions
       WHERE pos_id = $1 AND status = 'active'
       ORDER BY opened_at DESC LIMIT 1`,
      [posId]
    );

    if (existing.rows[0]) {
      return res.status(409).json({ error: 'An active session already exists for this POS', session: existing.rows[0] });
    }

    const created = await query(
      `INSERT INTO pos_sessions (pos_id, opened_by, status, notes)
       VALUES ($1, $2, 'active', $3)
       RETURNING id, pos_id, opened_by, status, notes, opened_at`,
      [posId, staffId, notes || null]
    );

    console.log(`SESSION_OPENED pos=${posId} session=${created.rows[0].id} user=${staffId}`);

    return res.status(201).json({ session: created.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to open session' });
  }
}

export async function getCurrentSession(req, res) {
  try {
    const posId = req.user.posId;
    const result = await query(
      `SELECT id, pos_id, opened_by, closed_by, status, notes, opened_at, closed_at
       FROM pos_sessions
       WHERE pos_id = $1
       ORDER BY opened_at DESC LIMIT 1`,
      [posId]
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
    const posId = req.user.posId;
    const active = await query(
      `SELECT id FROM pos_sessions
       WHERE pos_id = $1 AND status = 'active'
       ORDER BY opened_at DESC LIMIT 1`,
      [posId]
    );

    if (!active.rows[0]) {
      return res.status(404).json({ error: 'No active session found' });
    }

    const sessionId = active.rows[0].id;

    const openOrdersRes = await query(
      `SELECT COUNT(*)::int AS open_orders
       FROM orders
       WHERE session_id = $1 AND pos_id = $2 AND status != 'paid'`,
      [sessionId, posId]
    );

    if (openOrdersRes.rows[0].open_orders > 0) {
      return res.status(409).json({ error: 'Cannot close session with unpaid or in-progress orders' });
    }

    const summary = await query(
      `SELECT
         COUNT(*) FILTER (WHERE o.status = 'paid') AS paid_orders,
         COALESCE(SUM(o.total_price) FILTER (WHERE o.status = 'paid'), 0) AS total_sales
       FROM orders o
       WHERE o.session_id = $1 AND o.pos_id = $2`,
      [sessionId, posId]
    );

    const closed = await query(
      `UPDATE pos_sessions
       SET status = 'closed',
           closed_by = $4,
           closed_at = CURRENT_TIMESTAMP,
           total_sales = $2,
           total_orders = $3
       WHERE id = $1
       RETURNING id, pos_id, status, opened_at, closed_at, total_sales, total_orders, closed_by`,
      [
        sessionId,
        summary.rows[0].total_sales,
        Number(summary.rows[0].paid_orders || 0),
        staffId,
      ]
    );

    console.log(`SESSION_CLOSED pos=${posId} session=${sessionId} user=${staffId} totalSales=${closed.rows[0].total_sales}`);

    return res.status(200).json({ session: closed.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close session' });
  }
}

export async function listFloorsAndTables(req, res) {
  try {
    const posId = req.user.posId;
    const floorsResult = await query(
      'SELECT id, name, created_at FROM floors WHERE pos_id = $1 ORDER BY name ASC',
      [posId]
    );
    const tablesResult = await query(
      `SELECT
         t.id,
         t.floor_id,
         t.table_number,
         t.seats,
         t.status,
         t.created_at,
         o.id AS active_order_id,
         o.status AS active_order_status
       FROM tables
       t
       LEFT JOIN LATERAL (
         SELECT id, status
         FROM orders
         WHERE table_id = t.id
           AND pos_id = t.pos_id
           AND status != 'paid'
         ORDER BY created_at DESC
         LIMIT 1
       ) o ON TRUE
       WHERE t.pos_id = $1
       ORDER BY t.floor_id, t.table_number`,
      [posId]
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

async function getActiveSessionForPos(posId) {
  const result = await query(
    `SELECT id FROM pos_sessions
     WHERE pos_id = $1 AND status = 'active'
     ORDER BY opened_at DESC LIMIT 1`,
    [posId]
  );
  return result.rows[0]?.id || null;
}

export async function createOrder(req, res) {
  const client = await beginTransaction();
  try {
    const staffId = req.user.id;
    const posId = req.user.posId;
    const { tableId, notes } = req.body;

    if (!tableId) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'tableId is required' });
    }

    if (!isUuid(tableId)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'tableId must be a valid UUID' });
    }

    const sessionRes = await client.query(
      `SELECT id
       FROM pos_sessions
       WHERE pos_id = $1 AND status = 'active'
       ORDER BY opened_at DESC
       LIMIT 1`,
      [posId]
    );
    const sessionId = sessionRes.rows[0]?.id;
    if (!sessionId) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Open a POS session first' });
    }

    const tableRes = await client.query(
      'SELECT id, status FROM tables WHERE id = $1 AND pos_id = $2 FOR UPDATE',
      [tableId, posId]
    );

    if (!tableRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Table not found' });
    }

    const existingOpenOrder = await client.query(
      `SELECT id FROM orders
       WHERE table_id = $1 AND pos_id = $2 AND status != 'paid'
       ORDER BY created_at DESC LIMIT 1`,
      [tableId, posId]
    );

    if (existingOpenOrder.rows[0]) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Table already has an active order' });
    }

    const orderRes = await client.query(
      `INSERT INTO orders (session_id, table_id, created_by, pos_id, status, notes)
       VALUES ($1, $2, $3, $4, 'draft', $5)
       RETURNING id, session_id, table_id, created_by, pos_id, status, total_price, created_at`,
      [sessionId, tableId, staffId, posId, notes || null]
    );

    await client.query('UPDATE tables SET status = $1 WHERE id = $2', ['occupied', tableId]);
    await commitTransaction(client);

    console.log(`ORDER_CREATED pos=${posId} order=${orderRes.rows[0].id} session=${sessionId} user=${staffId}`);

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
    const posId = req.user.posId;
    const { orderId } = req.params;
    const { productId, quantity } = req.body;

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'productId and positive integer quantity are required' });
    }

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 AND pos_id = $2 FOR UPDATE',
      [orderId, posId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['draft', 'pending', 'to_cook', 'preparing', 'completed'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot add items for current order state' });
    }

    const productRes = await client.query(
      'SELECT id, price, is_available FROM products WHERE id = $1 AND pos_id = $2',
      [productId, posId]
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
      'SELECT id, quantity, notes, is_prepared FROM order_items WHERE order_id = $1 AND product_id = $2',
      [orderId, productId]
    );

    let item;
    if (existing.rows[0]) {
      const currentPrepared = normalizePreparedQuantity(existing.rows[0]);
      const nextQuantity = Number(existing.rows[0].quantity || 0) + quantity;
      const updated = await client.query(
        `UPDATE order_items
         SET quantity = $3,
             notes = $4,
             is_prepared = $5
         WHERE order_id = $1 AND product_id = $2
         RETURNING id, order_id, product_id, quantity, price_at_time, notes, is_prepared`,
        [orderId, productId, nextQuantity, serializePreparedQuantity(currentPrepared), currentPrepared >= nextQuantity]
      );
      item = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_time, notes, is_prepared)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id, order_id, product_id, quantity, price_at_time, notes, is_prepared`,
        [orderId, productId, quantity, productRes.rows[0].price, null]
      );
      item = inserted.rows[0];
    }

    if (['to_cook', 'preparing', 'completed'].includes(orderRes.rows[0].status)) {
      await client.query(
        `UPDATE orders
         SET status = 'pending',
             completed_at = NULL
         WHERE id = $1 AND pos_id = $2`,
        [orderId, posId]
      );
    }

    await recalculateOrderTotal(client, orderId);

    const totalRes = await client.query('SELECT total_price FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
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
    const posId = req.user.posId;
    const { orderId, itemId } = req.params;
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 AND pos_id = $2 FOR UPDATE',
      [orderId, posId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['draft', 'pending', 'to_cook', 'preparing', 'completed'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot modify items for current order state' });
    }

    const existingItemRes = await client.query(
      'SELECT id, quantity, notes, is_prepared FROM order_items WHERE id = $1 AND order_id = $2',
      [itemId, orderId]
    );

    if (!existingItemRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order item not found' });
    }

    const currentQuantity = Number(existingItemRes.rows[0].quantity || 0);
    const isKitchenSent = ['to_cook', 'preparing', 'completed'].includes(orderRes.rows[0].status);
    if (isKitchenSent && quantity < currentQuantity) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot decrease quantity after order is sent to kitchen' });
    }

    const currentPrepared = normalizePreparedQuantity(existingItemRes.rows[0]);
    const nextPrepared = Math.min(currentPrepared, quantity);

    const itemRes = await client.query(
      `UPDATE order_items
       SET quantity = $3,
           notes = $4,
           is_prepared = $5
       WHERE id = $1 AND order_id = $2
       RETURNING id, order_id, product_id, quantity, price_at_time, notes, is_prepared`,
      [itemId, orderId, quantity, serializePreparedQuantity(nextPrepared), nextPrepared >= quantity]
    );

    if (!itemRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order item not found' });
    }

    if (['to_cook', 'preparing', 'completed'].includes(orderRes.rows[0].status)) {
      await client.query(
        `UPDATE orders
         SET status = 'pending',
             completed_at = NULL
         WHERE id = $1 AND pos_id = $2`,
        [orderId, posId]
      );
    }

    await recalculateOrderTotal(client, orderId);
    const totalRes = await client.query('SELECT total_price FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
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
    const posId = req.user.posId;
    const { orderId, itemId } = req.params;

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 AND pos_id = $2 FOR UPDATE',
      [orderId, posId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['draft', 'pending'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot remove items after order is sent to kitchen' });
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
    const totalRes = await client.query('SELECT total_price FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
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
    const posId = req.user.posId;
    const { orderId } = req.params;

    const orderRes = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 AND pos_id = $2 FOR UPDATE',
      [orderId, posId]
    );
    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['draft', 'pending', 'to_cook', 'preparing', 'completed'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Invalid order state transition' });
    }

    const countItems = await client.query('SELECT COUNT(*)::int AS count FROM order_items WHERE order_id = $1', [orderId]);
    if (countItems.rows[0].count === 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Cannot send empty order to kitchen' });
    }

    const rawItemsRes = await client.query(
      `SELECT id, quantity, notes, is_prepared
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );

    for (const row of rawItemsRes.rows) {
      const preparedQuantity = normalizePreparedQuantity(row);
      await client.query(
        `UPDATE order_items
         SET notes = $2,
             is_prepared = $3
         WHERE id = $1`,
        [row.id, serializePreparedQuantity(preparedQuantity), preparedQuantity >= Number(row.quantity || 0)]
      );
    }

    const updated = await client.query(
      `UPDATE orders
       SET status = 'to_cook',
           started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           completed_at = NULL
       WHERE id = $1 AND pos_id = $2
       RETURNING id, status, started_at`,
      [orderId, posId]
    );

    const itemsRes = await client.query(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity, oi.price_at_time, oi.notes, oi.is_prepared
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
    await commitTransaction(client);

    if (orderSessionRes.rows[0]) {
      const normalizedItems = itemsRes.rows.map((row) => {
        const preparedQuantity = normalizePreparedQuantity(row);
        return {
          ...row,
          quantity_prepared: preparedQuantity,
          quantity_pending: Math.max(0, Number(row.quantity || 0) - preparedQuantity),
          is_prepared: preparedQuantity >= Number(row.quantity || 0),
        };
      });
      emitOrderSentToKitchen(orderId, orderSessionRes.rows[0].session_id, normalizedItems);
    }
    return res.status(200).json({ order: updated.rows[0] });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to send order to kitchen' });
  }
}

export async function getOrderStatus(req, res) {
  try {
    const posId = req.user.posId;
    const { orderId } = req.params;
    const result = await query(
      `SELECT id, table_id, session_id, pos_id, status, total_price, created_at, started_at, completed_at, paid_at
       FROM orders
       WHERE id = $1 AND pos_id = $2`,
      [orderId, posId]
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
    const posId = req.user.posId;
    const { orderId } = req.params;
    const { method, amount, upiReference } = req.body;
    const normalizedMethod = normalizePaymentMethod(method);

    if (!PAYMENT_METHODS.has(method)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const paymentMethodConfigRes = await client.query(
      'SELECT method, enabled FROM payment_method_settings WHERE pos_id = $1 AND method = $2',
      [posId, normalizedMethod]
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
      'SELECT id, status, total_price, table_id FROM orders WHERE id = $1 AND pos_id = $2 FOR UPDATE',
      [orderId, posId]
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
      `INSERT INTO payments (order_id, pos_id, method, status, amount, upi_reference, change_amount)
       VALUES ($1, $2, $3, 'completed', $4, $5, $6)
       RETURNING id, order_id, pos_id, method, status, amount, upi_reference, change_amount, created_at`,
      [orderId, posId, normalizedMethod, amount, upiReference || null, changeAmount]
    );

    const orderPaidRes = await client.query(
      `UPDATE orders
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND pos_id = $2
       RETURNING id, status, total_price, paid_at, table_id`,
      [orderId, posId]
    );

    const orderSessionRes = await client.query('SELECT session_id FROM orders WHERE id = $1 AND pos_id = $2', [orderId, posId]);
    const sessionId = orderSessionRes.rows[0]?.session_id;

    if (!sessionId) {
      await rollbackTransaction(client);
      return res.status(500).json({ error: 'Order session not found' });
    }

    await client.query('UPDATE tables SET status = $1 WHERE id = $2 AND pos_id = $3', ['available', order.table_id, posId]);
    await client.query(
      `UPDATE pos_sessions
       SET total_sales = COALESCE(total_sales, 0) + $2,
           total_orders = COALESCE(total_orders, 0) + 1
       WHERE id = $1 AND pos_id = $3`,
      [sessionId, Number(order.total_price), posId]
    );
    await commitTransaction(client);

    console.log(`PAYMENT_COMPLETED pos=${posId} order=${orderId} session=${sessionId} method=${normalizedMethod} amount=${amount}`);

    emitPaymentCompleted(orderId, sessionId, normalizedMethod, amount);
    emitTableStatusChanged(order.table_id, 'available', sessionId);

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
    const posId = req.user.posId;

    const sessionRes = await query(
      'SELECT id, opened_by, opened_at, closed_at, status, pos_id FROM pos_sessions WHERE id = $1 AND pos_id = $2',
      [sessionId, posId]
    );
    const session = sessionRes.rows[0];

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const summaryRes = await query(
      `SELECT
         COUNT(*) AS total_orders,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_orders,
         COALESCE(SUM(total_price) FILTER (WHERE status = 'paid'), 0) AS revenue
       FROM orders
       WHERE session_id = $1 AND pos_id = $2`,
      [sessionId, posId]
    );

    const paymentBreakdownRes = await query(
      `SELECT method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE pos_id = $2 AND order_id IN (SELECT id FROM orders WHERE session_id = $1 AND pos_id = $2)
       GROUP BY method`,
      [sessionId, posId]
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

export async function listCategories(req, res) {
  try {
    const posId = req.user.posId;
    const result = await query(
      `SELECT id, name, description
       FROM categories
       WHERE pos_id = $1
       ORDER BY name ASC`,
      [posId]
    );

    return res.status(200).json({ categories: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

export async function listProducts(req, res) {
  try {
    const posId = req.user.posId;
    const { categoryId, q } = req.query;
    const values = [posId];
    const where = ['p.pos_id = $1', 'p.is_available = true'];

    if (categoryId) {
      if (!isUuid(categoryId)) {
        return res.status(400).json({ error: 'categoryId must be a valid UUID' });
      }
      values.push(categoryId);
      where.push(`p.category_id = $${values.length}`);
    }

    if (q) {
      values.push(`%${String(q).trim()}%`);
      where.push(`p.name ILIKE $${values.length}`);
    }

    const result = await query(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.description,
         p.category_id,
         c.name AS category_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.name ASC`,
      values
    );

    return res.status(200).json({ products: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

export async function getOrderDetails(req, res) {
  try {
    const posId = req.user.posId;
    const { orderId } = req.params;

    const orderRes = await query(
      `SELECT
         o.id,
         o.table_id,
         o.session_id,
         o.status,
         o.total_price,
         o.notes,
         o.created_at,
         t.table_number,
         f.name AS floor_name
       FROM orders o
       INNER JOIN tables t ON t.id = o.table_id
       INNER JOIN floors f ON f.id = t.floor_id
       WHERE o.id = $1 AND o.pos_id = $2`,
      [orderId, posId]
    );

    if (!orderRes.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsRes = await query(
      `SELECT
         oi.id,
         oi.product_id,
         p.name AS product_name,
         oi.quantity,
         oi.price_at_time,
         oi.notes,
         oi.is_prepared
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [orderId]
    );

    const normalizedItems = itemsRes.rows.map((row) => {
      const preparedQuantity = normalizePreparedQuantity(row);
      return {
        ...row,
        quantity_prepared: preparedQuantity,
        quantity_pending: Math.max(0, Number(row.quantity || 0) - preparedQuantity),
      };
    });

    return res.status(200).json({
      order: {
        ...orderRes.rows[0],
        items: normalizedItems,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch order details' });
  }
}

export async function listSessionOrders(req, res) {
  try {
    const posId = req.user.posId;
    const { sessionId } = req.query;

    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const sessionRes = await query(
        `SELECT id
         FROM pos_sessions
         WHERE pos_id = $1
         ORDER BY opened_at DESC
         LIMIT 1`,
        [posId]
      );
      targetSessionId = sessionRes.rows[0]?.id;
    }

    if (!targetSessionId) {
      return res.status(200).json({ orders: [] });
    }

    const result = await query(
      `SELECT
         o.id,
         o.table_id,
         t.table_number,
         o.status,
         o.total_price,
         o.created_at,
         o.paid_at,
         CASE WHEN o.status = 'paid' THEN 'paid' ELSE 'unpaid' END AS payment_status,
         COALESCE(
           json_agg(
             json_build_object(
               'itemId', oi.id,
               'name', p.name,
               'quantity', oi.quantity,
               'priceAtTime', oi.price_at_time
             )
             ORDER BY oi.created_at
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM orders o
       INNER JOIN tables t ON t.id = o.table_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.pos_id = $1
         AND o.session_id = $2
       GROUP BY o.id, t.table_number
       ORDER BY o.created_at DESC`,
      [posId, targetSessionId]
    );

    return res.status(200).json({ orders: result.rows, sessionId: targetSessionId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch session orders' });
  }
}