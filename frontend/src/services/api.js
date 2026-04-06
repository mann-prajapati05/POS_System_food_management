import axios from 'axios';
import { STORAGE_KEY } from '../store/authStore';

export const ADMIN_POS_CONTEXT_KEY = 'admin_pos_context_id';

//const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8088';
const API_BASE_URL = 'http://localhost:8088';
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch {
      // Ignore malformed local storage content.
    }
  }

  // Admin may operate staff/kitchen flows for a selected POS.
  // Forward selected POS context automatically on those routes.
  const requestUrl = String(config.url || '');
  const isStaffOrKitchenCall = requestUrl.startsWith('/staff') || requestUrl.startsWith('/kitchen');
  if (isStaffOrKitchenCall && raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.role === 'admin') {
        const adminPosId = localStorage.getItem(ADMIN_POS_CONTEXT_KEY);
        if (adminPosId) {
          config.params = { ...(config.params || {}) };
          if (!config.params.posId) {
            config.params.posId = adminPosId;
          }
        }
      }
    } catch {
      // Ignore malformed local storage content.
    }
  }

  return config;
});

export default api;
