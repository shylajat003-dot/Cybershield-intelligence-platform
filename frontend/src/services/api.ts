import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cybershield_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle global auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cybershield_token');
      localStorage.removeItem('cybershield_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
