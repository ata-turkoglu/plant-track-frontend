import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import type { RootState } from '../../app/store';
import { inventoryApi } from '../../services/inventoryApi';
import type { ApiErrorPayload, OnHandRow, Product, StockItem } from '../../types/inventory';

interface InventoryState {
  products: Product[];
  stock: StockItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: InventoryState = {
  products: [],
  stock: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

function getAxiosErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return (
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      'Request failed'
    );
  }

  return 'Unexpected error';
}

export const fetchInventory = createAsyncThunk<
  { products: Product[]; stock: StockItem[] },
  void,
  { rejectValue: string }
>('inventory/fetchInventory', async (_, { rejectWithValue }) => {
  try {
    const [products, onHand] = await Promise.all([inventoryApi.listProducts(), inventoryApi.getOnHand({})]);

    const quantityByProduct = onHand.reduce<Record<number, number>>((acc, row: OnHandRow) => {
      acc[row.productId] = (acc[row.productId] ?? 0) + Number(row.quantityOnHand);
      return acc;
    }, {});

    const stock: StockItem[] = products.map((product) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      quantity: quantityByProduct[product.id] ?? 0,
      unit: product.unit,
      updatedAt: product.updatedAt
    }));

    return {
      products: products.map((product) => ({
        ...product,
        stockQuantity: quantityByProduct[product.id] ?? 0
      })),
      stock
    };
  } catch (error) {
    return rejectWithValue(getAxiosErrorMessage(error));
  }
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
        state.stock = action.payload.stock;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unable to load data';
      });
  },
});

export const selectInventory = (state: RootState) => state.inventory;

export default inventorySlice.reducer;
