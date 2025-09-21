// src/api/client.js
import axios from 'axios';

// Use proxy in development, full URL in production
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/api/'  // This will use the proxy in package.json
  : (process.env.REACT_APP_API_URL || 'http://196.42.127.6:8000/api/');

// Debug logging
console.log('=== CLIENT.JS DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('Calculated BASE_URL:', BASE_URL);
console.log('Is development mode?', process.env.NODE_ENV === 'development');
console.log('Should use proxy?', process.env.NODE_ENV === 'development');

const api = axios.create({
  baseURL: BASE_URL,  // Use the calculated BASE_URL
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

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

  // 🔧 IMPORTANT: Let the browser set multipart boundaries when sending FormData
  // If a global 'application/json' header is present, remove it for FormData.
  if (config.data instanceof FormData) {
    if (config.headers && config.headers['Content-Type']) {
      delete config.headers['Content-Type'];
      console.log('Removed JSON Content-Type for FormData payload');
    }
  }
  
  const auth = getAuthHeader();
  if (auth) {
    config.headers.Authorization = auth;
    console.log('Added auth header:', auth);
  } else {
    console.log('No auth token found');
  }
  
  console.log('Final request config:', config);
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
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
    
    if (error.code === 'ERR_NETWORK') {
      console.error('NETWORK ERROR - Possible causes:');
      console.error('1. CORS not configured on server');
      console.error('2. Server is down or unreachable');
      console.error('3. Incorrect server URL');
      console.error('4. Firewall/network blocking request');
      console.error('5. Proxy not configured correctly');
    }
    
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
