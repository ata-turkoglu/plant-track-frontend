import { useCallback, useState } from 'react';
import type { DataTableFilterMeta, DataTableStateEvent } from 'primereact/datatable';

export function useGlobalTableFilter(initialFilters: DataTableFilterMeta) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DataTableFilterMeta>(initialFilters);

  const updateGlobalSearch = useCallback((value: string) => {
    setSearch(value);
    setFilters((prev) => {
      const globalFilter = prev.global;
      if (!globalFilter || Array.isArray(globalFilter) || !('value' in globalFilter)) return prev;
      return {
        ...prev,
        global: {
          ...globalFilter,
          value
        }
      };
    });
  }, []);

  const applyTableFilters = useCallback((event: DataTableStateEvent) => {
    setFilters(event.filters);
    const rawValue = event.filters.global;
    if (!rawValue || Array.isArray(rawValue) || !('value' in rawValue)) {
      setSearch('');
      return;
    }
    const globalValue = rawValue.value;
    setSearch(typeof globalValue === 'string' ? globalValue : globalValue != null ? String(globalValue) : '');
  }, []);

  return {
    search,
    setSearch,
    filters,
    setFilters,
    updateGlobalSearch,
    applyTableFilters
  };
}
