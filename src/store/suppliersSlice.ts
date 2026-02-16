import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';

export type SupplierKind = 'SUPPLIER_EXTERNAL' | 'SUPPLIER_INTERNAL';

export type SupplierRow = {
  id: number;
  organization_id: number;
  kind: SupplierKind;
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

type SuppliersState = {
  rows: SupplierRow[];
  // Listeyi ilk acilis/yenileme sirasinda true olur.
  loading: boolean;
  // Formdan gelen CRUD aksiyonlari bu flag'i kullanir.
  mutating: boolean;
  error: string;
};

type UpsertSupplierPayload = {
  organizationId: number;
  id?: number;
  kind: SupplierKind;
  name: string;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  tax_no: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
};

const initialState: SuppliersState = {
  rows: [],
  loading: false,
  mutating: false,
  error: ''
};

export const fetchSuppliers = createAsyncThunk<SupplierRow[], number, { rejectValue: string }>(
  'suppliers/fetchAll',
  async (organizationId, thunkApi) => {
    try {
      const response = await api.get(`/api/organizations/${organizationId}/suppliers`);
      return response.data.suppliers ?? [];
    } catch {
      return thunkApi.rejectWithValue('Tedarikciler yuklenemedi.');
    }
  }
);

export const createSupplier = createAsyncThunk<void, UpsertSupplierPayload, { rejectValue: string }>(
  'suppliers/create',
  async ({ organizationId, ...payload }, thunkApi) => {
    try {
      await api.post(`/api/organizations/${organizationId}/suppliers`, payload);
      // Islem sonrasi state'in server ile uyumlu kalmasi icin refetch.
      await thunkApi.dispatch(fetchSuppliers(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Kaydetme basarisiz. Isim benzersiz olmali.');
    }
  }
);

export const updateSupplier = createAsyncThunk<void, UpsertSupplierPayload, { rejectValue: string }>(
  'suppliers/update',
  async ({ organizationId, id, ...payload }, thunkApi) => {
    if (!id) {
      return thunkApi.rejectWithValue('Kaydetme basarisiz. Kayit secilmedi.');
    }
    try {
      await api.put(`/api/organizations/${organizationId}/suppliers/${id}`, payload);
      // Lokal merge mantigini sade tutmak icin yeniden fetch.
      await thunkApi.dispatch(fetchSuppliers(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Kaydetme basarisiz. Isim benzersiz olmali.');
    }
  }
);

export const deleteSupplier = createAsyncThunk<void, { organizationId: number; id: number }, { rejectValue: string }>(
  'suppliers/delete',
  async ({ organizationId, id }, thunkApi) => {
    try {
      await api.delete(`/api/organizations/${organizationId}/suppliers/${id}`);
      // Silme sonrasi tabloyu dogru sekilde yenile.
      await thunkApi.dispatch(fetchSuppliers(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Silme basarisiz.');
    }
  }
);

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    // Org degisimi veya cikista state reset icin.
    clearSuppliersState(state) {
      state.rows = [];
      state.loading = false;
      state.mutating = false;
      state.error = '';
    }
  },
  extraReducers: (builder) => {
    // Pending/fulfilled/rejected -> loading ve error yonetimi.
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';
        state.rows = action.payload;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Tedarikciler yuklenemedi.';
      })
      .addCase(createSupplier.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(createSupplier.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme basarisiz.';
      })
      .addCase(updateSupplier.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(updateSupplier.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme basarisiz.';
      })
      .addCase(deleteSupplier.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(deleteSupplier.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Silme basarisiz.';
      });
  }
});

export const { clearSuppliersState } = suppliersSlice.actions;
export default suppliersSlice.reducer;
