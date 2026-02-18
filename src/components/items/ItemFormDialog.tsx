import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';

export type ItemFormDraft = {
  warehouseTypeId: number | null;
  code: string;
  name: string;
  brand: string;
  model: string;
  sizeSpec: string;
  sizeUnitId: number | null;
  unitId: number | null;
  active: boolean;
};

type Option = { label: string; value: number };

type ItemFormDialogProps = {
  visible: boolean;
  mode: 'create' | 'edit';
  draft: ItemFormDraft;
  onDraftChange: (next: ItemFormDraft) => void;
  warehouseTypeOptions: Option[];
  unitOptions: Option[];
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
  loading = false,
  warehouseTypeDisabled = false,
  onHide,
  onSubmit
}: ItemFormDialogProps) {
  const submitDisabled = !draft.code.trim() || !draft.name.trim() || !draft.unitId || !draft.warehouseTypeId;

  return (
    <Dialog
      header={mode === 'edit' ? 'Malzeme Düzenle' : 'Yeni Malzeme'}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-lg"
    >
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Depo Tipi</span>
          <Dropdown
            value={draft.warehouseTypeId}
            onChange={(e) => onDraftChange({ ...draft, warehouseTypeId: e.value ?? null })}
            options={warehouseTypeOptions}
            className="w-full"
            disabled={warehouseTypeDisabled}
            placeholder="Depo tipi seç"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">İsim</span>
          <InputText value={draft.name} onChange={(e) => onDraftChange({ ...draft, name: e.target.value })} className="w-full" />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Kod</span>
            <InputText value={draft.code} onChange={(e) => onDraftChange({ ...draft, code: e.target.value })} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Birim</span>
            <Dropdown
              value={draft.unitId}
              onChange={(e) => onDraftChange({ ...draft, unitId: e.value ?? null })}
              options={unitOptions}
              className="w-full"
            />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Marka</span>
            <InputText value={draft.brand} onChange={(e) => onDraftChange({ ...draft, brand: e.target.value })} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Model</span>
            <InputText value={draft.model} onChange={(e) => onDraftChange({ ...draft, model: e.target.value })} className="w-full" />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Ölçü / Spec</span>
            <InputText
              value={draft.sizeSpec}
              onChange={(e) => onDraftChange({ ...draft, sizeSpec: e.target.value })}
              className="w-full"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Ölçü Birimi</span>
            <Dropdown
              value={draft.sizeUnitId}
              onChange={(e) => onDraftChange({ ...draft, sizeUnitId: e.value ?? null })}
              options={unitOptions}
              showClear
              className="w-full"
            />
          </label>
        </div>

        <label className="flex items-center gap-2">
          <Checkbox checked={draft.active} onChange={(e) => onDraftChange({ ...draft, active: Boolean(e.checked) })} />
          <span className="text-sm font-medium text-slate-700">Aktif</span>
        </label>

        <div className="flex items-center justify-end gap-2">
          <Button label="Vazgeç" text onClick={onHide} />
          <Button label="Kaydet" onClick={onSubmit} loading={loading} disabled={submitDisabled} />
        </div>
      </div>
    </Dialog>
  );
}
