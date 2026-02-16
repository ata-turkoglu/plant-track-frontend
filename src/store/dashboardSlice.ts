import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../services/api';

type WarehouseTypeRow = {
  id: number;
  code: string;
  name: string;
};

type WarehouseRow = {
  id: number;
  warehouse_type_id: number;
  name: string;
};

type NodeRow = {
  id: number;
  node_type: string;
  ref_table: string;
  ref_id: string;
};

type BalanceRow = {
  item_id?: number;
  item_code?: string;
  item_name?: string;
  balance_qty: string | number;
};

type ItemRow = {
  id: number;
  type: string;
};

type ProductionItemSeries = {
  name: string;
  data: number[];
};

type ProductionDailyStock = {
  labels: string[];
  totals: number[];
  itemSeries: ProductionItemSeries[];
};

type DashboardState = {
  // API health metnini dashboard'ta gostermek icin tutulur.
  healthStatus: string;
  healthLoading: boolean;
  productionLoading: boolean;
  productionDailyStock: ProductionDailyStock;
  error: string;
};

const initialState: DashboardState = {
  healthStatus: 'checking',
  healthLoading: false,
  productionLoading: false,
  productionDailyStock: {
    labels: [],
    totals: [],
    itemSeries: []
  },
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

function toNumber(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatDayLabel(date: Date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
}

export const fetchProductionDailyStock = createAsyncThunk<ProductionDailyStock, number, { rejectValue: string }>(
  'dashboard/fetchProductionDailyStock',
  async (organizationId, thunkApi) => {
    try {
      const [warehouseTypesRes, warehousesRes, nodesRes, itemsRes] = await Promise.all([
        api.get(`/api/organizations/${organizationId}/warehouse-types`),
        api.get(`/api/organizations/${organizationId}/warehouses`),
        api.get(`/api/organizations/${organizationId}/nodes?types=WAREHOUSE`),
        api.get(`/api/organizations/${organizationId}/items`)
      ]);

      const warehouseTypes: WarehouseTypeRow[] = warehouseTypesRes.data.warehouse_types ?? [];
      const warehouses: WarehouseRow[] = warehousesRes.data.warehouses ?? [];
      const nodes: NodeRow[] = nodesRes.data.nodes ?? [];
      const items: ItemRow[] = itemsRes.data.items ?? [];

      // Uretim depolarini kod/isim anahtar kelimeleriyle seciyoruz.
      const productionKeywords = ['production', 'uretim', 'üretim', 'finished', 'mamul', 'product', 'finished_good'];
      const productionTypeIds = new Set(
        warehouseTypes
          .filter((warehouseType) => {
            const haystack = `${warehouseType.code} ${warehouseType.name}`.toLowerCase();
            return productionKeywords.some((keyword) => haystack.includes(keyword));
          })
          .map((warehouseType) => warehouseType.id)
      );

      const productionWarehouses = warehouses.filter((warehouse) => productionTypeIds.has(warehouse.warehouse_type_id));

      const warehouseNodeByRefId = new Map<number, number>();
      for (const node of nodes) {
        if (node.node_type !== 'WAREHOUSE' || node.ref_table !== 'warehouses') continue;
        const warehouseId = Number(node.ref_id);
        if (!Number.isFinite(warehouseId)) continue;
        warehouseNodeByRefId.set(warehouseId, node.id);
      }

      const productionNodeIds = productionWarehouses
        .map((warehouse) => warehouseNodeByRefId.get(warehouse.id))
        .filter((nodeId): nodeId is number => Number.isFinite(nodeId));

      const finishedGoodItemIds = items
        .filter((item) => item.type === 'FINISHED_GOOD')
        .map((item) => item.id);

      if (productionNodeIds.length === 0 || finishedGoodItemIds.length === 0) {
        return { labels: [], totals: [], itemSeries: [] };
      }

      const labels: string[] = [];
      const dailyItemMaps: Array<Map<string, number>> = [];
      const dayEndDates: Date[] = [];

      for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date();
        day.setDate(day.getDate() - offset);
        day.setHours(23, 59, 59, 999);
        dayEndDates.push(day);
        labels.push(formatDayLabel(day));
      }

      const dailyBalances = await Promise.all(
        dayEndDates.map(async (dayEndDate) => {
          const response = await api.get(`/api/organizations/${organizationId}/inventory-balances`, {
            params: {
              node_ids: productionNodeIds.join(','),
              item_ids: finishedGoodItemIds.join(','),
              statuses: 'POSTED',
              to_date: dayEndDate.toISOString()
            }
          });
          return (response.data.balances ?? []) as BalanceRow[];
        })
      );

      const totals = dailyBalances.map((dayRows) => {
        const itemMap = new Map<string, number>();
        let total = 0;
        for (const row of dayRows) {
          const qty = toNumber(row.balance_qty);
          total += qty;
          const itemLabel = row.item_code
            ? `${row.item_code}${row.item_name ? ` - ${row.item_name}` : ''}`
            : row.item_name ?? 'Bilinmeyen Urun';
          itemMap.set(itemLabel, (itemMap.get(itemLabel) ?? 0) + qty);
        }
        dailyItemMaps.push(itemMap);
        return total;
      });

      // Son gune gore en yuksek stoklu ilk 3 urunu cizimde seriliyoruz.
      const lastDayMap = dailyItemMaps[dailyItemMaps.length - 1] ?? new Map<string, number>();
      const topItems = [...lastDayMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([itemName]) => itemName);

      const itemSeries: ProductionItemSeries[] = topItems.map((itemName) => ({
        name: itemName,
        data: dailyItemMaps.map((dayMap) => dayMap.get(itemName) ?? 0)
      }));

      return { labels, totals, itemSeries };
    } catch {
      return thunkApi.rejectWithValue('Uretim stok verileri yuklenemedi.');
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
        state.healthLoading = true;
        state.error = '';
      })
      .addCase(fetchHealthStatus.fulfilled, (state, action) => {
        state.healthLoading = false;
        state.healthStatus = action.payload;
      })
      .addCase(fetchHealthStatus.rejected, (state) => {
        state.healthLoading = false;
        state.healthStatus = 'offline';
        state.error = 'API erisilemiyor.';
      })
      .addCase(fetchProductionDailyStock.pending, (state) => {
        state.productionLoading = true;
      })
      .addCase(fetchProductionDailyStock.fulfilled, (state, action) => {
        state.productionLoading = false;
        state.productionDailyStock = action.payload;
      })
      .addCase(fetchProductionDailyStock.rejected, (state, action) => {
        state.productionLoading = false;
        state.productionDailyStock = { labels: [], totals: [], itemSeries: [] };
        state.error = action.payload ?? 'Uretim stok verileri yuklenemedi.';
      });
  }
});

export default dashboardSlice.reducer;
