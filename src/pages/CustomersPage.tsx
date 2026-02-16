import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import { api } from '../services/api';
import type { RootState } from '../store';

type CustomerRow = {
  id: number;
  organization_id: number;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function CustomersPage() {
  const organizationId = useSelector((s: RootState) => s.user.organizationId);

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);

  const [search, setSearch] = useState('');

  const reload = async () => {
    if (!organizationId) return;
    const res = await api.get(`/api/organizations/${organizationId}/customers`);
    setRows(res.data.customers ?? []);
  };

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    reload()
      .catch(() => setError('Musteriler yuklenemedi.'))
      .finally(() => setLoading(false));
  }, [organizationId]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, search]);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setName('');
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (row: CustomerRow) => {
    setMode('edit');
    setEditingId(row.id);
    setName(row.name);
    setActive(row.active);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!organizationId || !name.trim()) return;

    setLoading(true);
    setError('');
    try {
      const payload = { name: name.trim(), active };
      if (mode === 'edit' && editingId) {
        await api.put(`/api/organizations/${organizationId}/customers/${editingId}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/customers`, payload);
      }
      await reload();
      setDialogOpen(false);
    } catch {
      setError('Kaydetme basarisiz. Isim benzersiz olmali.');
    } finally {
      setLoading(false);
    }
  };

  const remove = (row: CustomerRow) => {
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
          await api.delete(`/api/organizations/${organizationId}/customers/${row.id}`);
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ara: isim"
          className="w-72"
        />
        <Button label="Yeni Musteri" icon="pi pi-plus" size="small" onClick={openCreate} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <DataTable value={filteredRows} size="small" loading={loading} emptyMessage="Musteri yok." dataKey="id" paginator rows={12}>
          <Column field="name" header="Isim" sortable />
          <Column
            field="active"
            header="Aktif"
            sortable
            style={{ width: '7rem' }}
            body={(row: CustomerRow) => <span>{row.active ? 'Evet' : 'Hayir'}</span>}
          />
          <Column
            header=""
            style={{ width: '7rem' }}
            body={(row: CustomerRow) => (
              <div className="flex items-center justify-end gap-1">
                <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} />
                <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} />
              </div>
            )}
          />
        </DataTable>
      </div>

      <Dialog
        header={mode === 'edit' ? 'Musteri Duzenle' : 'Yeni Musteri'}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
      >
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Isim</span>
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
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
