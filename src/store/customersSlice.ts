import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';

export type CustomerRow = {
  id: number;
  organization_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_no?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type CustomersState = {
  rows: CustomerRow[];
  // Liste ilk acilis ve refresh durumu.
  loading: boolean;
  // Ekle/güncelle/sil islemleri icin ayrik loading.
  mutating: boolean;
  error: string;
};

type UpsertCustomerPayload = {
  organizationId: number;
  id?: number;
  name: string;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  tax_no: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
};

const initialState: CustomersState = {
  rows: [],
  loading: false,
  mutating: false,
  error: ''
};

export const fetchCustomers = createAsyncThunk<CustomerRow[], number, { rejectValue: string }>(
  'customers/fetchAll',
  async (organizationId, thunkApi) => {
    try {
      const response = await api.get(`/api/organizations/${organizationId}/customers`);
      return response.data.customers ?? [];
    } catch {
      return thunkApi.rejectWithValue('Müşteriler yüklenemedi.');
    }
  }
);

export const createCustomer = createAsyncThunk<void, UpsertCustomerPayload, { rejectValue: string }>(
  'customers/create',
  async ({ organizationId, ...payload }, thunkApi) => {
    try {
      await api.post(`/api/organizations/${organizationId}/customers`, payload);
      // Mutasyonlardan sonra liste kaynagini backend ile senkronluyoruz.
      await thunkApi.dispatch(fetchCustomers(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Kaydetme başarısız. İsim benzersiz olmali.');
    }
  }
);

export const updateCustomer = createAsyncThunk<void, UpsertCustomerPayload, { rejectValue: string }>(
  'customers/update',
  async ({ organizationId, id, ...payload }, thunkApi) => {
    if (!id) {
      return thunkApi.rejectWithValue('Kaydetme başarısız. Kayıt seçilmedi.');
    }
    try {
      await api.put(`/api/organizations/${organizationId}/customers/${id}`, payload);
      // Karma lokal state güncellemesi yerine listeyi yeniden cekiyoruz.
      await thunkApi.dispatch(fetchCustomers(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Kaydetme başarısız. İsim benzersiz olmali.');
    }
  }
);

export const deleteCustomer = createAsyncThunk<void, { organizationId: number; id: number }, { rejectValue: string }>(
  'customers/delete',
  async ({ organizationId, id }, thunkApi) => {
    try {
      await api.delete(`/api/organizations/${organizationId}/customers/${id}`);
      // Silme sonrasi güncel snapshot.
      await thunkApi.dispatch(fetchCustomers(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Silme başarısız.');
    }
  }
);

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    // Domain state'i kontrollu bicimde temizlemek icin.
    clearCustomersState(state) {
      state.rows = [];
      state.loading = false;
      state.mutating = false;
      state.error = '';
    }
  },
  extraReducers: (builder) => {
    // Thunk status'lari state flag'lerine map ediliyor.
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';
        state.rows = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Müşteriler yüklenemedi.';
      })
      .addCase(createCustomer.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(createCustomer.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme başarısız.';
      })
      .addCase(updateCustomer.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(updateCustomer.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme başarısız.';
      })
      .addCase(deleteCustomer.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(deleteCustomer.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Silme başarısız.';
      });
  }
});

export const { clearCustomersState } = customersSlice.actions;
export default customersSlice.reducer;
