import api from './api';

export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials);
  return data;
}

export async function signup(payload) {
  const { data } = await api.post('/auth/signup', payload);
  return data;
}

export async function adminSignup(payload) {
  const { data } = await api.post('/auth/admin/signup', payload);
  return data;
}

export async function adminLogin(payload) {
  const { data } = await api.post('/auth/admin/login', payload);
  return data;
}
