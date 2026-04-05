import api from './api';

function getSessionScopePath(scope = 'staff') {
  return scope === 'kitchen' ? '/kitchen' : '/staff';
}

export async function getActiveSession(scope = 'staff') {
  try {
    const { data } = await api.get(`${getSessionScopePath(scope)}/sessions/current`);
    return data.session;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function openSession(payload = {}, scope = 'staff') {
  const { data } = await api.post(`${getSessionScopePath(scope)}/sessions/open`, payload);
  return data.session;
}

export async function getSessionSummary(sessionId) {
  const { data } = await api.get(`/staff/sessions/${sessionId}/summary`);
  return data;
}

export async function closeSession() {
  const { data } = await api.patch('/staff/sessions/current/close');
  return data.session;
}
