import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
export const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? '/api/v1';

const ACCESS_TOKEN_KEY = 'planttrack_access_token';
const REFRESH_TOKEN_KEY = 'planttrack_refresh_token';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

const hasWindow = typeof window !== 'undefined';

const loadTokensFromStorage = (): void => {
  if (!hasWindow) {
    return;
  }

  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
};

loadTokensFromStorage();

export const getAccessToken = (): string | null => accessToken;
export const getRefreshToken = (): string | null => refreshToken;

export const setAuthTokens = (tokens: AuthTokens): void => {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;

  if (!hasWindow) {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearAuthTokens = (): void => {
  accessToken = null;
  refreshToken = null;

  if (!hasWindow) {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

const refreshClient = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return config;
});

const shouldSkipRefresh = (requestUrl: string): boolean => {
  return (
    requestUrl.includes('/auth/login') ||
    requestUrl.includes('/auth/register') ||
    requestUrl.includes('/auth/refresh')
  );
};

const refreshAccessToken = async (): Promise<string | null> => {
  const currentRefreshToken = getRefreshToken();

  if (!currentRefreshToken) {
    return null;
  }

  try {
    const response = await refreshClient.post<{ data: AuthTokens }>(`${API_PREFIX}/auth/refresh`, {
      refreshToken: currentRefreshToken,
    });

    const nextTokens = response.data.data;
    setAuthTokens(nextTokens);
    return nextTokens.accessToken;
  } catch {
    clearAuthTokens();
    return null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? '';
    if (shouldSkipRefresh(requestUrl)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`;

    return api(originalRequest);
  }
);
