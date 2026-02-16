import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';

export type LocationRow = {
  id: number;
  organization_id: number;
  parent_id: number | null;
  name: string;
};

export type WarehouseTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  description: string | null;
  system: boolean;
};

export type WarehouseRow = {
  id: number;
  organization_id: number;
  location_id: number;
  name: string;
  warehouse_type_id: number;
  warehouse_type_code?: string;
  warehouse_type_name?: string;
};

type SetupState = {
  // Setup ekranlarinin paylastigi temel veriler.
  organizationName: string;
  locations: LocationRow[];
  warehouseTypes: WarehouseTypeRow[];
  warehouses: WarehouseRow[];
  loading: boolean;
  mutating: boolean;
  error: string;
};

const initialState: SetupState = {
  organizationName: '',
  locations: [],
  warehouseTypes: [],
  warehouses: [],
  loading: false,
  mutating: false,
  error: ''
};

export const fetchOrganizationSetup = createAsyncThunk<
  { organizationName: string; locations: LocationRow[] },
  { organizationId: number; fallbackOrganizationName?: string },
  { rejectValue: string }
>('setup/fetchOrganization', async ({ organizationId, fallbackOrganizationName = '' }, thunkApi) => {
  try {
    const [orgRes, locationsRes] = await Promise.all([
      api.get(`/api/organizations/${organizationId}`),
      api.get(`/api/organizations/${organizationId}/locations`)
    ]);
    return {
      organizationName: orgRes.data.organization?.name ?? fallbackOrganizationName,
      locations: locationsRes.data.locations ?? []
    };
  } catch {
    return thunkApi.rejectWithValue('Organization bilgileri yüklenemedi.');
  }
});

export const fetchWarehousesSetup = createAsyncThunk<
  { locations: LocationRow[]; warehouses: WarehouseRow[]; warehouseTypes: WarehouseTypeRow[] },
  number,
  { rejectValue: string }
>('setup/fetchWarehouses', async (organizationId, thunkApi) => {
  try {
    const [locationsRes, warehousesRes, warehouseTypesRes] = await Promise.all([
      api.get(`/api/organizations/${organizationId}/locations`),
      api.get(`/api/organizations/${organizationId}/warehouses`),
      api.get(`/api/organizations/${organizationId}/warehouse-types`)
    ]);
    return {
      locations: locationsRes.data.locations ?? [],
      warehouses: warehousesRes.data.warehouses ?? [],
      warehouseTypes: warehouseTypesRes.data.warehouse_types ?? []
    };
  } catch {
    return thunkApi.rejectWithValue('Depolar yüklenemedi.');
  }
});

export const updateOrganizationName = createAsyncThunk<
  string,
  { organizationId: number; name: string },
  { rejectValue: string }
>('setup/updateOrganizationName', async ({ organizationId, name }, thunkApi) => {
  try {
    const response = await api.patch(`/api/organizations/${organizationId}`, { name });
    return response.data.organization?.name ?? name;
  } catch {
    return thunkApi.rejectWithValue('İşlem başarısız. Lütfen tekrar dene.');
  }
});

export const createLocation = createAsyncThunk<
  LocationRow,
  { organizationId: number; name: string; parentId: number | null },
  { rejectValue: string }
>('setup/createLocation', async ({ organizationId, name, parentId }, thunkApi) => {
  try {
    const response = await api.post(`/api/organizations/${organizationId}/locations`, {
      name,
      parent_id: parentId
    });
    return response.data.location;
  } catch {
    return thunkApi.rejectWithValue('İşlem başarısız. Lütfen tekrar dene.');
  }
});

export const updateLocation = createAsyncThunk<
  LocationRow,
  { id: number; name: string },
  { rejectValue: string }
>('setup/updateLocation', async ({ id, name }, thunkApi) => {
  try {
    const response = await api.patch(`/api/locations/${id}`, { name });
    return response.data.location;
  } catch {
    return thunkApi.rejectWithValue('İşlem başarısız. Lütfen tekrar dene.');
  }
});

export const deleteLocation = createAsyncThunk<number, { id: number }, { rejectValue: string }>(
  'setup/deleteLocation',
  async ({ id }, thunkApi) => {
    try {
      await api.delete(`/api/locations/${id}`);
      return id;
    } catch {
      return thunkApi.rejectWithValue('Lokasyon silinemedi. Alt lokasyonları varsa önce onları sil.');
    }
  }
);

