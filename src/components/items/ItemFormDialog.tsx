import { useMemo } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { useI18n } from '../../hooks/useI18n';
import AppDialog from '../common/AppDialog';

export type ItemFormDraft = {
  warehouseTypeId: number | null;
  itemGroupId: number | null;
  code: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  sizeSpec: string;
  sizeUnitId: number | null;
  unitId: number | null;
  active: boolean;
};

type Option = { label: string; value: number };
type ItemGroupOption = {
  label: string;
  value: number;
  amount_unit_id: number;
  size_spec?: string | null;
  size_unit_id?: number | null;
};

type ItemFormDialogProps = {
  visible: boolean;
  mode: 'create' | 'edit';
  draft: ItemFormDraft;
  onDraftChange: (next: ItemFormDraft) => void;
  warehouseTypeOptions: Option[];
  unitOptions: Option[];
  itemGroupOptions?: ItemGroupOption[];
  allowItemGroupEdit?: boolean;
  loading?: boolean;
  warehouseTypeDisabled?: boolean;
  onHide: () => void;
  onSubmit: () => void;
};

export default function ItemFormDialog({
  visible,
  mode,
  draft,
  onDraftChange,
  warehouseTypeOptions,
  unitOptions,
  itemGroupOptions = [],
  allowItemGroupEdit = false,
  loading = false,
  warehouseTypeDisabled = false,
  onHide,
  onSubmit
}: ItemFormDialogProps) {
  const { t } = useI18n();
  const submitDisabled =
    !draft.code.trim() ||
    !draft.name.trim() ||
    !draft.warehouseTypeId ||
    (!draft.unitId && !allowItemGroupEdit) ||
    (allowItemGroupEdit && !draft.itemGroupId);
  const unitLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const option of unitOptions) map.set(option.value, option.label);
    return map;
  }, [unitOptions]);

  const selectedGroup = useMemo(() => {
    if (!allowItemGroupEdit) return null;
    const groupId = draft.itemGroupId;
    if (!groupId) return null;
    return itemGroupOptions.find((g) => g.value === groupId) ?? null;
  }, [allowItemGroupEdit, draft.itemGroupId, itemGroupOptions]);
  const groupDrivenUnitLabel =
    selectedGroup && selectedGroup.amount_unit_id ? unitLabelById.get(selectedGroup.amount_unit_id) ?? '-' : '-';
  const groupDrivenSizeUnitLabel =
    selectedGroup && selectedGroup.size_unit_id ? unitLabelById.get(selectedGroup.size_unit_id) ?? '-' : '-';
  const groupDrivenSizeSpec = selectedGroup?.size_spec?.trim() ?? '';

  return (
    <AppDialog
      id="item-form"
      header={mode === 'edit' ? t('materials.edit', 'Malzeme Duzenle') : t('materials.new', 'Yeni Malzeme')}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-lg"
    >
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('warehouse.field.type', 'Depo turu')}</span>
          <Dropdown
            value={draft.warehouseTypeId}
            onChange={(e) => onDraftChange({ ...draft, warehouseTypeId: e.value ?? null })}
            options={warehouseTypeOptions}
            className="w-full"
            disabled={warehouseTypeDisabled}
            placeholder={t('warehouse.field.type', 'Depo turu')}
          />
        </label>

        {allowItemGroupEdit ? (
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('materials.group', 'Grup')}</span>
            <Dropdown
              value={draft.itemGroupId}
              onChange={(e) => {
                const nextId = e.value ?? null;
                const nextGroup = nextId ? itemGroupOptions.find((g) => g.value === nextId) ?? null : null;
                onDraftChange({
                  ...draft,
                  itemGroupId: nextId,
                  unitId: nextGroup?.amount_unit_id ?? draft.unitId,
                  sizeSpec: (nextGroup?.size_spec ?? '').trim(),
                  sizeUnitId: nextGroup?.size_unit_id ?? null
                });
              }}
              options={itemGroupOptions}
              className="w-full"
              filter
              placeholder={t('common.select', 'Sec')}
              showClear
            />
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('common.name', 'Isim')}</span>
          <InputText value={draft.name} onChange={(e) => onDraftChange({ ...draft, name: e.target.value })} className="w-full" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('common.description', 'Aciklama')}</span>
          <InputTextarea
            value={draft.description}
            onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
            className="w-full"
            rows={3}
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('inventory.col.code', 'Kod')}</span>
            <InputText value={draft.code} onChange={(e) => onDraftChange({ ...draft, code: e.target.value })} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('inventory.col.unit', 'Birim')}</span>
            {allowItemGroupEdit ? (
              <InputText
                value={groupDrivenUnitLabel}
                readOnly
                tabIndex={-1}
                onFocus={(e) => e.currentTarget.blur()}
                className="w-full readonly-display-input"
              />
            ) : (
              <Dropdown
                value={draft.unitId}
                onChange={(e) => onDraftChange({ ...draft, unitId: e.value ?? null })}
                options={unitOptions}
                className="w-full"
              />
            )}
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('item.col.brand', 'Marka')}</span>
            <InputText value={draft.brand} onChange={(e) => onDraftChange({ ...draft, brand: e.target.value })} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('item.col.model', 'Model')}</span>
            <InputText value={draft.model} onChange={(e) => onDraftChange({ ...draft, model: e.target.value })} className="w-full" />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('item.col.size', 'Olcu')} / Spec</span>
            {allowItemGroupEdit ? (
              <InputText
                value={groupDrivenSizeSpec || '-'}
                readOnly
                tabIndex={-1}
                onFocus={(e) => e.currentTarget.blur()}
                className="w-full readonly-display-input"
              />
            ) : (
              <InputText
                value={draft.sizeSpec}
                onChange={(e) => onDraftChange({ ...draft, sizeSpec: e.target.value })}
                className="w-full"
              />
            )}
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('item.size_unit', 'Olcu Birimi')}</span>
            {allowItemGroupEdit ? (
              <InputText
                value={groupDrivenSizeUnitLabel}
                readOnly
                tabIndex={-1}
                onFocus={(e) => e.currentTarget.blur()}
                className="w-full readonly-display-input"
              />
            ) : (
              <Dropdown
                value={draft.sizeUnitId}
                onChange={(e) => onDraftChange({ ...draft, sizeUnitId: e.value ?? null })}
                options={unitOptions}
                showClear
                className="w-full"
              />
            )}
          </label>
        </div>

        <label className="flex items-center gap-2">
          <Checkbox checked={draft.active} onChange={(e) => onDraftChange({ ...draft, active: Boolean(e.checked) })} />
          <span className="text-sm font-medium text-slate-700">{t('common.active', 'Aktif')}</span>
        </label>

        <div className="flex items-center justify-end gap-2">
          <Button label={t('common.cancel', 'Vazgec')} text onClick={onHide} />
          <Button label={t('common.save', 'Kaydet')} onClick={onSubmit} loading={loading} disabled={submitDisabled} />
        </div>
      </div>
    </AppDialog>
  );
}
