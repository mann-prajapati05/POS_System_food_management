import {
  beginTransaction,
  commitTransaction,
  query,
  rollbackTransaction,
} from '../config/db.js';
import {
  emitKitchenOrderAssigned,
  emitOrderItemPrepared,
  emitOrderStatusUpdated,
} from '../services/socketEvents.js';

const VIEWABLE_STATUSES = new Set(['to_cook', 'preparing', 'completed']);

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeStatuses(statusParam) {
  if (!statusParam) return ['to_cook', 'preparing'];
  const statuses = String(statusParam)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (statuses.length === 0) return ['to_cook', 'preparing'];
  for (const status of statuses) {
    if (!VIEWABLE_STATUSES.has(status)) {
      return null;
    }
  }
  return [...new Set(statuses)];
}

async function getOrderProgress(client, orderId) {
  const progressRes = await client.query(
    `SELECT
       COUNT(*)::int AS total_items,
       COUNT(*) FILTER (WHERE is_prepared = true)::int AS prepared_items
     FROM order_items
     WHERE order_id = $1`,
    [orderId]
  );
  return progressRes.rows[0];
}

export async function getKitchenOrders(req, res) {
  try {
    const statuses = normalizeStatuses(req.query.status);
    if (!statuses) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const assignedToMe = String(req.query.assignedToMe || '').toLowerCase() === 'true';
    const values = [statuses];
    const where = ['o.status = ANY($1::text[])'];

    if (assignedToMe) {
      values.push(req.user.id);
      where.push(`o.assigned_kitchen_user = $${values.length}`);
    }

    const result = await query(
      `SELECT
         o.id,
         o.status,
         o.session_id,
         o.table_id,
         o.assigned_kitchen_user,
         ku.name AS assigned_kitchen_user_name,
         o.created_at,
         o.started_at,
         o.completed_at,
         t.table_number,
         f.name AS floor_name,
         COALESCE(
           json_agg(
             json_build_object(
               'itemId', oi.id,
               'productId', oi.product_id,
               'name', p.name,
               'quantity', oi.quantity,
               'isPrepared', oi.is_prepared,
               'preparedAt', oi.prepared_at,
               'preparedBy', oi.prepared_by
             )
             ORDER BY oi.created_at
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items,
         COUNT(oi.id)::int AS total_items,
         COUNT(*) FILTER (WHERE oi.is_prepared = true)::int AS prepared_items
       FROM orders o
       INNER JOIN tables t ON t.id = o.table_id
       INNER JOIN floors f ON f.id = t.floor_id
       LEFT JOIN users ku ON ku.id = o.assigned_kitchen_user
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE ${where.join(' AND ')}
       GROUP BY o.id, ku.name, t.table_number, f.name
       ORDER BY
         CASE o.status WHEN 'to_cook' THEN 1 WHEN 'preparing' THEN 2 ELSE 3 END,
         o.created_at ASC`,
      values
    );

    return res.status(200).json({ orders: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch kitchen orders' });
  }
}

export async function getKitchenBoard(req, res) {
  try {
    const result = await query(
      `SELECT
         o.id,
         o.status,
         o.session_id,
         o.table_id,
         o.assigned_kitchen_user,
         ku.name AS assigned_kitchen_user_name,
         o.created_at,
         o.started_at,
         o.completed_at,
         t.table_number,
         f.name AS floor_name,
         COALESCE(
           json_agg(
             json_build_object(
               'itemId', oi.id,
               'productId', oi.product_id,
               'name', p.name,
               'quantity', oi.quantity,
               'isPrepared', oi.is_prepared,
               'preparedAt', oi.prepared_at,
               'preparedBy', oi.prepared_by
             )
             ORDER BY oi.created_at
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items,
         COUNT(oi.id)::int AS total_items,
         COUNT(*) FILTER (WHERE oi.is_prepared = true)::int AS prepared_items
       FROM orders o
       INNER JOIN tables t ON t.id = o.table_id
       INNER JOIN floors f ON f.id = t.floor_id
       LEFT JOIN users ku ON ku.id = o.assigned_kitchen_user
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.status IN ('to_cook', 'preparing', 'completed')
       GROUP BY o.id, ku.name, t.table_number, f.name
       ORDER BY o.created_at ASC`
    );

    const board = {
      toCook: result.rows.filter((o) => o.status === 'to_cook'),
      preparing: result.rows.filter((o) => o.status === 'preparing'),
      completed: result.rows.filter((o) => o.status === 'completed'),
    };

    return res.status(200).json({ board });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch kitchen board' });
  }
}

export async function getKitchenOrderById(req, res) {
  try {
    const { orderId } = req.params;

    if (!isUuid(orderId)) {
      return res.status(400).json({ error: 'orderId must be a valid UUID' });
    }

    const result = await query(
      `SELECT
         o.id,
         o.status,
         o.session_id,
         o.table_id,
         o.assigned_kitchen_user,
         ku.name AS assigned_kitchen_user_name,
         o.created_at,
         o.started_at,
         o.completed_at,
         t.table_number,
         f.name AS floor_name,
         COALESCE(
           json_agg(
             json_build_object(
               'itemId', oi.id,
               'productId', oi.product_id,
               'name', p.name,
               'quantity', oi.quantity,
               'isPrepared', oi.is_prepared,
               'preparedAt', oi.prepared_at,
               'preparedBy', oi.prepared_by
             )
             ORDER BY oi.created_at
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'::json
         ) AS items,
         COUNT(oi.id)::int AS total_items,
         COUNT(*) FILTER (WHERE oi.is_prepared = true)::int AS prepared_items
       FROM orders o
       INNER JOIN tables t ON t.id = o.table_id
       INNER JOIN floors f ON f.id = t.floor_id
       LEFT JOIN users ku ON ku.id = o.assigned_kitchen_user
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.id = $1
       GROUP BY o.id, ku.name, t.table_number, f.name`,
      [orderId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json({ order: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
}

export async function assignKitchenOrder(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId } = req.params;
    const targetKitchenUserId = req.body.kitchenUserId || req.user.id;

    if (!isUuid(orderId)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'orderId must be a valid UUID' });
    }

    if (!isUuid(targetKitchenUserId)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'kitchenUserId must be a valid UUID' });
    }

    const kitchenUserRes = await client.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
      [targetKitchenUserId, 'kitchen']
    );

    if (!kitchenUserRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Kitchen user not found' });
    }

    const orderRes = await client.query(
      'SELECT id, status, session_id FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );

    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['to_cook', 'preparing'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Only to_cook or preparing orders can be assigned' });
    }

    const updated = await client.query(
      `UPDATE orders
       SET assigned_kitchen_user = $2
       WHERE id = $1
       RETURNING id, status, assigned_kitchen_user, session_id`,
      [orderId, targetKitchenUserId]
    );

    await commitTransaction(client);

    emitKitchenOrderAssigned(orderId, targetKitchenUserId, updated.rows[0].session_id);

    return res.status(200).json({ order: updated.rows[0] });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to assign order' });
  }
}

export async function markKitchenItemPrepared(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId, itemId } = req.params;

    if (!isUuid(orderId) || !isUuid(itemId)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'orderId and itemId must be valid UUIDs' });
    }

    const orderRes = await client.query(
      'SELECT id, status, session_id FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );

    if (!orderRes.rows[0]) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['to_cook', 'preparing'].includes(orderRes.rows[0].status)) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Cannot update items for current order state' });
    }

    const itemRes = await client.query(
      `UPDATE order_items
       SET is_prepared = true,
           prepared_at = CURRENT_TIMESTAMP,
           prepared_by = $3
       WHERE order_id = $1 AND id = $2 AND is_prepared = false
       RETURNING id, order_id, product_id, quantity, is_prepared, prepared_at, prepared_by`,
      [orderId, itemId, req.user.id]
    );

    if (!itemRes.rows[0]) {
      const existingItem = await client.query(
        'SELECT id, is_prepared FROM order_items WHERE order_id = $1 AND id = $2',
        [orderId, itemId]
      );

      if (!existingItem.rows[0]) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Order item not found' });
      }

      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Order item is already marked prepared' });
    }

    let nextStatus = orderRes.rows[0].status;
    if (orderRes.rows[0].status === 'to_cook') {
      const statusUpdate = await client.query(
        `UPDATE orders
         SET status = 'preparing',
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             assigned_kitchen_user = COALESCE(assigned_kitchen_user, $2)
         WHERE id = $1
         RETURNING status`,
        [orderId, req.user.id]
      );
      nextStatus = statusUpdate.rows[0].status;
    }

    const progress = await getOrderProgress(client, orderId);
    await commitTransaction(client);

    emitOrderItemPrepared(orderId, itemId, orderRes.rows[0].session_id, req.user.id);
    if (nextStatus === 'preparing' && orderRes.rows[0].status !== 'preparing') {
      emitOrderStatusUpdated(orderId, 'preparing', orderRes.rows[0].session_id);
    }

    return res.status(200).json({
      item: itemRes.rows[0],
      orderStatus: nextStatus,
      progress,
    });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to update item preparation status' });
  }
}

