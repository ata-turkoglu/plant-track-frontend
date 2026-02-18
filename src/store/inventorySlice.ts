import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';

export type UnitRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  symbol: string | null;
  system: boolean;
  active: boolean;
};

export type ItemRow = {
  id: number;
  organization_id: number;
  warehouse_type_id?: number;
  type: string;
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  size_spec?: string | null;
  size_unit_id?: number | null;
  unit_id?: number;
  active: boolean;
};

export type WarehouseTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  description: string | null;
  system: boolean;
  active: boolean;
};

export type WarehouseRow = {
  id: number;
  organization_id: number;
  location_id: number;
  name: string;
  warehouse_type_id: number;
  warehouse_type_name?: string;
};

export type NodeRow = {
  id: number;
  organization_id: number;
  node_type: 'WAREHOUSE' | 'LOCATION' | 'SUPPLIER' | 'CUSTOMER' | 'ASSET' | 'VIRTUAL';
  ref_table: string;
  ref_id: string;
  code?: string | null;
  name: string;
  is_stocked: boolean;
};

export type MovementRow = {
  id: number;
  organization_id: number;
  movement_group_id?: string | null;
  from_kind?: string | null;
  from_ref?: string | null;
  to_kind?: string | null;
  to_ref?: string | null;
  from_node_id?: number | null;
  to_node_id?: number | null;
  from_node_type?: string | null;
  from_node_name?: string | null;
  to_node_type?: string | null;
  to_node_name?: string | null;
  warehouse_id: number;
  location_id: number | null;
  item_id: number;
  movement_type: string;
  quantity: string | number;
  uom: string;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  occurred_at: string;
  item_code?: string;
  item_name?: string;
  location_name?: string;
};

export type BalanceRow = {
  organization_id: number;
  node_id: number;
  node_type: string;
  node_name: string;
  item_id: number;
  item_code?: string;
  item_name?: string;
  unit_code?: string;
  balance_qty: string | number;
};

type InventoryState = {
  // Inventory ekraninin ihtiyac duydugu tum veri setleri.
  units: UnitRow[];
  items: ItemRow[];
  warehouseTypes: WarehouseTypeRow[];
  warehouses: WarehouseRow[];
  nodes: NodeRow[];
  movements: MovementRow[];
  balances: BalanceRow[];
  loading: boolean;
  mutating: boolean;
  error: string;
};

type InventoryBootstrapResponse = {
  units: UnitRow[];
  items: ItemRow[];
  warehouseTypes: WarehouseTypeRow[];
  warehouses: WarehouseRow[];
  nodes: NodeRow[];
  movements: MovementRow[];
  balances: BalanceRow[];
};

type InventoryDynamicResponse = {
  nodes: NodeRow[];
  movements: MovementRow[];
  balances: BalanceRow[];
};

type MovementLinePayload = {
  item_id: number;
  quantity: number;
  unit_id: number;
  from_node_id: number;
  to_node_id: number;
};

type UpsertMovementPayload = {
  organizationId: number;
  movementId?: number;
  payload: {
    event_type: 'MOVE';
    status: 'POSTED';
    lines: MovementLinePayload[];
    reference_type: string | null;
    occurred_at: string;
  };
};

type UpsertInventoryItemPayload = {
  organizationId: number;
  itemId?: number;
  warehouseTypeId: number;
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  sizeSpec?: string | null;
  sizeUnitId?: number | null;
  unitId: number;
  active: boolean;
};

const initialState: InventoryState = {
  units: [],
  items: [],
  warehouseTypes: [],
  warehouses: [],
  nodes: [],
  movements: [],
  balances: [],
  loading: false,
  mutating: false,
  error: ''
};

