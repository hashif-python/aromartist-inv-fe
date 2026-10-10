import axios from 'axios';
import { toast } from 'sonner';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export const apiClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
let refreshPromise = null;
export const refreshSession = () => {
  if (!refreshPromise) refreshPromise = axios.post(`${API_BASE_URL}/auth/token/refresh/`, {}, { withCredentials: true })
    .then(({ data }) => { setAccessToken(data.access); return data.access; })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
};
apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
export const errorMessage = (error) => {
  const data = error.response?.data;
  if (!data) return 'Unable to reach the backend. Check that it is running.';
  if (typeof data.detail === 'string') return data.detail;
  return Object.entries(data).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : val}`).join('; ');
};
apiClient.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry && !/^\/auth\/(login|token\/refresh|password\/reset)/.test(original.url)) {
    original._retry = true;
    try { original.headers.Authorization = `Bearer ${await refreshSession()}`; return apiClient(original); }
    catch { setAccessToken(null); window.dispatchEvent(new Event('auth:unauthorized')); }
  }
  error.normalizedErrors = error.response?.data;
  if (!original?.url.includes('/auth/')) toast.error(errorMessage(error));
  return Promise.reject(error);
});
