import api from './api';

export const KITCHEN_STATUS = {
  TO_COOK: 'to_cook',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
};

export async function getOrdersByStatus(statuses) {
  const params = {};
  if (Array.isArray(statuses) && statuses.length > 0) {
    params.status = statuses.join(',');
  }

  const { data } = await api.get('/kitchen/orders', { params });
  return data.orders || [];
}

export async function updateOrderStatus(orderId, status) {
  const { data } = await api.patch(`/kitchen/orders/${orderId}/status`, { status });
  return data.order;
}

export async function updateItemStatus(orderId, itemId) {
  const { data } = await api.patch(`/kitchen/orders/${orderId}/items/${itemId}/prepared`);
  return data;
}
