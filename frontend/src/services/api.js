/**
 * API service for making HTTP requests to the backend
 */
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Always get fresh token from localStorage for each request
    const token = localStorage.getItem('access_token');
    
    if (token) {
      // Ensure token is properly formatted (remove any whitespace)
      const cleanToken = token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    } else {
      // If no token, remove from defaults
      delete config.headers.Authorization;
      delete api.defaults.headers.common['Authorization'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh if this IS the refresh request or login/register
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      // If refresh failed, clear everything and redirect
      if (originalRequest.url?.includes('/auth/refresh')) {
        isRefreshing = false;
        processQueue(error, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        // Only redirect if not already on login/register page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          // Use a small delay to prevent redirect loops
          setTimeout(() => {
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
      return Promise.reject(error);
    }

    // If error is 401 or 422 (JWT validation error) and we haven't tried to refresh yet
    if ((error.response?.status === 401 || error.response?.status === 422) && !originalRequest._retry) {
      // Don't try to refresh if this is a login/register request
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      console.log('🔄 Token expired, attempting refresh...');

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          console.log('❌ No refresh token found');
          isRefreshing = false;
          processQueue(error, null);
          // Don't clear tokens or redirect here - let the component handle it
          // This prevents immediate redirect after login
          return Promise.reject(error);
        }

        console.log('📤 Sending refresh request');
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        const { access_token } = response.data;
        if (!access_token) {
          throw new Error('No access token in refresh response');
        }

        localStorage.setItem('access_token', access_token);

        // Update default headers for all future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

        console.log('✅ Token refreshed successfully');
        isRefreshing = false;
        processQueue(null, access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed
        console.error('❌ Token refresh failed:', refreshError.response?.status, refreshError.response?.data);
        isRefreshing = false;
        processQueue(refreshError, null);
        
        // Only clear tokens and redirect if refresh actually failed with auth error
        // Don't redirect immediately - let React Router handle it
        if (refreshError.response?.status === 401 || refreshError.response?.status === 422) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          delete api.defaults.headers.common['Authorization'];
          
          // Use a longer delay and check pathname to prevent redirect loops
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/register') {
            setTimeout(() => {
              // Double check pathname hasn't changed
              if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                // Use window.location.href as last resort
                window.location.href = '/login';
              }
            }, 500);
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updateTheme: (theme) => api.put('/auth/profile/theme', { theme }),
  changePassword: (data) => api.put('/auth/profile/password', data),
};

// Categories API
export const categoriesAPI = {
  getAll: (type) => api.get('/categories', { params: { type } }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  getCalendar: (month, year) => api.get('/transactions/calendar', { params: { month, year } }),
};

// Budgets API
export const budgetsAPI = {
  getAll: (month, year) => api.get('/budgets', { params: { month, year } }),
  getById: (id) => api.get(`/budgets/${id}`),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
  getAlerts: () => api.get('/budgets/alerts'),
};

// Analytics API
export const analyticsAPI = {
  getSummary: (month, year) => api.get('/analytics/summary', { params: { month, year } }),
  getSpendingByCategory: (params) => api.get('/analytics/spending-by-category', { params }),
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getInsights: () => api.get('/analytics/insights'),
};

// Goals API
export const goalsAPI = {
  getAll: (status) => api.get('/goals', { params: { status } }),
  getById: (id) => api.get(`/goals/${id}`),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  contribute: (id, amount) => api.post(`/goals/${id}/contribute`, { amount }),
  delete: (id) => api.delete(`/goals/${id}`),
};

// Groups API
export const groupsAPI = {
  getAll: () => api.get('/groups'),
  getById: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
  getMembers: (id) => api.get(`/groups/${id}/members`),
  addMember: (id, data) => api.post(`/groups/${id}/members`, data),
  removeMember: (groupId, memberId) => api.delete(`/groups/${groupId}/members/${memberId}`),
};

export default api;
