import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// 带 token 的请求实例
const authApi = axios.create({
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
      localStorage.removeItem('fucai_token');
      localStorage.removeItem('fucai_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ===== 需求管理（所有人可操作） =====

export function getRequirements(params = {}) {
  return api.get('/requirements/', { params });
}

export function getRequirement(id) {
  return api.get(`/requirements/${id}`);
}

export function createRequirement(data) {
  return api.post('/requirements/', data);
}

export function updateRequirement(id, data) {
  return api.put(`/requirements/${id}`, data);
}

export function deleteRequirement(id) {
  return api.delete(`/requirements/${id}`);
}

// ===== 工单管理（增删改上传需 admin） =====

export function getWorkOrders(params = {}) {
  return authApi.get('/work-orders/', { params });
}

export function getWorkOrder(id) {
  return authApi.get(`/work-orders/${id}`);
}

export function createWorkOrder(data) {
  return authApi.post('/work-orders/', data);
}

export function updateWorkOrder(id, data) {
  return authApi.put(`/work-orders/${id}`, data);
}

export function deleteWorkOrder(id) {
  return authApi.delete(`/work-orders/${id}`);
}

// ===== 上传清单 =====

export function uploadWorkOrders(file) {
  const formData = new FormData();
  formData.append('file', file);
  return authApi.post('/work-orders/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
}

// ===== 工单城市列表 =====

export function getBusinessLocationCities() {
  return authApi.get('/work-orders/cities');
}

// ===== 统计分析 =====

export function getStatisticsTotal() {
  return authApi.get('/statistics/total');
}

export function getStatisticsByOperationType() {
  return authApi.get('/statistics/by-operation-type');
}

export function getStatisticsByProductCategory() {
  return authApi.get('/statistics/by-product-category');
}

export function getStatisticsByStatus() {
  return authApi.get('/statistics/by-status');
}

export function getStatisticsByCity() {
  return authApi.get('/statistics/by-city');
}

export function getStatisticsActiveByCity() {
  return authApi.get('/statistics/active-by-city');
}

export function getStatisticsCrossOperationCategory() {
  return authApi.get('/statistics/cross-operation-category');
}
