import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api/';

// Debug logging
console.log('=== CLIENT.JS DEBUG ===');
console.log('process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('BASE_URL fallback:', BASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api/",
})

console.log('API instance created with baseURL:', api.defaults.baseURL);

// Build Authorization header for Django Token Authentication
function getAuthHeader() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) return `Token ${token}`; // Django Token Authentication format
  return null;
}

api.interceptors.request.use((config) => {
  console.log('=== AXIOS REQUEST INTERCEPTOR ===');
  console.log('Request config:', {
    url: config.url,
    method: config.method,
    baseURL: config.baseURL,
    fullURL: config.baseURL + config.url
  });
  
  const auth = getAuthHeader();
  if (auth) {
    config.headers.Authorization = auth;
    console.log('Added auth header:', auth);
  } else {
    console.log('No auth token found');
  }
  
  console.log('Final request config:', config);
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('=== AXIOS RESPONSE SUCCESS ===');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('=== AXIOS RESPONSE ERROR ===');
    console.error('Error config:', error.config);
    console.error('Error response:', error.response);
    console.error('Error message:', error.message);
    if (error.config) {
      console.error('Full URL that failed:', error.config.baseURL + error.config.url);
    }
    return Promise.reject(error);
  }
);

// Helpers for saving/clearing tokens
export function saveTokens({ token, remember }) {
  console.log('=== SAVING TOKENS ===');
  console.log('Token to save:', !!token, 'Remember:', remember);
  
  const store = remember ? localStorage : sessionStorage;
  if (token) store.setItem('token', token);
}

export function clearTokens() {
  console.log('=== CLEARING TOKENS ===');
  ['token'].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

export default api;