async function fetchInventoryDynamicData(organizationId: number): Promise<InventoryDynamicResponse> {
  const [movementsRes, nodesRes, balancesRes] = await Promise.all([
    api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`),
    api.get(`/api/organizations/${organizationId}/nodes?types=WAREHOUSE,LOCATION,SUPPLIER,CUSTOMER`),
    api.get(`/api/organizations/${organizationId}/inventory-balances`)
  ]);

  return {
    movements: movementsRes.data.movements ?? [],
    nodes: nodesRes.data.nodes ?? [],
    balances: balancesRes.data.balances ?? []
  };
}

export const fetchInventoryData = createAsyncThunk<InventoryBootstrapResponse, number, { rejectValue: string }>(
  'inventory/fetchData',
  async (organizationId, thunkApi) => {
    try {
      const [unitsRes, itemsRes, warehouseTypesRes, warehousesRes, dynamic] = await Promise.all([
        api.get(`/api/organizations/${organizationId}/units`),
        api.get(`/api/organizations/${organizationId}/items`),
        api.get(`/api/organizations/${organizationId}/warehouse-types`),
        api.get(`/api/organizations/${organizationId}/warehouses`),
        fetchInventoryDynamicData(organizationId)
      ]);

      return {
        units: unitsRes.data.units ?? [],
        items: itemsRes.data.items ?? [],
        warehouseTypes: warehouseTypesRes.data.warehouse_types ?? [],
        warehouses: warehousesRes.data.warehouses ?? [],
        nodes: dynamic.nodes,
        movements: dynamic.movements,
        balances: dynamic.balances
      };
    } catch {
      return thunkApi.rejectWithValue('Veriler yüklenemedi.');
    }
  }
);

export const refreshInventoryDynamicData = createAsyncThunk<InventoryDynamicResponse, number, { rejectValue: string }>(
  'inventory/refreshDynamicData',
  async (organizationId, thunkApi) => {
    try {
      return await fetchInventoryDynamicData(organizationId);
    } catch {
      return thunkApi.rejectWithValue('Veriler yüklenemedi.');
    }
  }
);

export const refreshInventoryItems = createAsyncThunk<ItemRow[], number, { rejectValue: string }>(
  'inventory/refreshItems',
  async (organizationId, thunkApi) => {
    try {
      const response = await api.get(`/api/organizations/${organizationId}/items`);
      return response.data.items ?? [];
    } catch {
      return thunkApi.rejectWithValue('Ürünler yüklenemedi.');
    }
  }
);

export const upsertInventoryMovement = createAsyncThunk<void, UpsertMovementPayload, { rejectValue: string }>(
  'inventory/upsertMovement',
  async ({ organizationId, movementId, payload }, thunkApi) => {
    try {
      if (movementId) {
        await api.put(`/api/organizations/${organizationId}/inventory-movements/${movementId}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/inventory-movements`, payload);
      }

      // Hareket sonrasi join alanlari güncel kalmasi icin dinamik veriler tazelenir.
      await thunkApi.dispatch(refreshInventoryDynamicData(organizationId));
    } catch {
      return thunkApi.rejectWithValue('Kaydetme başarısız.');
    }
  }
);

export const deleteInventoryMovement = createAsyncThunk<
  void,
  { organizationId: number; movementId: number },
  { rejectValue: string }
>('inventory/deleteMovement', async ({ organizationId, movementId }, thunkApi) => {
  try {
    await api.delete(`/api/organizations/${organizationId}/inventory-movements/${movementId}`);
    await thunkApi.dispatch(refreshInventoryDynamicData(organizationId));
  } catch {
    return thunkApi.rejectWithValue('Silme başarısız.');
  }
});

export const upsertInventoryItem = createAsyncThunk<ItemRow, UpsertInventoryItemPayload, { rejectValue: string }>(
  'inventory/upsertItem',
  async ({ organizationId, itemId, warehouseTypeId, code, name, brand, model, sizeSpec, sizeUnitId, unitId, active }, thunkApi) => {
    try {
      const response = itemId
        ? await api.put(`/api/organizations/${organizationId}/items/${itemId}`, {
            code,
            name,
            brand: brand ?? null,
            model: model ?? null,
            size_spec: sizeSpec ?? null,
            size_unit_id: sizeUnitId ?? null,
            unit_id: unitId,
            active
          })
        : await api.post(`/api/organizations/${organizationId}/items`, {
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

      const item: ItemRow = response.data.item;
      await thunkApi.dispatch(refreshInventoryItems(organizationId));
      return item;
    } catch {
      return thunkApi.rejectWithValue('Ürün/Malzeme eklenemedi (kod benzersiz olmali).');
    }
  }
);

export const deleteInventoryItem = createAsyncThunk<
  void,
  { organizationId: number; itemId: number },
  { rejectValue: string }
>('inventory/deleteItem', async ({ organizationId, itemId }, thunkApi) => {
  try {
    await api.delete(`/api/organizations/${organizationId}/items/${itemId}`);
    await thunkApi.dispatch(refreshInventoryItems(organizationId));
  } catch {
    return thunkApi.rejectWithValue('Silme başarısız.');
  }
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearInventoryError(state) {
      state.error = '';
    }
  },
  extraReducers: (builder) => {
    // Fetch ve mutasyon lifecycle bayraklari inventory icin tek noktadan yonetilir.
    builder
      .addCase(fetchInventoryData.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchInventoryData.fulfilled, (state, action) => {
        state.loading = false;
        state.units = action.payload.units;
        state.items = action.payload.items;
        state.warehouseTypes = action.payload.warehouseTypes;
        state.warehouses = action.payload.warehouses;
        state.nodes = action.payload.nodes;
        state.movements = action.payload.movements;
        state.balances = action.payload.balances;
      })
      .addCase(fetchInventoryData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Veriler yüklenemedi.';
      })
      .addCase(refreshInventoryDynamicData.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(refreshInventoryDynamicData.fulfilled, (state, action) => {
        state.loading = false;
        state.nodes = action.payload.nodes;
        state.movements = action.payload.movements;
        state.balances = action.payload.balances;
      })
      .addCase(refreshInventoryDynamicData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Veriler yüklenemedi.';
      })
      .addCase(refreshInventoryItems.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(refreshInventoryItems.rejected, (state, action) => {
        state.error = action.payload ?? 'Ürünler yüklenemedi.';
      })
      .addCase(upsertInventoryMovement.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(upsertInventoryMovement.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(upsertInventoryMovement.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Kaydetme başarısız.';
      })
      .addCase(deleteInventoryMovement.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(deleteInventoryMovement.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(deleteInventoryMovement.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Silme başarısız.';
      })
      .addCase(upsertInventoryItem.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(upsertInventoryItem.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(upsertInventoryItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Ürün/Malzeme eklenemedi.';
      })
      .addCase(deleteInventoryItem.pending, (state) => {
        state.mutating = true;
        state.error = '';
      })
      .addCase(deleteInventoryItem.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(deleteInventoryItem.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? 'Silme başarısız.';
      });
  }
});

export const { clearInventoryError } = inventorySlice.actions;
export default inventorySlice.reducer;
