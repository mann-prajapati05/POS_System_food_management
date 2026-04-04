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
      isAuthenticated: Boolean(parsed.token && parsed.user),
    };
  } catch {
    return { token: null, user: null, isAuthenticated: false };
  }
}

function persistAuth(token, user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

function clearPersistedAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

const initialState = loadStoredAuth();

const useAuthStore = create((set) => ({
  token: initialState.token,
  user: initialState.user,
  isAuthenticated: initialState.isAuthenticated,

  setAuth: ({ token, user }) => {
    persistAuth(token, user);
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    clearPersistedAuth();
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

export { STORAGE_KEY };
export default useAuthStore;
