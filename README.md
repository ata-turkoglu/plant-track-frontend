# Frontend Agent Guide

This file is for AI agents working in the frontend scope (`frontend/`).

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

## Toast Message Rule (Required)

After required operations, toast messages must be present.

- Success toast: after meaningful successful actions (create, update, delete, save, etc.).
- Error toast: for failed operations.
- Prefer centralized behavior:
  - `*/rejected` thunk actions should surface error toast.
  - Known `*/fulfilled` actions should surface success toast.
- If an operation is handled locally (page-level API call), dispatch `enqueueToast(...)` explicitly.
- Avoid duplicate notifications (for the same event, do not show both inline success/error block and toast).

## Implementation Note

Use:

- `enqueueToast({ severity: 'success' | 'error' | 'info' | 'warn', summary, detail })`

from:

- `src/store/uiSlice.ts`

