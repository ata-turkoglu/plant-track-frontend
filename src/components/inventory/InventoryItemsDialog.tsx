import type { ReactNode } from 'react';
import { Button } from 'primereact/button';

import SearchField from '../common/SearchField';
import ItemsTable, { type ItemTableRow } from '../items/ItemsTable';
import type { UnitLike } from '../items/itemUtils';
import type { TranslateFn } from './types';
import AppDialog from '../common/AppDialog';

type InventoryItemsDialogProps = {
  translate: TranslateFn;
  visible: boolean;
  activeWarehouseTypeName: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onHide: () => void;
  onOpenCreateItem: () => void;
  createDisabled: boolean;
  items: ItemTableRow[];
  units: UnitLike[];
  actionBody: (row: ItemTableRow) => ReactNode;
};

export default function InventoryItemsDialog({
  translate,
  visible,
  activeWarehouseTypeName,
  searchValue,
  onSearchChange,
  onHide,
  onOpenCreateItem,
  createDisabled,
  items,
  units,
  actionBody
}: InventoryItemsDialogProps) {
  return (
    <AppDialog
      id="inventory-items"
      header={`${translate('inventory.materials', 'Malzemeler')} (${activeWarehouseTypeName})`}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-4xl"
      contentStyle={{ minHeight: '50vh' }}
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchField
            value={searchValue}
            onChange={onSearchChange}
            placeholder={translate('common.search', 'Ara')}
            ariaLabel={translate('inventory.search_items', 'Item ara')}
          />
          <Button
            label={translate('inventory.new_item', 'Yeni Item')}
            icon="pi pi-plus"
            size="small"
            onClick={onOpenCreateItem}
            disabled={createDisabled}
            aria-label={translate('inventory.new_item', 'Yeni Item')}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
          <ItemsTable
            items={items}
            units={units}
            emptyMessage={translate('inventory.empty.items', 'Item yok.')}
            tableStyle={{ minWidth: '62rem' }}
            actionBody={actionBody}
          />
        </div>
      </div>
    </AppDialog>
  );
}
