import type { ReactNode } from 'react';
import type { DataTableFilterMeta, DataTableStateEvent } from 'primereact/datatable';

import type { BalanceRow } from '../../store/inventorySlice';
import type { SelectOption, TranslateFn } from '../../types/ui';

export type { TranslateFn, SelectOption };

export type NodeGroupKey = 'WAREHOUSE' | 'LOCATION' | 'SUPPLIER' | 'CUSTOMER';

export type GroupedNodeOption = {
  label: string;
  groupKey: NodeGroupKey;
  items: SelectOption<number>[];
};

export type EventLineDraft = {
  id: string;
  inventory_item_id: number | null;
  quantity: number | null;
  amount_unit_id: number | null;
};

export type MovementDisplayRow = {
  row_key: string;
  movement_group_id: string | null;
  movement_type: string;
  from_label: string;
  to_label: string;
  item_code: string;
  item_name: string;
  quantity: string | number;
  uom: string;
  occurred_at: string;
  _sourceMovementId?: number;
};

export type MovementTableProps = {
  translate: TranslateFn;
  loading: boolean;
  rows: MovementDisplayRow[];
  filters: DataTableFilterMeta;
  onFilter: (event: DataTableStateEvent) => void;
  occurredAtBody: (row: { occurred_at: string }) => ReactNode;
  actionsBody: (row: MovementDisplayRow) => ReactNode;
};

export type BalanceTableProps = {
  translate: TranslateFn;
  rows: BalanceRow[];
  unitLabelResolver: (unitCode?: string | null) => string;
};
