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
  'materials/createItem/fulfilled': { summary: 'Başarılı', detail: 'Malzeme oluşturuldu.' },
  'materials/updateItem/fulfilled': { summary: 'Başarılı', detail: 'Malzeme güncellendi.' },
  'materials/deleteItem/fulfilled': { summary: 'Başarılı', detail: 'Malzeme pasife alındı.' },
  'customers/create/fulfilled': { summary: 'Başarılı', detail: 'Müşteri oluşturuldu.' },
  'customers/update/fulfilled': { summary: 'Başarılı', detail: 'Müşteri güncellendi.' },
  'customers/delete/fulfilled': { summary: 'Başarılı', detail: 'Müşteri silindi.' },
  'suppliers/create/fulfilled': { summary: 'Başarılı', detail: 'Tedarikçi oluşturuldu.' },
  'suppliers/update/fulfilled': { summary: 'Başarılı', detail: 'Tedarikçi güncellendi.' },
  'suppliers/delete/fulfilled': { summary: 'Başarılı', detail: 'Tedarikçi silindi.' },
  'auth/login/fulfilled': { summary: 'Başarılı', detail: 'Giriş yapıldı.' },
  'auth/register/fulfilled': { summary: 'Başarılı', detail: 'Kayıt tamamlandı.' },
  'auth/forgotPassword/fulfilled': { summary: 'Başarılı', detail: 'Sıfırlama maili gönderildi.' },
  'setup/updateOrganizationName/fulfilled': { summary: 'Başarılı', detail: 'Organizasyon adı güncellendi.' },
  'setup/createLocation/fulfilled': { summary: 'Başarılı', detail: 'Lokasyon oluşturuldu.' },
  'setup/updateLocation/fulfilled': { summary: 'Başarılı', detail: 'Lokasyon güncellendi.' },
  'setup/deleteLocation/fulfilled': { summary: 'Başarılı', detail: 'Lokasyon silindi.' },
  'setup/createWarehouse/fulfilled': { summary: 'Başarılı', detail: 'Depo oluşturuldu.' },
  'setup/updateWarehouse/fulfilled': { summary: 'Başarılı', detail: 'Depo güncellendi.' },
  'setup/deleteWarehouse/fulfilled': { summary: 'Başarılı', detail: 'Depo silindi.' },
  'inventory/upsertMovement/fulfilled': { summary: 'Başarılı', detail: 'Stok hareketi kaydedildi.' },
  'inventory/deleteMovement/fulfilled': { summary: 'Başarılı', detail: 'Stok hareketi silindi.' },
  'inventory/upsertItem/fulfilled': { summary: 'Başarılı', detail: 'Item kaydedildi.' },
  'inventory/deleteItem/fulfilled': { summary: 'Başarılı', detail: 'Item silindi.' }
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