export const createWarehouse = createAsyncThunk<
  WarehouseRow,
  { organizationId: number; name: string; locationId: number; warehouseTypeId: number },
  { rejectValue: string }
>('setup/createWarehouse', async ({ organizationId, name, locationId, warehouseTypeId }, thunkApi) => {
  try {
    const response = await api.post(`/api/organizations/${organizationId}/warehouses`, {
      name,
      location_id: locationId,
      warehouse_type_id: warehouseTypeId
    });
    return response.data.warehouse;
  } catch {
    return thunkApi.rejectWithValue('Kaydetme başarısız.');
  }
});

export const updateWarehouse = createAsyncThunk<
  WarehouseRow,
  { id: number; name: string; locationId: number; warehouseTypeId: number },
  { rejectValue: string }
>('setup/updateWarehouse', async ({ id, name, locationId, warehouseTypeId }, thunkApi) => {
  try {
    const response = await api.patch(`/api/warehouses/${id}`, {
      name,
      location_id: locationId,
      warehouse_type_id: warehouseTypeId
    });
    return response.data.warehouse;
  } catch {
    return thunkApi.rejectWithValue('Kaydetme başarısız.');
  }
});

export const deleteWarehouse = createAsyncThunk<number, { id: number }, { rejectValue: string }>(
  'setup/deleteWarehouse',
  async ({ id }, thunkApi) => {
    try {
      await api.delete(`/api/warehouses/${id}`);
      return id;
    } catch {
      return thunkApi.rejectWithValue('Depo silinemedi.');
    }
  }
);

const setupSlice = createSlice({
  name: 'setup',
  initialState,
  reducers: {
    clearSetupError(state) {
      state.error = '';
    }
  },
  extraReducers: (builder) => {
    // Fetch ve mutasyon lifecycle'lari ayni domain state icinde yonetilir.
    builder
      .addCase(fetchOrganizationSetup.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchOrganizationSetup.fulfilled, (state, action) => {
        state.loading = false;
        state.organizationName = action.payload.organizationName;
        state.locations = action.payload.locations;
      })
      .addCase(fetchOrganizationSetup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Organization bilgileri yüklenemedi.';
      })
      .addCase(fetchWarehousesSetup.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchWarehousesSetup.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload.locations;
        state.warehouses = action.payload.warehouses;
        state.warehouseTypes = action.payload.warehouseTypes;
      })
      .addCase(fetchWarehousesSetup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Depolar yüklenemedi.';
      })
      .addCase(updateOrganizationName.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(updateOrganizationName.fulfilled, (state, action) => {
        state.mutating = false;
        state.organizationName = action.payload;
      })
      .addCase(updateOrganizationName.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'İşlem başarısız.';
      })
      .addCase(createLocation.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.mutating = false;
        state.locations.push(action.payload);
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'İşlem başarısız.';
      })
      .addCase(updateLocation.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        state.mutating = false;
        state.locations = state.locations.map((location) =>
          location.id === action.payload.id ? action.payload : location
        );
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'İşlem başarısız.';
      })
      .addCase(deleteLocation.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.mutating = false;
        state.locations = state.locations.filter((location) => location.id !== action.payload);
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Lokasyon silinemedi.';
      })
      .addCase(createWarehouse.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(createWarehouse.fulfilled, (state, action) => {
        state.mutating = false;
        state.warehouses.push(action.payload);
      })
      .addCase(createWarehouse.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme başarısız.';
      })
      .addCase(updateWarehouse.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(updateWarehouse.fulfilled, (state, action) => {
        state.mutating = false;
        state.warehouses = state.warehouses.map((warehouse) =>
          warehouse.id === action.payload.id ? action.payload : warehouse
        );
      })
      .addCase(updateWarehouse.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme başarısız.';
      })
      .addCase(deleteWarehouse.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(deleteWarehouse.fulfilled, (state, action) => {
        state.mutating = false;
        state.warehouses = state.warehouses.filter((warehouse) => warehouse.id !== action.payload);
      })
      .addCase(deleteWarehouse.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Depo silinemedi.';
      });
  }
});

export const { clearSetupError } = setupSlice.actions;
export default setupSlice.reducer;
