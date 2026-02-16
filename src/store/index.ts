import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import userReducer from './userSlice';
import materialsReducer from './materialsSlice';
import customersReducer from './customersSlice';
import suppliersReducer from './suppliersSlice';
import dashboardReducer from './dashboardSlice';
import authReducer from './authSlice';
import setupReducer from './setupSlice';
import inventoryReducer from './inventorySlice';
import { loadPersistedUser, savePersistedUser, clearPersistedUser } from './persist';

const persistedUser = loadPersistedUser();

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    user: userReducer,
    // Domain bazli slice ayrimi.
    materials: materialsReducer,
    customers: customersReducer,
    suppliers: suppliersReducer,
    dashboard: dashboardReducer,
    auth: authReducer,
    setup: setupReducer,
    inventory: inventoryReducer
  },
  preloadedState: persistedUser
    ? {
        user: persistedUser
      }
    : undefined
});

let lastToken: string | null | undefined = undefined;
store.subscribe(() => {
  // Sadece token degistiginde persist yazimi yaparak gereksiz IO azalt.
  const user = store.getState().user;
  if (user.token !== lastToken) {
    lastToken = user.token;
    if (user.token) {
      savePersistedUser({
        name: user.name,
        role: user.role,
        email: user.email,
        token: user.token,
        organizationId: user.organizationId,
        organizationName: user.organizationName
      });
    } else {
      clearPersistedUser();
    }
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
