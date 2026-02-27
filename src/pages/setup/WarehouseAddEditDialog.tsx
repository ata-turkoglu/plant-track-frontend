import type { FormEvent } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';

type TFn = (key: string, fallback: string) => string;

type Option<TValue> = { label: string; value: TValue };

type Props = {
  t: TFn;
  visible: boolean;
  editing: boolean;
  loading: boolean;
  name: string;
  setName: (value: string) => void;
  warehouseTypeId: number | null;
  setWarehouseTypeId: (value: number | null) => void;
  locationId: number | null;
  setLocationId: (value: number | null) => void;
  typeOptions: Option<number>[];
  locationOptions: Option<number>[];
  onHide: () => void;
  onSubmit: (e: FormEvent) => void;
};

export default function WarehouseAddEditDialog({
  t,
  visible,
  editing,
  loading,
  name,
  setName,
  warehouseTypeId,
  setWarehouseTypeId,
  locationId,
  setLocationId,
  typeOptions,
  locationOptions,
  onHide,
  onSubmit
}: Props) {
  return (
    <Dialog header={editing ? t('warehouse.edit', 'Depo Duzenle') : t('warehouse.new', 'Yeni Depo')} visible={visible} onHide={onHide} className="w-full max-w-lg">
      <form className="grid gap-3" onSubmit={onSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('warehouse.field.name', 'Depo adi')}</span>
          <InputText value={name} onChange={(ev) => setName(ev.target.value)} className="w-full" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('warehouse.field.type', 'Depo turu')}</span>
          <Dropdown
            value={warehouseTypeId}
            onChange={(ev) => setWarehouseTypeId(ev.value ?? null)}
            options={typeOptions}
            optionLabel="label"
            optionValue="value"
            className="w-full"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('warehouse.field.location', 'Lokasyon')}</span>
          <Dropdown
            value={locationId}
            onChange={(ev) => setLocationId(ev.value ?? null)}
            options={locationOptions}
            optionLabel="label"
            optionValue="value"
            className="w-full"
            placeholder={t('warehouse.select_location', 'Lokasyon sec')}
            filter
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text type="button" onClick={onHide} />
          <Button label={t('common.save', 'Kaydet')} size="small" type="submit" loading={loading} disabled={!name.trim() || !locationId || !warehouseTypeId} />
        </div>
      </form>
    </Dialog>
  );
}
