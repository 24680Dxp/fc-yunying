import axios from 'axios';
import { getToken } from './auth';
import qs from 'qs';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  paramsSerializer: (params) => qs.stringify(params, { indices: false, arrayFormat: 'repeat' }),
});

// 带 token 的请求实例
const authApi = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  paramsSerializer: (params) => qs.stringify(params, { indices: false, arrayFormat: 'repeat' }),
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

export function exportRequirements(params = {}) {
  // 直接返回 blob，触发下载
  return authApi.get('/requirements/export', {
    params,
    responseType: 'blob',
  });
}

export function getRequirement(id) {
  return api.get(`/requirements/${id}`);
}

export function createRequirement(data) {
  return authApi.post('/requirements/', data);
}

export function updateRequirement(id, data) {
  return authApi.put(`/requirements/${id}`, data);
}

export function deleteRequirement(id) {
  return authApi.delete(`/requirements/${id}`);
}

export function uploadRequirements(file) {
  const formData = new FormData();
  formData.append('file', file);
  return authApi.post('/requirements/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
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

export function getStatisticsActiveByCityDetail() {
  return authApi.get('/statistics/active-by-city-detail');
}

export function getStatisticsCrossOperationCategory() {
  return authApi.get('/statistics/cross-operation-category');
}

// ===== 建设期统计分析 =====

export function getHistoricalSummary() {
  return authApi.get('/statistics/historical-summary');
}

export function getHistoricalByCity() {
  return authApi.get('/statistics/historical-by-city');
}

export function getHistoricalInternetStatus() {
  return authApi.get('/statistics/historical-internet-status');
}

export function getHistoricalQlStatus() {
  return authApi.get('/statistics/historical-ql-status');
}

// ===== 全周期统计 =====

export function getFullcycleSummary() {
  return authApi.get('/statistics/fullcycle-summary');
}

export function getFullcycleByCity() {
  return authApi.get('/statistics/fullcycle-by-city');
}

// ===== 历史工单管理 =====

export function getHistoricalWorkOrders(params = {}) {
  return authApi.get('/historical-work-orders/', { params });
}

export function createHistoricalWorkOrder(data) {
  return authApi.post('/historical-work-orders/', data);
}

export function updateHistoricalWorkOrder(id, data) {
  return authApi.put(`/historical-work-orders/${id}`, data);
}

export function deleteHistoricalWorkOrder(id) {
  return authApi.delete(`/historical-work-orders/${id}`);
}

export function uploadHistoricalWorkOrders(file) {
  const formData = new FormData();
  formData.append('file', file);
  return authApi.post('/historical-work-orders/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
}

export function exportHistoricalWorkOrders(params = {}) {
  return authApi.get('/historical-work-orders/export', {
    params,
    responseType: 'blob',
  });
}

export function getHistoricalWorkOrderCities() {
  return authApi.get('/historical-work-orders/cities');
}
