import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';

import SearchField from '../../components/common/SearchField';
import { useGlobalTableFilter } from '../../hooks/useGlobalTableFilter';
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
import WarehouseAddEditDialog from './WarehouseAddEditDialog';

type LocationOption = { label: string; value: number };

const initialWarehouseFilters: DataTableFilterMeta = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  warehouse_type_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
  location_label: { value: null, matchMode: FilterMatchMode.CONTAINS }
};

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
  const { locations, warehouseTypes, warehouses, loading: fetchLoading, mutating } = useSelector(
    (s: RootState) => s.setup
  );
  const loading = fetchLoading || mutating;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [warehouseTypeId, setWarehouseTypeId] = useState<number | null>(null);
  const { search, filters, updateGlobalSearch, applyTableFilters } = useGlobalTableFilter(initialWarehouseFilters);

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

  const openCreate = useCallback(() => {
    setEditing(null);
    setName('');
    setLocationId(locationOptions[0]?.value ?? null);
    setWarehouseTypeId(warehouseTypes[0]?.id ?? null);
    setDialogOpen(true);
  }, [locationOptions, warehouseTypes]);

  const openEdit = useCallback((row: WarehouseRow) => {
    setEditing(row);
    setName(row.name);
    setLocationId(row.location_id);
    setWarehouseTypeId(row.warehouse_type_id);
    setDialogOpen(true);
  }, []);

  const onDelete = useCallback((row: WarehouseRow) => {
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
  }, [dispatch, t]);

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
        <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label={t('inventory.action.edit', 'Duzenle')} />
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

  const warehouseTypeById = useMemo(() => {
    const map = new Map<number, (typeof warehouseTypes)[number]>();
    for (const warehouseType of warehouseTypes) map.set(warehouseType.id, warehouseType);
    return map;
  }, [warehouseTypes]);

  const warehousesView = useMemo(() => {
    return warehouses.map((w) => ({
      ...w,
      warehouse_type_label: (() => {
        const matched = warehouseTypeById.get(w.warehouse_type_id);
        return tWarehouseType(matched?.code, w.warehouse_type_name ?? matched?.name ?? '');
      })(),
      location_label: locationNameById.get(w.location_id) ?? ''
    }));
  }, [warehouses, warehouseTypeById, locationNameById, tWarehouseType]);

  const typeOptions = useMemo(
    () => warehouseTypes.map((item) => ({ label: tWarehouseType(item.code, item.name), value: item.id })),
    [warehouseTypes, tWarehouseType]
  );

  if (!organizationId) {
    return <Message severity="warn" text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')} className="w-full" />;
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <SearchField
            value={search}
            onChange={updateGlobalSearch}
            placeholder={t('common.search', 'Ara')}
            ariaLabel={t('warehouse.search', 'Depolarda ara')}
          />
          <Button label={t('warehouse.new', 'Yeni Depo')} icon="pi pi-plus" size="small" onClick={openCreate} aria-label={t('warehouse.new', 'Yeni Depo')} />
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
            onFilter={applyTableFilters}
            globalFilterFields={['name', 'warehouse_type_label', 'location_label']}
            tableStyle={{ minWidth: '52rem' }}
          >
            <Column field="name" header={t('warehouse.col.name', 'Depo')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="warehouse_type_label" header={t('warehouse.col.type', 'Tür')} sortable filter filterPlaceholder={t('common.search', 'Ara')} style={{ width: '12rem' }} />
            <Column field="location_label" header={t('warehouse.col.location', 'Lokasyon')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column header="" body={actionsBody} style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <WarehouseAddEditDialog
        t={t}
        visible={dialogOpen}
        editing={Boolean(editing)}
        loading={loading}
        name={name}
        setName={setName}
        warehouseTypeId={warehouseTypeId}
        setWarehouseTypeId={setWarehouseTypeId}
        locationId={locationId}
        setLocationId={setLocationId}
        typeOptions={typeOptions}
        locationOptions={locationOptions}
        onHide={() => setDialogOpen(false)}
        onSubmit={onSubmit}
      />
    </div>
  );
}
