import crypto from 'crypto';
import axios from 'axios';
import {
  beginTransaction,
  commitTransaction,
  query,
  rollbackTransaction,
} from '../config/db.js';
import {
  emitPaymentCompleted,
  emitTableStatusChanged,
} from '../services/socketEvents.js';

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured');
  }

  return { keyId, keySecret };
}

async function razorpayRequest({ method, path, data }) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await axios({
    method,
    url: `https://api.razorpay.com/v1${path}`,
    data,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  return response.data;
}

function mapRazorpayMethodToPaymentType(method, fallback = 'card') {
  if (method === 'upi') return 'upi';
  if (method === 'card' || method === 'netbanking' || method === 'wallet' || method === 'emi') return 'card';
  return fallback === 'upi' ? 'upi' : 'card';
}

export async function createRazorpayOrder(req, res) {
  try {
    const posId = req.user.posId;
    const { order_id: orderId, amount, payment_type: paymentType } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    const requestedAmount = Number(amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const normalizedType = paymentType === 'upi' ? 'upi' : 'card';

    const orderRes = await query(
      `SELECT id, pos_id, status, total_price
       FROM orders
       WHERE id = $1 AND pos_id = $2`,
      [orderId, posId]
    );

    const order = orderRes.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'paid') {
      return res.status(409).json({ error: 'Order is already paid' });
    }

    if (order.status !== 'completed') {
      return res.status(409).json({ error: 'Order must be completed before payment' });
    }

    const total = Number(order.total_price || 0);
    if (Math.abs(total - requestedAmount) > 0.01) {
      return res.status(400).json({ error: 'Amount must match order total' });
    }

    const amountPaise = Math.round(total * 100);
    const razorOrder = await razorpayRequest({
      method: 'post',
      path: '/orders',
      data: {
      amount: amountPaise,
      currency: 'INR',
      receipt: String(order.id).replace(/-/g, '').slice(0, 40),
      notes: {
        pos_order_id: order.id,
        pos_id: posId,
      },
      },
    });

    await query(
      `INSERT INTO payments (
         pos_id,
         order_id,
         method,
         payment_type,
         status,
         amount,
         razorpay_order_id,
         updated_at
       ) VALUES ($1, $2, $3, $3, 'pending', $4, $5, CURRENT_TIMESTAMP)`,
      [posId, order.id, normalizedType, total, razorOrder.id]
    );

    return res.status(200).json({
      razorpay_order_id: razorOrder.id,
      amount: razorOrder.amount,
      currency: razorOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create Razorpay order' });
  }
}

export async function verifyRazorpayPayment(req, res) {
  const client = await beginTransaction();
  try {
    const posId = req.user.posId;
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required' });
    }

    const { keySecret } = getRazorpayCredentials();

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const paymentRes = await client.query(
      `SELECT id, order_id, amount, method, payment_type, status
       FROM payments
       WHERE pos_id = $1
         AND razorpay_order_id = $2
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [posId, razorpayOrderId]
    );

    const payment = paymentRes.rows[0];
    if (!payment) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Pending payment record not found for Razorpay order' });
    }

    if (payment.status === 'completed') {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Payment already verified' });
    }

    const orderRes = await client.query(
      `SELECT id, status, total_price, table_id, session_id
       FROM orders
       WHERE id = $1 AND pos_id = $2
       FOR UPDATE`,
      [payment.order_id, posId]
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
      return res.status(409).json({ error: 'Order must be completed before payment verification' });
    }

    const paymentDetails = await razorpayRequest({
      method: 'get',
      path: `/payments/${razorpayPaymentId}`,
    });

    const paidAmountRupees = Number(paymentDetails.amount || 0) / 100;
    const expectedAmountRupees = Number(order.total_price || 0);
    if (Math.abs(paidAmountRupees - expectedAmountRupees) > 0.01) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Paid amount mismatch for order' });
    }

    const paymentType = mapRazorpayMethodToPaymentType(paymentDetails.method, payment.payment_type || payment.method);

    const updatedPayment = await client.query(
      `UPDATE payments
       SET method = $2,
           payment_type = $2,
           status = 'completed',
           amount = $3,
           transaction_id = $4,
           razorpay_payment_id = $4,
           razorpay_order_id = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [payment.id, paymentType, expectedAmountRupees, razorpayPaymentId, razorpayOrderId]
    );

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND pos_id = $2
       RETURNING id, status, total_price, paid_at, table_id`,
      [order.id, posId]
    );

    await client.query(
      'UPDATE tables SET status = $1 WHERE id = $2 AND pos_id = $3',
      ['available', order.table_id, posId]
    );

    await client.query(
      `UPDATE pos_sessions
       SET total_sales = COALESCE(total_sales, 0) + $2,
           total_orders = COALESCE(total_orders, 0) + 1
       WHERE id = $1 AND pos_id = $3`,
      [order.session_id, expectedAmountRupees, posId]
    );

    await commitTransaction(client);

    emitPaymentCompleted(order.id, order.session_id, paymentType, expectedAmountRupees);
    emitTableStatusChanged(order.table_id, 'available', order.session_id);

    return res.status(200).json({
      payment: updatedPayment.rows[0],
      order: updatedOrder.rows[0],
    });
  } catch (err) {
    await rollbackTransaction(client);
    return res.status(500).json({ error: err.message || 'Failed to verify Razorpay payment' });
  }
}
