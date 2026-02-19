import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';

import type { MovementTableProps } from './types';

export default function InventoryMovementsTable({
  translate,
  loading,
  rows,
  filters,
  onFilter,
  occurredAtBody,
  actionsBody
}: MovementTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto py-3">
        <DataTable
          value={rows}
          loading={loading}
          size="small"
          emptyMessage={translate('inventory.empty.movements', 'Hareket yok.')}
          removableSort
          sortMode="multiple"
          sortField="occurred_at"
          sortOrder={-1}
          filters={filters}
          onFilter={onFilter}
          globalFilterFields={['from_label', 'to_label', 'item_code', 'item_name', 'uom']}
          dataKey="row_key"
          tableStyle={{ minWidth: '70rem' }}
        >
          <Column field="item_code" header={translate('inventory.col.code', 'Kod')} sortable filter filterPlaceholder={translate('common.search', 'Ara')} />
          <Column field="item_name" header={translate('inventory.col.item', 'Urun')} sortable filter filterPlaceholder={translate('common.search', 'Ara')} />
          <Column field="from_label" header={translate('inventory.col.from', 'Nereden')} sortable filter filterPlaceholder={translate('common.search', 'Ara')} />
          <Column field="to_label" header={translate('inventory.col.to', 'Nereye')} sortable filter filterPlaceholder={translate('common.search', 'Ara')} />
          <Column field="quantity" header={translate('inventory.col.qty', 'Miktar')} sortable style={{ width: '8rem' }} />
          <Column field="uom" header={translate('inventory.col.unit', 'Birim')} sortable filter filterPlaceholder={translate('common.search', 'Ara')} />
          <Column header={translate('inventory.col.date', 'Tarih')} body={occurredAtBody} sortField="occurred_at" sortable />
          <Column header="" body={actionsBody} />
        </DataTable>
      </div>
    </div>
  );
}
