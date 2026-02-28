import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';

import type { BalanceTableProps } from './types';

export default function InventoryBalancesTable({ translate, rows, unitLabelResolver }: BalanceTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{translate('inventory.stock_info', 'Stok Bilgisi')}</span>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            value={rows}
            size="small"
            emptyMessage={translate('inventory.empty.balance', 'Bakiye yok.')}
            paginator
            rows={12}
            tableStyle={{ minWidth: '44rem' }}
          >
            <Column field="inventory_item_code" header={translate('inventory.col.code', 'Kod')} sortable />
            <Column field="inventory_item_name" header={translate('inventory.col.item', 'Urun')} sortable />
            <Column field="balance_qty" header={translate('inventory.col.balance', 'Bakiye')} sortable />
            <Column
              field="unit_code"
              header={translate('inventory.col.unit', 'Birim')}
              sortable
              body={(row: { unit_code?: string | null }) => unitLabelResolver(row.unit_code)}
            />
          </DataTable>
        </div>
      </div>
    </div>
  );
}
