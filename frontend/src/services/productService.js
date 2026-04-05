import api from './api';

function toProductFormData(payload = {}) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    fd.append(key, value);
  });
  return fd;
}

function shouldUseMultipart(payload = {}) {
  return payload?.image instanceof File;
}

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
  const requestBody = shouldUseMultipart(payload)
    ? toProductFormData(payload)
    : payload;

  const { data } = await api.post('/admin/products', requestBody, shouldUseMultipart(payload)
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined);
  return data.product;
}

export async function updateProduct(productId, payload) {
  const requestBody = shouldUseMultipart(payload)
    ? toProductFormData(payload)
    : payload;

  const { data } = await api.patch(`/admin/products/${productId}`, requestBody, shouldUseMultipart(payload)
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined);
  return data.product;
}

export async function deleteProduct(productId, params = {}) {
  const { data } = await api.delete(`/admin/products/${productId}`, { params });
  return data;
}
