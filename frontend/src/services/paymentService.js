import api from './api';

export async function processOrderPayment(orderId, payload) {
  const { data } = await api.post(`/staff/orders/${orderId}/payment`, payload);
  return data;
}
