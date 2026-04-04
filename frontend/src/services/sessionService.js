import api from './api';

export async function getActiveSession() {
  try {
    const { data } = await api.get('/staff/sessions/current');
    return data.session;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function openSession(payload = {}) {
  const { data } = await api.post('/staff/sessions/open', payload);
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
