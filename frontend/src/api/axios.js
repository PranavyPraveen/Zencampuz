import axios from 'axios';

const getApiBaseUrl = () => {
  const { hostname, protocol } = window.location;
  
  // Development: if we're on localhost:3000, we want to hit localhost:8000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8000/api`;
  }
  
  // Development with subdomains: e.g., fefka.localhost:3000 -> fefka.localhost:8000
  if (hostname.endsWith('.localhost')) {
    return `${protocol}//${hostname}:8000/api`;
  }

  // Production: derive from current host (e.g., fefka.campuzcore.com -> api.campuzcore.com or same domain)
  // For now, let's assume the API is on the same host but /api prefix, or use environment variable
  return import.meta.env.VITE_API_BASE_URL || `${protocol}//${hostname}/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
