import api from './api';

export async function listPos() {
  const { data } = await api.get('/admin/pos');
  return data.pos || [];
}

export async function createPos(payload) {
  const { data } = await api.post('/admin/pos', payload);
  return data.pos;
}

export async function getAdminDashboard() {
  const { data } = await api.get('/admin/dashboard');
  return data;
}

export async function getSalesReport(params = {}) {
  const { data } = await api.get('/admin/reports/sales', { params });
  return data;
}

export async function getTopProducts(params = {}) {
  const { data } = await api.get('/admin/reports/top-products', { params });
  return data.topProducts || [];
}

export async function listSessions(params = {}) {
  const { data } = await api.get('/admin/sessions', { params });
  return data.sessions || [];
}

export async function getSessionSummary(sessionId) {
  const { data } = await api.get(`/admin/sessions/${sessionId}/summary`);
  return data;
}

export async function listUsers(params = {}) {
  const { data } = await api.get('/admin/users', { params });
  return data.users || [];
}
