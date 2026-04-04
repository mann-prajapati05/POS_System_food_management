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

export async function listFloorsTables(posId) {
  const params = posId ? { posId } : undefined;
  const { data } = await api.get('/admin/floors-tables', { params });
  return data.floors || [];
}

export async function createFloor(payload) {
  const { data } = await api.post('/admin/floors', payload);
  return data.floor;
}

export async function updateFloor(floorId, payload) {
  const { data } = await api.patch(`/admin/floors/${floorId}`, payload);
  return data.floor;
}

export async function deleteFloor(floorId, params = {}) {
  const { data } = await api.delete(`/admin/floors/${floorId}`, { params });
  return data;
}

export async function createTable(floorId, payload) {
  const { data } = await api.post(`/admin/floors/${floorId}/tables`, payload);
  return data.table;
}

export async function updateTable(tableId, payload) {
  const { data } = await api.patch(`/admin/tables/${tableId}`, payload);
  return data.table;
}

export async function deleteTable(tableId, params = {}) {
  const { data } = await api.delete(`/admin/tables/${tableId}`, { params });
  return data;
}
