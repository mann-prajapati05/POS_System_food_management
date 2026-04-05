import api from './api';

export async function getAllCategories(params = {}) {
  const { data } = await api.get('/admin/categories', { params });
  return data.categories || [];
}

export async function createCategory(payload) {
  const { data } = await api.post('/admin/categories', payload);
  return data.category;
}

export async function updateCategory(categoryId, payload) {
  const { data } = await api.patch(`/admin/categories/${categoryId}`, payload);
  return data.category;
}

export async function deleteCategory(categoryId, params = {}) {
  const { data } = await api.delete(`/admin/categories/${categoryId}`, { params });
  return data;
}
