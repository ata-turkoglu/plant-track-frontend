import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../store';

export function useI18n() {
  const locale = useSelector((s: RootState) => s.i18n.locale);
  const entries = useSelector((s: RootState) => s.i18n.entries);

  const t = useMemo(
    () =>
      (key: string, fallback?: string) => {
        const value = entries[key];
        if (typeof value === 'string' && value.length > 0) return value;
        return fallback ?? key;
      },
    [entries]
  );

  const tWarehouseType = useMemo(
    () =>
      (code: string | undefined, fallbackName?: string) => {
        if (!code) return fallbackName ?? '';
        return t(`warehouse_type.${code}`, fallbackName ?? code);
      },
    [t]
  );

  return { locale, t, tWarehouseType };
}
