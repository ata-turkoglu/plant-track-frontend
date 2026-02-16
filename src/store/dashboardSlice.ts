import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';

type DashboardState = {
  // API health metnini dashboard'ta gostermek icin tutulur.
  healthStatus: string;
  loading: boolean;
  error: string;
};

const initialState: DashboardState = {
  healthStatus: 'checking',
  loading: false,
  error: ''
};

export const fetchHealthStatus = createAsyncThunk<string, void, { rejectValue: string }>(
  'dashboard/fetchHealthStatus',
  async (_, thunkApi) => {
    try {
      const response = await api.get('/api/health');
      return response.data.status ?? 'ok';
    } catch {
      return thunkApi.rejectWithValue('offline');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Dashboard icin minimum lifecycle yonetimi.
    builder
      .addCase(fetchHealthStatus.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchHealthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.healthStatus = action.payload;
      })
      .addCase(fetchHealthStatus.rejected, (state) => {
        state.loading = false;
        state.healthStatus = 'offline';
        state.error = 'API erisilemiyor.';
      });
  }
});

export default dashboardSlice.reducer;
