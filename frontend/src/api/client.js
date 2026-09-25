import axios from 'axios';

export const TOKEN_KEY = 'token';
export const USER_KEY = 'planmee:user';
// 'email' ve 'username' eski sürümden kalan anahtarlar; çıkışta onlar da temizlenir.
export const AUTH_KEYS = [TOKEN_KEY, USER_KEY, 'email', 'username'];
export const AUTH_EXPIRED_EVENT = 'planmee:auth-expired';
// 403 email_not_verified / family_required geldiğinde AuthContext durumu tazeler ve doğru ekrana yönlendirir.
export const ACCOUNT_STATE_EVENT = 'planmee:account-state';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? '';
    const status = err.response?.status;
    const code = err.response?.data?.code;
    // Token geçersiz/süresi dolmuşsa (401) oturumu kapat; giriş ekranına dönülür.
    if (status === 401 && !url.startsWith('/auth/') && !url.startsWith('/invitations/')) {
      AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    if (status === 403 && (code === 'email_not_verified' || code === 'family_required')) {
      window.dispatchEvent(new CustomEvent(ACCOUNT_STATE_EVENT, { detail: code }));
    }
    return Promise.reject(err);
  },
);

export default client;
