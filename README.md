# Frontend Agent Guide

This file is for AI agents working in the frontend scope (`frontend/`).

## Start Here

- Cross-scope agent guide: [`../README.md`](../README.md)
- Project overview: [`../README.md`](../README.md)

## Stack

- React + Vite + TypeScript
- Redux Toolkit for state management
- PrimeReact UI components

## Main Frontend Paths

- `src/pages/`: page-level screens
- `src/components/`: shared UI components
- `src/store/`: Redux slices and app store
- `src/services/api.ts`: API client setup
- `src/components/AppToast.tsx`: global toast renderer
- `src/store/uiSlice.ts`: toast queue and global success/error toast rules

## Local Dev

```bash
cd frontend
npm install
npm run dev
```

## State Management & Data Fetching Rule (Required)

Goal: minimize network requests by using Redux state efficiently.

- Keep necessary data in state so pages never require a manual refresh to reflect changes.
- When a CRUD operation succeeds, update the existing slice state in-place (insert/update/remove) instead of refetching the full list.
- Do not fetch data on first app load if it is not needed for the initial view; fetch on-demand when a feature/page needs it.
- Once fetched, write data to the store and reuse it from there (selectors) to avoid duplicate requests across pages.
- Only refetch when there is a clear invalidation reason (e.g. server-side computed fields, pagination/filter changes, explicit “Refresh”).
- Prefer predictable slice shapes for collections (`byId` + `allIds` or similar) to make updates cheap and consistent.

## Toast Message Rule (Required)

After required operations, toast messages must be present.

- Success toast: after meaningful successful actions (create, update, delete, save, etc.).
- Error toast: for failed operations.
- Prefer centralized behavior:
  - `*/rejected` thunk actions should surface error toast.
  - Known `*/fulfilled` actions should surface success toast.
- If an operation is handled locally (page-level API call), dispatch `enqueueToast(...)` explicitly.
- Avoid duplicate notifications (for the same event, do not show both inline success/error block and toast).

## Dialog File Rule (Required)

- If a dialog is self-contained (i.e., it doesn't render another locally imported component), keep it in its own `*Dialog.tsx` file located in the same folder as the page/component that owns it.
- Prefer a single dialog that supports both add and edit modes (e.g. `*AddEditDialog.tsx`), instead of separate add and edit dialog files.

## Implementation Note

Use:

- `enqueueToast({ severity: 'success' | 'error' | 'info' | 'warn', summary, detail })`

from:

- `src/store/uiSlice.ts`