export async function updateKitchenOrderStatus(req, res) {
  const client = await beginTransaction();
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!isUuid(orderId)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'orderId must be a valid UUID' });
    }

    if (!['preparing', 'completed'].includes(status)) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'status must be preparing or completed' });
    }

    const orderRes = await client.query(
      'SELECT id, status, session_id FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );

    const order = orderRes.rows[0];
    if (!order) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status === 'preparing' && order.status !== 'to_cook') {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Invalid transition. Allowed: to_cook -> preparing' });
    }

    if (status === 'completed' && order.status !== 'preparing') {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Invalid transition. Allowed: preparing -> completed' });
    }

    const progress = await getOrderProgress(client, orderId);

    if (status === 'completed') {
      if (progress.total_items === 0) {
        await rollbackTransaction(client);
        return res.status(409).json({ error: 'Cannot complete order with no items' });
      }
      if (progress.prepared_items < progress.total_items) {
        await rollbackTransaction(client);
        return res.status(409).json({ error: 'All items must be prepared before completing order' });
      }
    }

    const updated = await client.query(
      `UPDATE orders
       SET status = $2,
           started_at = CASE WHEN $2 = 'preparing' THEN COALESCE(started_at, CURRENT_TIMESTAMP) ELSE started_at END,
           completed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
           assigned_kitchen_user = COALESCE(assigned_kitchen_user, $3)
       WHERE id = $1
       RETURNING id, status, started_at, completed_at, assigned_kitchen_user, session_id`,
      [orderId, status, req.user.id]
    );

    await commitTransaction(client);

    emitOrderStatusUpdated(orderId, status, updated.rows[0].session_id);

    return res.status(200).json({
      order: updated.rows[0],
      progress,
    });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
}
