import axios from 'axios';

export const AUTH_KEYS = ['token', 'email', 'username'];
export const AUTH_EXPIRED_EVENT = 'planmee:auth-expired';

const client = axios.create({
  baseURL: 'http://localhost:5002/api',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token geçersiz/süresi dolmuşsa (401) oturumu kapat; AuthContext giriş ekranına döner.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? '';
    if (err.response?.status === 401 && !url.startsWith('/auth/')) {
      AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(err);
  },
);

export default client;
