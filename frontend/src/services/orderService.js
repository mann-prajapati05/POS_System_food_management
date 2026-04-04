import api from './api';

export async function createOrder(payload) {
  const { data } = await api.post('/staff/orders', payload);
  return data.order;
}

export async function getOrder(orderId) {
  const { data } = await api.get(`/staff/orders/${orderId}`);
  return data.order;
}

export async function addOrderItem(orderId, payload) {
  const { data } = await api.post(`/staff/orders/${orderId}/items`, payload);
  return data;
}

export async function updateOrderItem(orderId, itemId, payload) {
  const { data } = await api.patch(`/staff/orders/${orderId}/items/${itemId}`, payload);
  return data;
}

export async function removeOrderItem(orderId, itemId) {
  const { data } = await api.delete(`/staff/orders/${orderId}/items/${itemId}`);
  return data;
}

export async function sendOrderToKitchen(orderId) {
  const { data } = await api.patch(`/staff/orders/${orderId}/send-to-kitchen`);
  return data.order;
}

export async function getSessionOrders(sessionId) {
  const params = sessionId ? { sessionId } : undefined;
  const { data } = await api.get('/staff/orders', { params });
  return data;
}
