import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import { api } from '../../services/api';
import type { RootState } from '../../store';

type LocationRow = {
  id: number;
  organization_id: number;
  parent_id: number | null;
  name: string;
};

type WarehouseTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  description: string | null;
  system: boolean;
};

type WarehouseRow = {
  id: number;
  organization_id: number;
  location_id: number;
  name: string;
  warehouse_type_id: number;
  warehouse_type_code?: string;
  warehouse_type_name?: string;
};

type LocationOption = { label: string; value: number };

function buildLocationOptions(locations: LocationRow[]): LocationOption[] {
  const byId = new Map<number, LocationRow>();
  const children = new Map<number | null, LocationRow[]>();

  for (const loc of locations) {
    byId.set(loc.id, loc);
    const key = loc.parent_id ?? null;
    const arr = children.get(key) ?? [];
    arr.push(loc);
    children.set(key, arr);
  }

  const sortByName = (a: LocationRow, b: LocationRow) => a.name.localeCompare(b.name);
  for (const arr of children.values()) arr.sort(sortByName);

  const options: LocationOption[] = [];

  const walk = (parentId: number | null, prefix: string) => {
    const arr = children.get(parentId) ?? [];
    for (const loc of arr) {
      const label = prefix ? `${prefix} / ${loc.name}` : loc.name;
      options.push({ label, value: loc.id });
      walk(loc.id, label);
    }
  };

  walk(null, '');
  return options;
}

export default function WarehousesPage() {
  const organizationId = useSelector((s: RootState) => s.user.organizationId);

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseTypeRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [warehouseTypeId, setWarehouseTypeId] = useState<number | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError('');

    Promise.all([
      api.get(`/api/organizations/${organizationId}/locations`),
      api.get(`/api/organizations/${organizationId}/warehouses`),
      api.get(`/api/organizations/${organizationId}/warehouse-types`)
    ])
      .then(([locRes, whRes, wtRes]) => {
        setLocations(locRes.data.locations ?? []);
        setWarehouses(whRes.data.warehouses ?? []);
        setWarehouseTypes(wtRes.data.warehouse_types ?? []);
      })
      .catch(() => setError('Depolar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [organizationId]);

  const locationOptions = useMemo(() => buildLocationOptions(locations), [locations]);

  const locationNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const opt of locationOptions) map.set(opt.value, opt.label);
    return map;
  }, [locationOptions]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setLocationId(locationOptions[0]?.value ?? null);
    setWarehouseTypeId(warehouseTypes[0]?.id ?? null);
    setDialogOpen(true);
  };

  const openEdit = (row: WarehouseRow) => {
    setEditing(row);
    setName(row.name);
    setLocationId(row.location_id);
    setWarehouseTypeId(row.warehouse_type_id);
    setDialogOpen(true);
  };

  const onDelete = (row: WarehouseRow) => {
    confirmDialog({
      header: 'Depo Sil',
      message: 'Bu depoyu silmek istiyor musun?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sil',
      rejectLabel: 'Vazgec',
      acceptClassName: 'p-button-danger p-button-sm',
      rejectClassName: 'p-button-text p-button-sm',
      accept: async () => {
        setError('');
        try {
          await api.delete(`/api/warehouses/${row.id}`);
          setWarehouses((prev) => prev.filter((w) => w.id !== row.id));
        } catch {
          setError('Depo silinemedi.');
        }
      }
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    const trimmed = name.trim();
    if (!trimmed || !locationId || !warehouseTypeId) return;

    setLoading(true);
    setError('');

    try {
      if (!editing) {
        const res = await api.post(`/api/organizations/${organizationId}/warehouses`, {
          name: trimmed,
          location_id: locationId,
          warehouse_type_id: warehouseTypeId
        });
        const created: WarehouseRow = res.data.warehouse;
        // Enrich for UI without a refetch.
        const wt = warehouseTypes.find((t) => t.id === created.warehouse_type_id);
        setWarehouses((prev) => [
          ...prev,
          { ...created, warehouse_type_code: wt?.code, warehouse_type_name: wt?.name }
        ]);
      } else {
        const res = await api.patch(`/api/warehouses/${editing.id}`, {
          name: trimmed,
          location_id: locationId,
          warehouse_type_id: warehouseTypeId
        });
        const updated: WarehouseRow = res.data.warehouse;
        const wt = warehouseTypes.find((t) => t.id === updated.warehouse_type_id);
        setWarehouses((prev) =>
          prev.map((w) =>
            w.id === updated.id ? { ...updated, warehouse_type_code: wt?.code, warehouse_type_name: wt?.name } : w
          )
        );
      }
      setDialogOpen(false);
    } catch {
      setError('Kaydetme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const actionsBody = (row: WarehouseRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label="Edit" />
        <Button
          icon="pi pi-trash"
          size="small"
          text
          rounded
          severity="danger"
          onClick={() => onDelete(row)}
          aria-label="Delete"
        />
      </div>
    );
  };

  const locationBody = (row: WarehouseRow) => {
    return <span className="text-sm text-slate-700">{locationNameById.get(row.location_id) ?? '-'}</span>;
  };

  const typeBody = (row: WarehouseRow) => {
    const name = row.warehouse_type_name ?? warehouseTypes.find((t) => t.id === row.warehouse_type_id)?.name ?? '-';
    return <span className="text-sm text-slate-700">{name}</span>;
  };

  const typeOptions = useMemo(
    () => warehouseTypes.map((t) => ({ label: t.name, value: t.id })),
    [warehouseTypes]
  );

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadı. Lütfen tekrar giriş yap." className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-600">Depoları lokasyonlara bağla.</div>
        <Button label="Yeni Depo" icon="pi pi-plus" size="small" onClick={openCreate} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <DataTable value={warehouses} loading={loading} size="small" emptyMessage="Depo yok.">
          <Column field="name" header="Depo" />
          <Column header="Tür" body={typeBody} style={{ width: '10rem' }} />
          <Column header="Lokasyon" body={locationBody} />
          <Column header="" body={actionsBody} style={{ width: '8rem' }} />
        </DataTable>
      </div>

      <Dialog
        header={editing ? 'Depo Düzenle' : 'Yeni Depo'}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
      >
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Depo adı</span>
            <InputText value={name} onChange={(ev) => setName(ev.target.value)} className="w-full" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Depo türü</span>
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
            <span className="text-sm font-medium text-slate-700">Lokasyon</span>
            <Dropdown
              value={locationId}
              onChange={(ev) => setLocationId(ev.value ?? null)}
              options={locationOptions}
              optionLabel="label"
              optionValue="value"
              className="w-full"
              placeholder="Lokasyon sec"
              filter
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Vazgec" size="small" text type="button" onClick={() => setDialogOpen(false)} />
            <Button
              label="Kaydet"
              size="small"
              type="submit"
              loading={loading}
              disabled={!name.trim() || !locationId || !warehouseTypeId}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
