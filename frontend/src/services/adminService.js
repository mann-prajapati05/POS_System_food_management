import api from './api';

export async function listPos() {
  const { data } = await api.get('/admin/pos');
  return data.pos || [];
}

export async function createPos(payload) {
  const { data } = await api.post('/admin/pos', payload);
  return data.pos;
}

export async function updatePos(posId, payload) {
  const { data } = await api.patch(`/admin/pos/${posId}`, payload);
  return data.pos;
}

export async function deletePos(posId, secretCode) {
  const { data } = await api.request({
    method: 'delete',
    url: `/admin/pos/${posId}`,
    data: { secretCode },
  });
  return data;
}

export async function togglePosActive(posId, isActive) {
  const { data } = await api.patch(`/admin/pos/${posId}/toggle-active`, {
    isActive,
  });
  return data.pos;
}

export async function getAdminDashboard(params = {}) {
  const { data } = await api.get('/admin/dashboard', { params });
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

export async function getAdminSessionSummary(sessionId, params = {}) {
  const { data } = await api.get(`/admin/sessions/${sessionId}/summary`, { params });
  return data;
}

export async function openAdminSession(payload = {}) {
  const { data } = await api.post('/admin/sessions/open', payload);
  return data.session;
}

export async function getAdminActiveSession(posId) {
  const params = {
    status: 'active',
    posId,
  };
  const { data } = await api.get('/admin/sessions', { params });
  const sessions = data.sessions || [];
  return sessions[0] || null;
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
