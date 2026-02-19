import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';

import SearchField from '../common/SearchField';
import type { SelectOption, TranslateFn } from './types';

type InventoryContentToolbarProps = {
  translate: TranslateFn;
  contentTab: 'movements' | 'balances';
  activeWarehouseTypeId: number | null;
  activeWarehouseTypeName: string;
  onOpenItems: () => void;
  movementSearch: string;
  onMovementSearchChange: (value: string) => void;
  onOpenEntry: () => void;
  canCreateMovement: boolean;
  selectedBalanceWarehouseId: number | null;
  onSelectedBalanceWarehouseIdChange: (value: number | null) => void;
  balanceWarehouseOptions: SelectOption<number>[];
};

export default function InventoryContentToolbar({
  translate,
  contentTab,
  activeWarehouseTypeId,
  activeWarehouseTypeName,
  onOpenItems,
  movementSearch,
  onMovementSearchChange,
  onOpenEntry,
  canCreateMovement,
  selectedBalanceWarehouseId,
  onSelectedBalanceWarehouseIdChange,
  balanceWarehouseOptions
}: InventoryContentToolbarProps) {
  const commonItemsButton = (
    <Button
      label={`${translate('inventory.materials', 'Malzemeler')} (${activeWarehouseTypeName})`}
      icon="pi pi-list"
      size="small"
      outlined
      onClick={onOpenItems}
      disabled={!activeWarehouseTypeId}
      aria-label={translate('inventory.materials', 'Malzemeler')}
    />
  );

  if (contentTab === 'movements') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {commonItemsButton}
        <SearchField
          value={movementSearch}
          onChange={onMovementSearchChange}
          placeholder={translate('common.search', 'Ara')}
          ariaLabel={translate('inventory.search_movements', 'Hareketlerde ara')}
        />
        <Button
          label={translate('inventory.new_movement', 'Yeni Hareket')}
          icon="pi pi-plus"
          size="small"
          onClick={onOpenEntry}
          disabled={!canCreateMovement}
          aria-label={translate('inventory.new_movement', 'Yeni Hareket')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {commonItemsButton}
      <Dropdown
        value={selectedBalanceWarehouseId}
        onChange={(event) => onSelectedBalanceWarehouseIdChange(event.value ?? null)}
        options={balanceWarehouseOptions}
        className="w-full sm:w-72"
        placeholder={translate('inventory.select_warehouse', 'Depo sec')}
        filter
        aria-label={translate('inventory.select_warehouse', 'Depo sec')}
        disabled={balanceWarehouseOptions.length === 0}
      />
    </div>
  );
}
