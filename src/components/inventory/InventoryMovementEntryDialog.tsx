import type { ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';

import type { EventLineDraft, GroupedNodeOption, SelectOption, TranslateFn } from './types';
import AppDialog from '../common/AppDialog';

type InventoryMovementEntryDialogProps = {
  translate: TranslateFn;
  visible: boolean;
  editingMovement: boolean;
  occurredAt: Date;
  onOccurredAtChange: (value: Date) => void;
  fromNodeId: number | null;
  toNodeId: number | null;
  onFromNodeChange: (value: number | null) => void;
  onToNodeChange: (value: number | null) => void;
  groupedNodeOptions: GroupedNodeOption[];
  nodeGroupTemplate: (group: GroupedNodeOption) => ReactNode;
  eventLines: EventLineDraft[];
  itemOptions: SelectOption<number>[];
  getUnitLabel: (unitId: number | null) => string;
  onLineItemChange: (lineId: string, itemId: number | null) => void;
  onLineQuantityChange: (lineId: string, quantity: number | null) => void;
  onRemoveLine: (lineId: string) => void;
  onAddLine: () => void;
  onOpenCreateItem: () => void;
  referenceType: string;
  onReferenceTypeChange: (value: string) => void;
  onHide: () => void;
  onSubmit: () => void;
  loading: boolean;
  saveDisabled: boolean;
};

export default function InventoryMovementEntryDialog({
  translate,
  visible,
  editingMovement,
  occurredAt,
  onOccurredAtChange,
  fromNodeId,
  toNodeId,
  onFromNodeChange,
  onToNodeChange,
  groupedNodeOptions,
  nodeGroupTemplate,
  eventLines,
  itemOptions,
  getUnitLabel,
  onLineItemChange,
  onLineQuantityChange,
  onRemoveLine,
  onAddLine,
  onOpenCreateItem,
  referenceType,
  onReferenceTypeChange,
  onHide,
  onSubmit,
  loading,
  saveDisabled
}: InventoryMovementEntryDialogProps) {
  return (
    <AppDialog
      id="inventory-movement-entry"
      header={
        editingMovement
          ? translate('inventory.edit_movement', 'Stok Hareketi Duzelt')
          : translate('inventory.new_movement_dialog', 'Yeni Stok Hareketi')
      }
      visible={visible}
      onHide={onHide}
      className="w-full max-w-4xl"
    >
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{translate('inventory.col.date', 'Tarih')}</span>
          <Calendar value={occurredAt} onChange={(e) => onOccurredAtChange(e.value ?? new Date())} showTime className="w-full" />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{translate('inventory.from_node', 'From Node')}</span>
            <Dropdown
              value={fromNodeId}
              onChange={(e) => onFromNodeChange(e.value ?? null)}
              options={groupedNodeOptions}
              optionGroupLabel="label"
              optionGroupChildren="items"
              optionGroupTemplate={nodeGroupTemplate}
              className="w-full inventory-node-dropdown"
              panelClassName="inventory-node-panel"
              filter
              filterBy="label"
              filterPlaceholder={translate('common.search', 'Ara')}
              placeholder={translate('inventory.select_source_node', 'Kaynak node sec')}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{translate('inventory.to_node', 'To Node')}</span>
            <Dropdown
              value={toNodeId}
              onChange={(e) => onToNodeChange(e.value ?? null)}
              options={groupedNodeOptions}
              optionGroupLabel="label"
              optionGroupChildren="items"
              optionGroupTemplate={nodeGroupTemplate}
              className="w-full inventory-node-dropdown"
              panelClassName="inventory-node-panel"
              filter
              filterBy="label"
              filterPlaceholder={translate('common.search', 'Ara')}
              placeholder={translate('inventory.select_target_node', 'Hedef node sec')}
            />
          </label>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">{translate('inventory.lines', 'Hareket Satirlari')}</span>
            <div className="flex items-center gap-2">
              <Button
                label={translate('inventory.new_item', 'Yeni Item')}
                icon="pi pi-plus"
                size="small"
                outlined
                onClick={onOpenCreateItem}
                aria-label={translate('inventory.new_item', 'Yeni Item')}
              />
              {!editingMovement && (
                <Button
                  label={translate('inventory.add_line', 'Satir Ekle')}
                  icon="pi pi-plus"
                  size="small"
                  onClick={onAddLine}
                  aria-label={translate('inventory.add_line', 'Satir Ekle')}
                />
              )}
            </div>
          </div>
          {eventLines.map((line) => (
            <div
              key={line.id}
              className="grid items-center gap-2 overflow-hidden rounded-lg border border-slate-200 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,10rem)_minmax(8rem,9.5rem)_2.5rem]"
            >
              <Dropdown
                value={line.item_id}
                onChange={(e) => onLineItemChange(line.id, e.value ?? null)}
                options={itemOptions}
                className="w-full min-w-0"
                filter
                placeholder={translate('inventory.item_or_material', 'Urun/Malzeme')}
              />
              <InputNumber
                value={line.quantity}
                onValueChange={(e) => onLineQuantityChange(line.id, e.value ?? null)}
                className="w-full min-w-0"
                inputClassName="w-full"
                min={0}
                placeholder={translate('inventory.col.qty', 'Miktar')}
              />
              <InputText
                value={getUnitLabel(line.amount_unit_id)}
                readOnly
                tabIndex={-1}
                onFocus={(e) => e.currentTarget.blur()}
                className="w-full min-w-0 text-sm readonly-display-input"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                text
                severity="danger"
                onClick={() => onRemoveLine(line.id)}
                disabled={eventLines.length <= 1}
                aria-label={translate('common.delete', 'Sil')}
              />
            </div>
          ))}
        </div>

        <label className="grid gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {translate('inventory.reference', 'Referans')}
            <i
              id="inventory-ref-info"
              className="pi pi-info-circle cursor-help text-xs text-slate-400 hover:text-slate-700"
              aria-label={translate('inventory.reference_info', 'Referans aciklamasi')}
              tabIndex={0}
            />
          </span>
          <InputText
            value={referenceType}
            onChange={(e) => onReferenceTypeChange(e.target.value)}
            placeholder={translate('inventory.reference_placeholder', 'PO, WO, ...')}
            className="w-full"
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={translate('common.cancel', 'Vazgec')} size="small" text onClick={onHide} aria-label={translate('common.cancel', 'Vazgec')} />
          <Button
            label={translate('common.save', 'Kaydet')}
            size="small"
            onClick={onSubmit}
            loading={loading}
            disabled={saveDisabled}
            aria-label={translate('common.save', 'Kaydet')}
          />
        </div>
      </div>
    </AppDialog>
  );
}
