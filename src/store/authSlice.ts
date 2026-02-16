import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';
import { loginSuccess } from './userSlice';

type LoginPayload = {
  email: string;
  password: string;
  remember: boolean;
};

type RegisterPayload = {
  organizationName: string;
  organizationCode: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  language: 'tr' | 'en';
};

type ForgotPasswordPayload = {
  email: string;
};

type AuthState = {
  // Auth ekranlarindaki ortak loading/error alani.
  loading: boolean;
  error: string;
  forgotPasswordSuccess: string;
};

const initialState: AuthState = {
  loading: false,
  error: '',
  forgotPasswordSuccess: ''
};

export const loginUser = createAsyncThunk<void, LoginPayload, { rejectValue: string }>(
  'auth/login',
  async ({ email, password, remember }, thunkApi) => {
    try {
      const response = await api.post('/api/auth/login', { email, password, remember });
      const user = response.data.user;
      const organization = response.data.organization;

      thunkApi.dispatch(
        loginSuccess({
          name: user.name,
          email: user.email,
          role: 'Admin',
          token: response.data.token,
          organizationId: user.organization_id ?? null,
          organizationName: organization?.name ?? ''
        })
      );
    } catch {
      return thunkApi.rejectWithValue('Email veya şifre hatalı.');
    }
  }
);

export const registerOrganization = createAsyncThunk<void, RegisterPayload, { rejectValue: string }>(
  'auth/register',
  async ({ organizationName, organizationCode, adminName, adminEmail, adminPassword, language }, thunkApi) => {
    try {
      await api.post('/api/auth/register', {
        organization_name: organizationName,
        organization_code: organizationCode || undefined,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        admin_language: language
      });
    } catch {
      return thunkApi.rejectWithValue('Kayıt oluşturulamadı. Bilgileri kontrol ederek tekrar dene.');
    }
  }
);

export const requestPasswordReset = createAsyncThunk<string, ForgotPasswordPayload, { rejectValue: string }>(
  'auth/forgotPassword',
  async ({ email }, thunkApi) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data.message ?? 'Sıfırlama bağlantısı gönderildi.';
    } catch {
      return thunkApi.rejectWithValue('Şifre sıfırlama isteği gönderilemedi.');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthMessages(state) {
      state.error = '';
      state.forgotPasswordSuccess = '';
    }
  },
  extraReducers: (builder) => {
    // Butun auth thunk'lari ortak loading/error alanini kullanir.
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Giris basarisiz.';
      })
      .addCase(registerOrganization.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(registerOrganization.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Kayit basarisiz.';
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.forgotPasswordSuccess = '';
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.loading = false;
        state.forgotPasswordSuccess = action.payload;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Sifre sifirlama basarisiz.';
      });
  }
});

export const { clearAuthMessages } = authSlice.actions;
export default authSlice.reducer;
