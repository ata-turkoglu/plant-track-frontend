import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { FilterMatchMode } from 'primereact/api';

import { api } from '../services/api';
import type { RootState } from '../store';

type SupplierKind = 'SUPPLIER_EXTERNAL' | 'SUPPLIER_INTERNAL';

type SupplierRow = {
  id: number;
  organization_id: number;
  kind: SupplierKind;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_no?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const kindOptions = [
  { label: 'Dis Tedarikci', value: 'SUPPLIER_EXTERNAL' as const },
  { label: 'Ic Tedarikci', value: 'SUPPLIER_INTERNAL' as const }
];

export default function SuppliersPage() {
  const organizationId = useSelector((s: RootState) => s.user.organizationId);

  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<SupplierKind>('SUPPLIER_EXTERNAL');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    kind: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    email: { value: null, matchMode: FilterMatchMode.CONTAINS },
    phone: { value: null, matchMode: FilterMatchMode.CONTAINS }
  });

  const reload = async () => {
    if (!organizationId) return;
    const res = await api.get(`/api/organizations/${organizationId}/suppliers`);
    setRows(res.data.suppliers ?? []);
  };

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    reload()
      .catch(() => setError('Tedarikciler yuklenemedi.'))
      .finally(() => setLoading(false));
  }, [organizationId]);

  const globalFilterFields = useMemo(() => ['kind', 'name', 'email', 'phone'], []);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setName('');
    setKind('SUPPLIER_EXTERNAL');
    setEmail('');
    setPhone('');
    setContactName('');
    setTaxNo('');
    setAddress('');
    setNotes('');
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (row: SupplierRow) => {
    setMode('edit');
    setEditingId(row.id);
    setName(row.name);
    setKind(row.kind);
    setEmail(row.email ?? '');
    setPhone(row.phone ?? '');
    setContactName(row.contact_name ?? '');
    setTaxNo(row.tax_no ?? '');
    setAddress(row.address ?? '');
    setNotes(row.notes ?? '');
    setActive(row.active);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!organizationId || !name.trim()) return;

    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        kind,
        email: email.trim() || null,
        phone: phone.trim() || null,
        contact_name: contactName.trim() || null,
        tax_no: taxNo.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        active
      };
      if (mode === 'edit' && editingId) {
        await api.put(`/api/organizations/${organizationId}/suppliers/${editingId}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/suppliers`, payload);
      }
      await reload();
      setDialogOpen(false);
    } catch {
      setError('Kaydetme basarisiz. Isim benzersiz olmali.');
    } finally {
      setLoading(false);
    }
  };

  const remove = (row: SupplierRow) => {
    if (!organizationId) return;
    confirmDialog({
      message: `${row.name} kaydini silmek istiyor musun?`,
      header: 'Silme Onayi',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger p-button-sm',
      acceptLabel: 'Sil',
      rejectLabel: 'Vazgec',
      accept: async () => {
        setLoading(true);
        setError('');
        try {
          await api.delete(`/api/organizations/${organizationId}/suppliers/${row.id}`);
          await reload();
        } catch {
          setError('Silme basarisiz.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadi. Lutfen tekrar giris yap." className="w-full" />;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InputText
          value={search}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            setFilters((prev) => ({ ...prev, global: { ...prev.global, value: v } }));
          }}
          placeholder="Ara: isim veya tip"
          className="w-72"
        />
        <Button label="Yeni Tedarikci" icon="pi pi-plus" size="small" onClick={openCreate} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <DataTable
          value={rows}
          size="small"
          loading={loading}
          emptyMessage="Tedarikci yok."
          dataKey="id"
          paginator
          rows={12}
          filters={filters}
          onFilter={(e) => setFilters(e.filters)}
          globalFilterFields={globalFilterFields}
        >
          <Column field="kind" header="Tip" sortable filter style={{ width: '14rem' }} />
          <Column field="name" header="Isim" sortable filter />
          <Column field="phone" header="Telefon" sortable filter style={{ width: '12rem' }} />
          <Column field="email" header="E-posta" sortable filter style={{ width: '16rem' }} />
          <Column
            field="active"
            header="Aktif"
            sortable
            style={{ width: '7rem' }}
            body={(row: SupplierRow) => <span>{row.active ? 'Evet' : 'Hayir'}</span>}
          />
          <Column
            header=""
            style={{ width: '7rem' }}
            body={(row: SupplierRow) => (
              <div className="flex items-center justify-end gap-1">
                <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} />
                <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} />
              </div>
            )}
          />
        </DataTable>
      </div>

      <Dialog
        header={mode === 'edit' ? 'Tedarikci Duzenle' : 'Yeni Tedarikci'}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
      > 
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Tip</span>
            <Dropdown value={kind} onChange={(e) => setKind(e.value)} options={kindOptions} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Isim</span>
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Telefon</span>
              <InputText value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">E-posta</span>
              <InputText value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Yetkili</span>
              <InputText value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Vergi No</span>
              <InputText value={taxNo} onChange={(e) => setTaxNo(e.target.value)} className="w-full" />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Adres</span>
            <InputTextarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" rows={3} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Not</span>
            <InputTextarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" rows={3} />
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
            <span className="text-sm text-slate-700">Aktif</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Vazgec" size="small" text onClick={() => setDialogOpen(false)} />
            <Button label="Kaydet" size="small" onClick={submit} loading={loading} disabled={!name.trim()} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
