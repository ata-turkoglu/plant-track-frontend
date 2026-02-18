import type { CSSProperties, ReactNode } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta, DataTableStateEvent } from 'primereact/datatable';

import { formatUnitLabel, type UnitLike } from './itemUtils';

export type ItemTableRow = {
  id: number;
  warehouse_type_id?: number;
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  size_spec?: string | null;
  size_unit_id?: number | null;
  unit_id?: number | null;
  active: boolean;
};

type ItemsTableProps = {
  items: ItemTableRow[];
  units: UnitLike[];
  loading?: boolean;
  emptyMessage?: string;
  showFilters?: boolean;
  filters?: DataTableFilterMeta;
  onFilter?: (event: DataTableStateEvent) => void;
  globalFilterFields?: string[];
  paginator?: boolean;
  rows?: number;
  tableStyle?: CSSProperties;
  actionBody?: (row: ItemTableRow) => ReactNode;
  actionStyle?: CSSProperties;
};

export default function ItemsTable({
  items,
  units,
  loading,
  emptyMessage = 'Item yok.',
  showFilters = false,
  filters,
  onFilter,
  globalFilterFields,
  paginator = false,
  rows = 12,
  tableStyle,
  actionBody,
  actionStyle
}: ItemsTableProps) {
  const unitById = new Map<number, UnitLike>();
  for (const unit of units) unitById.set(unit.id, unit);

  return (
    <DataTable
      value={items}
      size="small"
      loading={loading}
      emptyMessage={emptyMessage}
      dataKey="id"
      paginator={paginator}
      rows={rows}
      filters={filters}
      onFilter={onFilter}
      globalFilterFields={globalFilterFields}
      tableStyle={tableStyle}
      removableSort
      sortMode="multiple"
    >
      <Column field="code" header="Kod" sortable filter={showFilters} filterPlaceholder={showFilters ? 'Ara' : undefined} style={{ width: '12rem' }} />
      <Column field="name" header="Urun" sortable filter={showFilters} filterPlaceholder={showFilters ? 'Ara' : undefined} />
      <Column
        field="brand"
        header="Marka"
        sortable
        filter={showFilters}
        filterPlaceholder={showFilters ? 'Ara' : undefined}
        style={{ width: '10rem' }}
        body={(row: ItemTableRow) => row.brand ?? '-'}
      />
      <Column
        field="model"
        header="Model"
        sortable
        filter={showFilters}
        filterPlaceholder={showFilters ? 'Ara' : undefined}
        style={{ width: '10rem' }}
        body={(row: ItemTableRow) => row.model ?? '-'}
      />
      <Column
        field="size_spec"
        header="Olcu"
        sortable
        filter={showFilters}
        filterPlaceholder={showFilters ? 'Ara' : undefined}
        style={{ width: '12rem' }}
        body={(row: ItemTableRow) => {
          if (!row.size_spec) return '-';
          const sizeUnitLabel = row.size_unit_id ? formatUnitLabel(unitById.get(row.size_unit_id)) : null;
          return sizeUnitLabel ? `${row.size_spec} ${sizeUnitLabel}` : row.size_spec;
        }}
      />
      <Column
        field="unit_id"
        header="Birim"
        sortable
        style={{ width: '12rem' }}
        body={(row: ItemTableRow) => formatUnitLabel(row.unit_id ? unitById.get(row.unit_id) : null)}
      />
      <Column
        field="active"
        header="Aktif"
        sortable
        style={{ width: '7rem' }}
        body={(row: ItemTableRow) => <span>{row.active ? 'Evet' : 'Hayir'}</span>}
      />
      {actionBody ? <Column header="" style={actionStyle ?? { width: '7rem' }} body={actionBody} /> : null}
    </DataTable>
  );
}
