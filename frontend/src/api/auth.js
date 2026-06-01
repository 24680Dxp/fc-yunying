import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// ===== 认证 =====

const TOKEN_KEY = 'fucai_token';
const USER_KEY = 'fucai_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAdmin() {
  const user = getUser();
  return user?.role === 'admin';
}

export function saveAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    username: data.username,
    display_name: data.display_name,
    role: data.role,
  }));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function login(data) {
  return api.post('/auth/login', data);
}

export function getMe() {
  return api.get('/auth/me', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
}

// ===== 请求拦截器：自动带 token =====

export const authApi = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

authApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
