import api from './api';

export async function getCategories() {
  const { data } = await api.get('/staff/categories');
  return data.categories || [];
}

export async function getProducts(params = {}) {
  const { data } = await api.get('/staff/products', { params });
  return data.products || [];
}

export async function getAllProducts(params = {}) {
  const { data } = await api.get('/admin/products', { params });
  return data.products || [];
}

export async function createProduct(payload) {
  const { data } = await api.post('/admin/products', payload);
  return data.product;
}

export async function updateProduct(productId, payload) {
  const { data } = await api.patch(`/admin/products/${productId}`, payload);
  return data.product;
}

export async function deleteProduct(productId, params = {}) {
  const { data } = await api.delete(`/admin/products/${productId}`, { params });
  return data;
}
