import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import AppDialog from '../components/common/AppDialog';

type TFn = (key: string, fallback: string) => string;

type SupplierKind = 'SUPPLIER_EXTERNAL' | 'SUPPLIER_INTERNAL';

type Option<TValue> = { label: string; value: TValue };

type Props = {
  t: TFn;
  visible: boolean;
  mode: 'create' | 'edit';
  mutating: boolean;
  kind: SupplierKind;
  setKind: (value: SupplierKind) => void;
  kindOptions: Option<SupplierKind>[];
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  contactName: string;
  setContactName: (value: string) => void;
  taxNo: string;
  setTaxNo: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  active: boolean;
  setActive: (value: boolean) => void;
  onHide: () => void;
  onSubmit: () => void;
};

export default function SupplierAddEditDialog({
  t,
  visible,
  mode,
  mutating,
  kind,
  setKind,
  kindOptions,
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  contactName,
  setContactName,
  taxNo,
  setTaxNo,
  address,
  setAddress,
  notes,
  setNotes,
  active,
  setActive,
  onHide,
  onSubmit
}: Props) {
  return (
    <AppDialog
      id="supplier-add-edit"
      header={mode === 'edit' ? t('supplier.edit', 'Tedarikci Duzenle') : t('supplier.new', 'Yeni Tedarikci')}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-lg"
    >
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('supplier.col.kind', 'Tip')}</span>
          <Dropdown value={kind} onChange={(e) => setKind(e.value)} options={kindOptions} className="w-full" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('common.name', 'Isim')}</span>
          <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.phone', 'Telefon')}</span>
            <InputText value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.email', 'E-posta')}</span>
            <InputText value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.contact_name', 'Yetkili')}</span>
            <InputText value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('common.tax_no', 'Vergi No')}</span>
            <InputText value={taxNo} onChange={(e) => setTaxNo(e.target.value)} className="w-full" />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('common.address', 'Adres')}</span>
          <InputTextarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" rows={3} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('common.note', 'Not')}</span>
          <InputTextarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" rows={3} />
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
          <span className="text-sm text-slate-700">{t('common.active', 'Aktif')}</span>
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={onHide} />
          <Button
            label={t('common.save', 'Kaydet')}
            size="small"
            onClick={onSubmit}
            loading={mutating}
            disabled={!name.trim()}
          />
        </div>
      </div>
    </AppDialog>
  );
}
