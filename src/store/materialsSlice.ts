import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';

export type WarehouseTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
};

export type UnitRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  symbol?: string | null;
  active: boolean;
};

export type ItemRow = {
  id: number;
  organization_id: number;
  warehouse_type_id: number;
  item_group_id?: number;
  item_group_code?: string | null;
  item_group_name?: string | null;
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  size_spec?: string | null;
  size_unit_id?: number | null;
  unit_id: number;
  active: boolean;
};

export type ItemGroupRow = {
  id: number;
  organization_id: number;
  warehouse_type_id: number;
  amount_unit_id: number;
  code: string;
  name: string;
  size_spec: string | null;
  size_unit_id: number | null;
  active: boolean;
};

type MaterialsState = {
  // Master data + liste ekrani ayni state altinda tutuluyor.
  warehouseTypes: WarehouseTypeRow[];
  units: UnitRow[];
  items: ItemRow[];
  itemGroups: ItemGroupRow[];
  // Ilk yukleme ve liste yenileme durumu.
  loading: boolean;
  // Kaydet/sil gibi mutasyon istekleri icin ayrik loading flag.
  mutating: boolean;
  error: string;
};

type MaterialsFetchResponse = {
  warehouseTypes: WarehouseTypeRow[];
  units: UnitRow[];
  items: ItemRow[];
  itemGroups: ItemGroupRow[];
};

type UpsertMaterialPayload = {
  organizationId: number;
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  sizeSpec?: string | null;
  sizeUnitId?: number | null;
  unitId: number;
  active: boolean;
  itemGroupId?: number | null;
  warehouseTypeId?: number;
  itemId?: number;
};

const initialState: MaterialsState = {
  warehouseTypes: [],
  units: [],
  items: [],
  itemGroups: [],
  loading: false,
  mutating: false,
  error: ''
};

export const fetchMaterialsData = createAsyncThunk<MaterialsFetchResponse, number, { rejectValue: string }>(
  'materials/fetchAll',
  async (organizationId, thunkApi) => {
    try {
      const [warehouseTypesRes, unitsRes, itemsRes, itemGroupsRes] = await Promise.all([
        api.get(`/api/organizations/${organizationId}/warehouse-types`),
        api.get(`/api/organizations/${organizationId}/units`),
        api.get(`/api/organizations/${organizationId}/items`),
        api.get(`/api/organizations/${organizationId}/item-groups`)
      ]);

      return {
        warehouseTypes: warehouseTypesRes.data.warehouse_types ?? [],
        units: unitsRes.data.units ?? [],
        items: itemsRes.data.items ?? [],
        itemGroups: itemGroupsRes.data.item_groups ?? []
      };
    } catch {
      return thunkApi.rejectWithValue('Malzemeler yüklenemedi.');
    }
  }
);

export const createMaterialItem = createAsyncThunk<void, UpsertMaterialPayload, { rejectValue: string }>(
  'materials/createItem',
  async ({ organizationId, warehouseTypeId, code, name, brand, model, sizeSpec, sizeUnitId, unitId, active }, thunkApi) => {
    if (!warehouseTypeId) {
      return thunkApi.rejectWithValue('Kaydetme başarısız. Depo tipi seçilmedi.');
    }
    try {
      await api.post(`/api/organizations/${organizationId}/items`, {
        warehouse_type_id: warehouseTypeId,
        code,
        name,
        brand: brand ?? null,
        model: model ?? null,
        size_spec: sizeSpec ?? null,
        size_unit_id: sizeUnitId ?? null,
        unit_id: unitId,
        active
      });
      // Mutasyon sonrasi listeyi tek kaynaktan taze tutuyoruz.
      await thunkApi.dispatch(fetchMaterialsData(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Kaydetme başarısız. Kod benzersiz olmali.');
    }
  }
);

export const updateMaterialItem = createAsyncThunk<void, UpsertMaterialPayload, { rejectValue: string }>(
  'materials/updateItem',
  async ({ organizationId, itemId, code, name, brand, model, sizeSpec, sizeUnitId, unitId, active, itemGroupId }, thunkApi) => {
    if (!itemId) {
      return thunkApi.rejectWithValue('Kaydetme başarısız. Kayıt seçilmedi.');
    }
    try {
      await api.put(`/api/organizations/${organizationId}/items/${itemId}`, {
        code,
        name,
        brand: brand ?? null,
        model: model ?? null,
        size_spec: sizeSpec ?? null,
        size_unit_id: sizeUnitId ?? null,
        unit_id: unitId,
        active,
        item_group_id: itemGroupId ?? undefined
      });
      // Sayfada lokal patch yerine server truth yeniden cekiliyor.
      await thunkApi.dispatch(fetchMaterialsData(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Kaydetme başarısız. Kod benzersiz olmali.');
    }
  }
);

export const deleteMaterialItem = createAsyncThunk<
  void,
  { organizationId: number; itemId: number },
  { rejectValue: string }
>('materials/deleteItem', async ({ organizationId, itemId }, thunkApi) => {
  try {
    await api.delete(`/api/organizations/${organizationId}/items/${itemId}`);
    // Silme sonrasi tablo tutarliligi icin yeniden fetch.
    await thunkApi.dispatch(fetchMaterialsData(organizationId));
  } catch {
    return thunkApi.rejectWithValue('Silme başarısız.');
  }
});

const materialsSlice = createSlice({
  name: 'materials',
  initialState,
  reducers: {
    // Logout veya org degisimi gibi durumlarda domain state sifirlanabilir.
    clearMaterialsState(state) {
      state.warehouseTypes = [];
      state.units = [];
      state.items = [];
      state.itemGroups = [];
      state.loading = false;
      state.mutating = false;
      state.error = '';
    }
  },
  extraReducers: (builder) => {
    // Async lifecycle flag'leri tek noktadan yonetiliyor.
    builder
      .addCase(fetchMaterialsData.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchMaterialsData.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';
        state.warehouseTypes = action.payload.warehouseTypes;
        state.units = action.payload.units;
        state.items = action.payload.items;
        state.itemGroups = action.payload.itemGroups;
      })
      .addCase(fetchMaterialsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Malzemeler yüklenemedi.';
      })
      .addCase(createMaterialItem.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(createMaterialItem.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(createMaterialItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme başarısız.';
      })
      .addCase(updateMaterialItem.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(updateMaterialItem.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(updateMaterialItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme başarısız.';
      })
      .addCase(deleteMaterialItem.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(deleteMaterialItem.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(deleteMaterialItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Silme başarısız.';
      });
  }
});

export const { clearMaterialsState } = materialsSlice.actions;
export default materialsSlice.reducer;
