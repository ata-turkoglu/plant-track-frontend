import type { CSSProperties, ReactNode } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta, DataTableStateEvent } from 'primereact/datatable';

import { formatUnitLabelWithName, type UnitLike } from './itemUtils';
import { useI18n } from '../../hooks/useI18n';
import NoteTooltipIcon, { NoteTooltipBinder } from '../common/NoteTooltipIcon';

export type ItemTableRow = {
  id: number;
  warehouse_type_id?: number;
  inventory_item_card_id?: number;
  inventory_item_card_code?: string | null;
  inventory_item_card_name?: string | null;
  code: string;
  name: string;
  description?: string | null;
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
  const { t, tUnit, tUnitSymbol } = useI18n();
  const unitById = new Map<number, UnitLike>();
  for (const unit of units) unitById.set(unit.id, unit);

  return (
    <>
      <NoteTooltipBinder />
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
        <Column
          field="code"
          header={t('inventory.col.code', 'Kod')}
          sortable
          filter={showFilters}
          filterPlaceholder={showFilters ? t('common.search', 'Ara') : undefined}
          style={{ width: '12rem' }}
        />
        <Column
          field="name"
          header={t('inventory.col.item', 'Urun')}
          sortable
          filter={showFilters}
          filterPlaceholder={showFilters ? t('common.search', 'Ara') : undefined}
        />
        <Column
          field="brand"
          header={t('item.col.brand', 'Marka')}
          sortable
          filter={showFilters}
          filterPlaceholder={showFilters ? t('common.search', 'Ara') : undefined}
          style={{ width: '10rem' }}
          body={(row: ItemTableRow) => row.brand ?? '-'}
        />
        <Column
          field="description"
          header={t('common.description', 'Aciklama')}
          sortable
          filter={showFilters}
          filterPlaceholder={showFilters ? t('common.search', 'Ara') : undefined}
          style={{ width: '8rem' }}
          body={(row: ItemTableRow) => <NoteTooltipIcon text={row.description} ariaLabel={t('common.description', 'Aciklama')} />}
        />
        <Column
          field="model"
          header={t('item.col.model', 'Model')}
          sortable
          filter={showFilters}
          filterPlaceholder={showFilters ? t('common.search', 'Ara') : undefined}
          style={{ width: '10rem' }}
          body={(row: ItemTableRow) => row.model ?? '-'}
        />
        <Column
          field="size_spec"
          header={t('item.col.size', 'Olcu')}
          sortable
          filter={showFilters}
          filterPlaceholder={showFilters ? t('common.search', 'Ara') : undefined}
          style={{ width: '12rem' }}
          body={(row: ItemTableRow) => {
            if (!row.size_spec) return '-';
            const sizeUnit = row.size_unit_id ? unitById.get(row.size_unit_id) : null;
            const sizeUnitLabel = sizeUnit
              ? formatUnitLabelWithName(
                  sizeUnit,
                  tUnit(sizeUnit.code ?? undefined, sizeUnit.name ?? sizeUnit.code ?? '-'),
                  tUnitSymbol(sizeUnit.symbol ?? undefined, sizeUnit.symbol ?? undefined)
                )
              : null;
            return sizeUnitLabel ? `${row.size_spec} ${sizeUnitLabel}` : row.size_spec;
          }}
        />
        <Column
          field="unit_id"
          header={t('inventory.col.unit', 'Birim')}
          sortable
          style={{ width: '12rem' }}
          body={(row: ItemTableRow) => {
            const unit = row.unit_id ? unitById.get(row.unit_id) : null;
            return formatUnitLabelWithName(
              unit,
              unit ? tUnit(unit.code ?? undefined, unit.name ?? unit.code ?? '-') : undefined,
              unit ? tUnitSymbol(unit.symbol ?? undefined, unit.symbol ?? undefined) : undefined
            );
          }}
        />
        {actionBody ? <Column header="" style={actionStyle ?? { width: '7rem' }} body={actionBody} /> : null}
      </DataTable>
    </>
  );
}
