import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('afunes_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('afunes_token');
      localStorage.removeItem('afunes_user');
      localStorage.removeItem('afunes_must_change_password');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  const anyErr = error as any;
  return anyErr?.response?.data?.message || anyErr?.message || fallback;
}
