import { create } from 'zustand';

const STORAGE_KEY = 'pos_auth';

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { token: null, user: null, isAuthenticated: false };
    }

    const parsed = JSON.parse(raw);
    return {
      token: parsed.token || null,
      user: parsed.user || null,
      adminSecretCode: parsed.adminSecretCode || null,
      isAuthenticated: Boolean(parsed.token && parsed.user),
    };
  } catch {
    return { token: null, user: null, adminSecretCode: null, isAuthenticated: false };
  }
}

function persistAuth(token, user, adminSecretCode = null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, adminSecretCode }));
}

function clearPersistedAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

const initialState = loadStoredAuth();

const useAuthStore = create((set) => ({
  token: initialState.token,
  user: initialState.user,
  adminSecretCode: initialState.adminSecretCode,
  isAuthenticated: initialState.isAuthenticated,

  setAuth: ({ token, user, adminSecretCode }) => {
    persistAuth(token, user, adminSecretCode);
    set({ token, user, adminSecretCode, isAuthenticated: true });
  },

  clearAuth: () => {
    clearPersistedAuth();
    set({ token: null, user: null, adminSecretCode: null, isAuthenticated: false });
  },
}));

export { STORAGE_KEY };
export default useAuthStore;
