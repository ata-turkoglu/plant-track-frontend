import type { FormEvent } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import AppDialog from '../../components/common/AppDialog';

type TFn = (key: string, fallback: string) => string;

type Option<TValue> = { label: string; value: TValue };

type Props = {
  t: TFn;
  visible: boolean;
  editing: boolean;
  mutating: boolean;
  warehouseTypeOptions: Option<number>[];
  unitOptions: Option<number>[];
  warehouseTypeId: number | null;
  setWarehouseTypeId: (value: number | null) => void;
  unitId: number | null;
  setUnitId: (value: number | null) => void;
  code: string;
  setCode: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  sizeSpec: string;
  setSizeSpec: (value: string) => void;
  sizeUnitId: number | null;
  setSizeUnitId: (value: number | null) => void;
  onHide: () => void;
  onSubmit: (e: FormEvent) => void;
};

export default function ItemGroupAddEditDialog({
  t,
  visible,
  editing,
  mutating,
  warehouseTypeOptions,
  unitOptions,
  warehouseTypeId,
  setWarehouseTypeId,
  unitId,
  setUnitId,
  code,
  setCode,
  name,
  setName,
  sizeSpec,
  setSizeSpec,
  sizeUnitId,
  setSizeUnitId,
  onHide,
  onSubmit
}: Props) {
  const canSubmit = Boolean(warehouseTypeId && unitId && code.trim() && name.trim());

  return (
    <AppDialog
      id="setup-item-group-add-edit"
      header={editing ? t('setup.item_groups.edit', 'Malzeme Grubu Duzenle') : t('setup.item_groups.new', 'Yeni Malzeme Grubu')}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-2xl"
    >
      <form className="grid gap-3" onSubmit={onSubmit} autoComplete="off">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.item_groups.col.type', 'Tür')}</span>
            <Dropdown
              value={warehouseTypeId}
              options={warehouseTypeOptions}
              onChange={(e) => setWarehouseTypeId(e.value ?? null)}
              className="w-full"
              placeholder={t('setup.item_groups.select_type', 'Depo tipi sec')}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.item_groups.col.unit', 'Stok Birimi')}</span>
            <Dropdown value={unitId} options={unitOptions} onChange={(e) => setUnitId(e.value ?? null)} className="w-full" placeholder={t('setup.item_groups.select_unit', 'Birim sec')} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.item_groups.col.code', 'Kod')}</span>
            <InputText value={code} onChange={(e) => setCode(e.target.value)} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.item_groups.col.name', 'Ad')}</span>
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.item_groups.col.spec', 'Ölçü')}</span>
            <InputText value={sizeSpec} onChange={(e) => setSizeSpec(e.target.value)} className="w-full" placeholder={t('setup.item_groups.spec.placeholder', 'Orn: 10W/20, 6204')} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.item_groups.col.spec_unit', 'Ölçü Birimi')}</span>
            <Dropdown
              value={sizeUnitId}
              options={unitOptions}
              onChange={(e) => setSizeUnitId(e.value ?? null)}
              className="w-full"
              showClear
              placeholder={t('setup.item_groups.select_spec_unit', 'Opsiyonel')}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text type="button" onClick={onHide} />
          <Button label={t('common.save', 'Kaydet')} size="small" type="submit" loading={mutating} disabled={!canSubmit} />
        </div>
      </form>
    </AppDialog>
  );
}
