import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toastQueue: ToastItem[];
  nextToastId: number;
}

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastItem {
  id: string;
  severity: ToastSeverity;
  summary: string;
  detail: string;
  life?: number;
}

const initialState: UiState = {
  sidebarCollapsed: true,
  mobileSidebarOpen: false,
  toastQueue: [],
  nextToastId: 1
};

const fulfilledToastMap: Record<string, { summary: string; detail: string }> = {
  'materials/createItem/fulfilled': { summary: 'Basarili', detail: 'Malzeme olusturuldu.' },
  'materials/updateItem/fulfilled': { summary: 'Basarili', detail: 'Malzeme guncellendi.' },
  'materials/deleteItem/fulfilled': { summary: 'Basarili', detail: 'Malzeme pasife alindi.' },
  'customers/create/fulfilled': { summary: 'Basarili', detail: 'Musteri olusturuldu.' },
  'customers/update/fulfilled': { summary: 'Basarili', detail: 'Musteri guncellendi.' },
  'customers/delete/fulfilled': { summary: 'Basarili', detail: 'Musteri silindi.' },
  'suppliers/create/fulfilled': { summary: 'Basarili', detail: 'Tedarikci olusturuldu.' },
  'suppliers/update/fulfilled': { summary: 'Basarili', detail: 'Tedarikci guncellendi.' },
  'suppliers/delete/fulfilled': { summary: 'Basarili', detail: 'Tedarikci silindi.' },
  'auth/login/fulfilled': { summary: 'Basarili', detail: 'Giris yapildi.' },
  'auth/register/fulfilled': { summary: 'Basarili', detail: 'Kayit tamamlandi.' },
  'auth/forgotPassword/fulfilled': { summary: 'Basarili', detail: 'Sifirlama maili gonderildi.' },
  'setup/updateOrganizationName/fulfilled': { summary: 'Basarili', detail: 'Organizasyon adi guncellendi.' },
  'setup/createLocation/fulfilled': { summary: 'Basarili', detail: 'Lokasyon olusturuldu.' },
  'setup/updateLocation/fulfilled': { summary: 'Basarili', detail: 'Lokasyon guncellendi.' },
  'setup/deleteLocation/fulfilled': { summary: 'Basarili', detail: 'Lokasyon silindi.' },
  'setup/createWarehouse/fulfilled': { summary: 'Basarili', detail: 'Depo olusturuldu.' },
  'setup/updateWarehouse/fulfilled': { summary: 'Basarili', detail: 'Depo guncellendi.' },
  'setup/deleteWarehouse/fulfilled': { summary: 'Basarili', detail: 'Depo silindi.' },
  'inventory/upsertMovement/fulfilled': { summary: 'Basarili', detail: 'Stok hareketi kaydedildi.' },
  'inventory/deleteMovement/fulfilled': { summary: 'Basarili', detail: 'Stok hareketi silindi.' },
  'inventory/upsertItem/fulfilled': { summary: 'Basarili', detail: 'Item kaydedildi.' },
  'inventory/deleteItem/fulfilled': { summary: 'Basarili', detail: 'Item silindi.' }
};

const rejectedToastSet = new Set(
  Object.keys(fulfilledToastMap).map((fulfilledType) => fulfilledType.replace('/fulfilled', '/rejected'))
);

function enqueue(state: UiState, payload: Omit<ToastItem, 'id'>) {
  state.toastQueue.push({
    ...payload,
    id: `toast-${state.nextToastId}`
  });
  state.nextToastId += 1;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    openMobileSidebar(state) {
      state.mobileSidebarOpen = true;
    },
    closeMobileSidebar(state) {
      state.mobileSidebarOpen = false;
    },
    toggleMobileSidebar(state) {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
    enqueueToast(state, action: PayloadAction<Omit<ToastItem, 'id'>>) {
      enqueue(state, action.payload);
    },
    dequeueToast(state) {
      state.toastQueue.shift();
    }
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action): action is { type: string; payload: string } =>
          rejectedToastSet.has(action.type) && typeof action.payload === 'string' && action.payload.length > 0,
        (state, action) => {
          enqueue(state, {
            severity: 'error',
            summary: 'Hata',
            detail: action.payload
          });
        }
      )
      .addMatcher(
        (action): action is { type: string } => Object.prototype.hasOwnProperty.call(fulfilledToastMap, action.type),
        (state, action) => {
          const mapped = fulfilledToastMap[action.type];
          enqueue(state, {
            severity: 'success',
            summary: mapped.summary,
            detail: mapped.detail
          });
        }
      );
  }
});

export const { toggleSidebar, openMobileSidebar, closeMobileSidebar, toggleMobileSidebar, enqueueToast, dequeueToast } =
  uiSlice.actions;
export default uiSlice.reducer;
