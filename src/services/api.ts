import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  timeout: 5000
});

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('planttrack:user');
    if (raw) {
      const parsed = JSON.parse(raw) as { token?: string };
      if (parsed?.token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    }
  } catch {
    // ignore
  }
  return config;
});
