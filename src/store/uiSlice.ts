import { createSlice } from '@reduxjs/toolkit';

interface UiState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileSidebarOpen: false
};

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
    }
  }
});

export const { toggleSidebar, openMobileSidebar, closeMobileSidebar, toggleMobileSidebar } = uiSlice.actions;
export default uiSlice.reducer;
