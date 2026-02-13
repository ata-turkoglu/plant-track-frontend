import { api, API_PREFIX, clearAuthTokens, getRefreshToken, setAuthTokens } from './api';

export type UserRole = 'admin' | 'user';
export type UserId = string | number;

export interface AuthUser {
  id: UserId;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateMePayload {
  firstName?: string;
  lastName?: string;
  password?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post<ApiEnvelope<AuthResponse>>(`${API_PREFIX}/auth/register`, payload);
    const authData = response.data.data;
    setAuthTokens(authData.tokens);
    return authData;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<ApiEnvelope<AuthResponse>>(`${API_PREFIX}/auth/login`, payload);
    const authData = response.data.data;
    setAuthTokens(authData.tokens);
    return authData;
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.post(`${API_PREFIX}/auth/logout`, { refreshToken });
    }
    clearAuthTokens();
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post(`${API_PREFIX}/auth/forgot-password`, { email });
  },

  async getMe(): Promise<AuthUser> {
    const response = await api.get<ApiEnvelope<AuthUser>>(`${API_PREFIX}/users/me`);
    return response.data.data;
  },

  async updateMe(payload: UpdateMePayload): Promise<AuthUser> {
    const response = await api.patch<ApiEnvelope<AuthUser>>(`${API_PREFIX}/users/me`, payload);
    return response.data.data;
  },

  async listUsers(page = 1, limit = 20): Promise<{ data: AuthUser[]; pagination?: Record<string, number> }> {
    const response = await api.get<ApiEnvelope<AuthUser[]> & { pagination?: Record<string, number> }>(
      `${API_PREFIX}/users?page=${page}&limit=${limit}`
    );

    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async createUser(payload: CreateUserPayload): Promise<AuthUser> {
    const response = await api.post<ApiEnvelope<AuthUser>>(`${API_PREFIX}/users`, payload);
    return response.data.data;
  },

  async updateUserById(id: UserId, payload: UpdateUserPayload): Promise<AuthUser> {
    const response = await api.patch<ApiEnvelope<AuthUser>>(`${API_PREFIX}/users/${id}`, payload);
    return response.data.data;
  },

  async deactivateUserById(id: UserId): Promise<AuthUser> {
    const response = await api.delete<ApiEnvelope<AuthUser>>(`${API_PREFIX}/users/${id}`);
    return response.data.data;
  },
};
