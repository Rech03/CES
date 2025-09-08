import api, { saveTokens, clearTokens } from './client';

// POST /api/auth/login/
export async function login(username, password, remember = false, remember_me = false) {
  const { data } = await api.post('auth/login/', { username, password, remember_me });

  // Accept common shapes; we'll send Bearer on next requests
  const token   = data.token ?? null;                      // if backend returns "token"
  const access  = data.access ?? data.key ?? null;         // JWT or custom
  const refresh = data.refresh ?? data.refresh_token ?? null;

  saveTokens({ access, refresh, token, remember });
  return data; // often includes user info
}

export async function logout() {
  try { await api.post('auth/logout/'); } finally { clearTokens(); }
}

export const getProfile     = () => api.get('auth/profile/');
export const updateProfile  = (payload) => api.put('auth/profile/', payload);
export const changePassword = (payload) => api.post('auth/change-password/', payload);
export const getDashboard   = () => api.get('auth/dashboard/');
export const checkEnrollment = (student_number) =>
  api.get('auth/check-enrollment/', { params: { student_number } });
