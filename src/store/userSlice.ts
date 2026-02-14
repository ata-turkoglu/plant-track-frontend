import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  name: string;
  role: string;
  email: string;
  authenticated: boolean;
  token: string | null;
  organizationId: number | null;
  organizationName: string;
}

interface LoginPayload {
  name: string;
  role?: string;
  email: string;
  token?: string;
  organizationId?: number | null;
  organizationName?: string;
}

const initialState: UserState = {
  name: 'Guest',
  role: 'Visitor',
  email: '',
  authenticated: false,
  token: null,
  organizationId: null,
  organizationName: ''
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<LoginPayload>) {
      state.name = action.payload.name;
      state.role = action.payload.role ?? 'Admin';
      state.email = action.payload.email;
      state.authenticated = true;
      state.token = action.payload.token ?? null;
      state.organizationId = action.payload.organizationId ?? null;
      state.organizationName = action.payload.organizationName ?? '';
    },
    logout(state) {
      state.name = 'Guest';
      state.role = 'Visitor';
      state.email = '';
      state.authenticated = false;
      state.token = null;
      state.organizationId = null;
      state.organizationName = '';
    }
  }
});

export const { loginSuccess, logout } = userSlice.actions;
export default userSlice.reducer;
