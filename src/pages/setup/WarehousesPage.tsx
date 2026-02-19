import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

import type { AppDispatch, RootState } from '../../store';
import { useI18n } from '../../hooks/useI18n';
import {
  createWarehouse,
  deleteWarehouse,
  fetchWarehousesSetup,
  type LocationRow,
  type WarehouseRow,
  updateWarehouse
} from '../../store/setupSlice';

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
  const { t, tWarehouseType } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { locations, warehouseTypes, warehouses, loading: fetchLoading, mutating, error } = useSelector(
    (s: RootState) => s.setup
  );
  const loading = fetchLoading || mutating;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [warehouseTypeId, setWarehouseTypeId] = useState<number | null>(null);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    warehouse_type_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
    location_label: { value: null, matchMode: FilterMatchMode.CONTAINS }
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!organizationId) return;
    dispatch(fetchWarehousesSetup(organizationId));
  }, [dispatch, organizationId]);

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
      header: t('warehouse.confirm.delete_title', 'Depo Sil'),
      message: t('warehouse.confirm.delete_message', 'Bu depoyu silmek istiyor musun?'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: t('common.delete', 'Sil'),
      rejectLabel: t('common.cancel', 'Vazgec'),
      acceptClassName: 'p-button-danger p-button-sm',
      rejectClassName: 'p-button-text p-button-sm',
      accept: async () => {
        try {
          await dispatch(deleteWarehouse({ id: row.id })).unwrap();
        } catch {
        }
      }
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    const trimmed = name.trim();
    if (!trimmed || !locationId || !warehouseTypeId) return;

    try {
      if (!editing) {
        await dispatch(
          createWarehouse({
            organizationId,
            name: trimmed,
            locationId,
            warehouseTypeId
          })
        ).unwrap();
      } else {
        await dispatch(
          updateWarehouse({
            id: editing.id,
            name: trimmed,
            locationId,
            warehouseTypeId
          })
        ).unwrap();
      }
      setDialogOpen(false);
    } catch {
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
          aria-label={t('common.delete', 'Sil')}
        />
      </div>
    );
  };

  const locationBody = (row: WarehouseRow) => {
    return <span className="text-sm text-slate-700">{locationNameById.get(row.location_id) ?? '-'}</span>;
  };

  const typeBody = (row: WarehouseRow) => {
    const matched = warehouseTypes.find((t) => t.id === row.warehouse_type_id);
    const name = tWarehouseType(matched?.code, row.warehouse_type_name ?? matched?.name ?? '-');
    return <span className="text-sm text-slate-700">{name}</span>;
  };

  const warehousesView = useMemo(() => {
    return warehouses.map((w) => ({
      ...w,
      warehouse_type_label: (() => {
        const matched = warehouseTypes.find((t) => t.id === w.warehouse_type_id);
        return tWarehouseType(matched?.code, w.warehouse_type_name ?? matched?.name ?? '');
      })(),
      location_label: locationNameById.get(w.location_id) ?? ''
    }));
  }, [warehouses, warehouseTypes, locationNameById, tWarehouseType]);

  const typeOptions = useMemo(
    () => warehouseTypes.map((item) => ({ label: tWarehouseType(item.code, item.name), value: item.id })),
    [warehouseTypes, tWarehouseType]
  );

  if (!organizationId) {
    return <Message severity="warn" text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')} className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <IconField iconPosition="left" className="w-full sm:w-auto">
            <InputIcon className="pi pi-search text-slate-400" />
            <InputText
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                setSearch(v);
                setFilters((prev) => ({ ...prev, global: { ...prev.global, value: v } }));
              }}
              placeholder={t('common.search', 'Ara')}
              className="w-full sm:w-72"
            />
          </IconField>
          <Button label={t('warehouse.new', 'Yeni Depo')} icon="pi pi-plus" size="small" onClick={openCreate} />
        </div>

        <div className="overflow-x-auto">
          <DataTable
            value={warehousesView}
            loading={loading}
            size="small"
            emptyMessage={t('warehouse.empty', 'Depo yok.')}
            removableSort
            sortMode="multiple"
            filters={filters}
            onFilter={(e) => setFilters(e.filters)}
            globalFilterFields={['name', 'warehouse_type_label', 'location_label']}
            tableStyle={{ minWidth: '52rem' }}
          >
            <Column field="name" header={t('warehouse.col.name', 'Depo')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="warehouse_type_label" header={t('warehouse.col.type', 'Tur')} sortable filter filterPlaceholder={t('common.search', 'Ara')} style={{ width: '12rem' }} />
            <Column field="location_label" header={t('warehouse.col.location', 'Lokasyon')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column header="" body={actionsBody} style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <Dialog
        header={editing ? t('warehouse.edit', 'Depo Duzenle') : t('warehouse.new', 'Yeni Depo')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
      >
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
            <Button label={t('common.cancel', 'Vazgec')} size="small" text type="button" onClick={() => setDialogOpen(false)} />
            <Button
              label={t('common.save', 'Kaydet')}
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
