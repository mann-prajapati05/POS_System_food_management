import api from './api';

export async function getCategories() {
  const { data } = await api.get('/staff/categories');
  return data.categories || [];
}

export async function getProducts(params = {}) {
  const { data } = await api.get('/staff/products', { params });
  return data.products || [];
}
