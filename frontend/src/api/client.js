import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api/'; // prod env optional

//const api = axios.create({ baseURL: BASE_URL });
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api/", // env wins, else local proxy
})

// Build Authorization header (Bearer by default; falls back to Token if needed)
function getAuthHeader() {
  const access = localStorage.getItem('access') || sessionStorage.getItem('access');
  const token  = localStorage.getItem('token')  || sessionStorage.getItem('token');
  if (access) return `Bearer ${access}`; // <- you told me your backend uses Bearer
  if (token)  return `Token ${token}`;   // safe fallback if needed
  return null;
}

api.interceptors.request.use((config) => {
  const auth = getAuthHeader();
  if (auth) config.headers.Authorization = auth;
  return config;
});

// Helpers for saving/clearing tokens
export function saveTokens({ access, refresh, token, remember }) {
  const store = remember ? localStorage : sessionStorage;
  if (access)  store.setItem('access', access);
  if (refresh) store.setItem('refresh', refresh);
  if (token)   store.setItem('token',  token);
}
export function clearTokens() {
  ['access', 'refresh', 'token'].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

export default api;
