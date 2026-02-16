import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import type { MenuItem } from 'primereact/menuitem';
import { TabMenu } from 'primereact/tabmenu';
import { FilterMatchMode } from 'primereact/api';

import type { AppDispatch, RootState } from '../store';
import {
  createMaterialItem,
  deleteMaterialItem,
  fetchMaterialsData,
  type ItemRow,
  type UnitRow,
  type WarehouseTypeRow,
  updateMaterialItem
} from '../store/materialsSlice';

function MaterialsPageImpl() {
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { warehouseTypes, units, items, loading: fetchLoading, mutating, error } = useSelector(
    (s: RootState) => s.materials
  );

  const [activeWarehouseTypeId, setActiveWarehouseTypeId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    code: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    active: { value: null, matchMode: FilterMatchMode.EQUALS }
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unitId, setUnitId] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const loading = fetchLoading || mutating;

  const unitById = useMemo(() => {
    const map = new Map<number, UnitRow>();
    for (const u of units) map.set(u.id, u);
    return map;
  }, [units]);

  const warehouseTypeById = useMemo(() => {
    const map = new Map<number, WarehouseTypeRow>();
    for (const wt of warehouseTypes) map.set(wt.id, wt);
    return map;
  }, [warehouseTypes]);

  useEffect(() => {
    if (!organizationId) return;
    dispatch(fetchMaterialsData(organizationId));
  }, [dispatch, organizationId]);

  useEffect(() => {
    setActiveWarehouseTypeId((prev) => {
      if (prev && warehouseTypes.some((x) => x.id === prev)) return prev;
      return warehouseTypes[0]?.id ?? null;
    });
  }, [warehouseTypes]);

  const tabItems = useMemo<MenuItem[]>(
    () =>
      warehouseTypes.map((wt) => ({
        label: wt.name,
        command: () => setActiveWarehouseTypeId(wt.id)
      })),
    [warehouseTypes]
  );

  const activeTabIndex = useMemo(() => {
    if (!activeWarehouseTypeId) return 0;
    const idx = warehouseTypes.findIndex((w) => w.id === activeWarehouseTypeId);
    return idx >= 0 ? idx : 0;
  }, [warehouseTypes, activeWarehouseTypeId]);

  const rows = useMemo(() => {
    if (!activeWarehouseTypeId) return [];
    return items.filter((i) => i.warehouse_type_id === activeWarehouseTypeId);
  }, [items, activeWarehouseTypeId]);

  const unitOptions = useMemo(
    () =>
      units
        .filter((u) => u.active)
        .map((u) => ({ label: `${u.code} - ${u.name}`, value: u.id })),
    [units]
  );

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setCode('');
    setName('');
    setUnitId(unitOptions[0]?.value ?? null);
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (row: ItemRow) => {
    setMode('edit');
    setEditingId(row.id);
    setCode(row.code);
    setName(row.name);
    setUnitId(row.unit_id);
    setActive(row.active);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!organizationId) return;
    if (!activeWarehouseTypeId) return;
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName || !unitId) return;

    try {
      if (mode === 'edit' && editingId) {
        await dispatch(
          updateMaterialItem({
            organizationId,
            itemId: editingId,
            code: trimmedCode,
            name: trimmedName,
            unitId,
            active
          })
        ).unwrap();
      } else {
        await dispatch(
          createMaterialItem({
            organizationId,
            warehouseTypeId: activeWarehouseTypeId,
            code: trimmedCode,
            name: trimmedName,
            unitId,
            active
          })
        ).unwrap();
      }
      setDialogOpen(false);
    } catch {
    }
  };

  const remove = (row: ItemRow) => {
    if (!organizationId) return;
    confirmDialog({
      message: `${row.code} - ${row.name} kaydini pasif etmek istiyor musun?`,
      header: 'Silme Onayi',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger p-button-sm',
      acceptLabel: 'Pasif Et',
      rejectLabel: 'Vazgec',
      accept: async () => {
        try {
          await dispatch(
            deleteMaterialItem({
              organizationId,
              itemId: row.id
            })
          ).unwrap();
        } catch {
        }
      }
    });
  };

  const activeWarehouseTypeName = activeWarehouseTypeId ? warehouseTypeById.get(activeWarehouseTypeId)?.name : '';

  const globalFilterFields = useMemo(() => ['code', 'name'], []);

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadi. Lutfen tekrar giris yap." className="w-full" />;
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {tabItems.length > 0 ? (
              <TabMenu model={tabItems} activeIndex={activeTabIndex} />
            ) : (
              <span className="text-sm text-slate-500">Depo tipi bulunamadi.</span>
            )}
          </div>
          <Button label="Yeni Malzeme" icon="pi pi-plus" size="small" onClick={openCreate} disabled={!activeWarehouseTypeId} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <InputText
          value={search}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            setFilters((prev) => ({ ...prev, global: { ...prev.global, value: v } }));
          }}
          placeholder="Ara: kod veya isim"
          className="w-72"
        />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <DataTable
          value={rows}
          size="small"
          loading={loading}
          emptyMessage="Malzeme yok."
          dataKey="id"
          paginator
          rows={12}
          filters={filters}
          onFilter={(e) => setFilters(e.filters)}
          globalFilterFields={globalFilterFields}
        >
          <Column field="code" header="Kod" sortable filter style={{ width: '12rem' }} />
          <Column field="name" header="Urun" sortable filter />
          <Column
            field="unit_id"
            header="Birim"
            sortable
            style={{ width: '10rem' }}
            body={(row: ItemRow) => <span>{unitById.get(row.unit_id)?.code ?? '-'}</span>}
          />
          <Column
            field="active"
            header="Aktif"
            sortable
            style={{ width: '7rem' }}
            body={(row: ItemRow) => <span>{row.active ? 'Evet' : 'Hayir'}</span>}
          />
          <Column
            header=""
            style={{ width: '7rem' }}
            body={(row: ItemRow) => (
              <div className="flex items-center justify-end gap-1">
                <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} />
                <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} />
              </div>
            )}
          />
        </DataTable>
      </div>

      <Dialog
        header={mode === 'edit' ? 'Malzeme Duzenle' : 'Yeni Malzeme'}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
      >
        <div className="grid gap-3">
          <div className="text-sm text-slate-600">{activeWarehouseTypeName ? `Depo tipi: ${activeWarehouseTypeName}` : ''}</div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Kod</span>
              <InputText value={code} onChange={(e) => setCode(e.target.value)} className="w-full" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Birim</span>
              <Dropdown value={unitId} onChange={(e) => setUnitId(e.value)} options={unitOptions} className="w-full" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Isim</span>
            <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
          </label>

          <label className="flex items-center gap-2">
            <Checkbox checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
            <span className="text-sm font-medium text-slate-700">Aktif</span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <Button label="Vazgec" text onClick={() => setDialogOpen(false)} />
            <Button label="Kaydet" onClick={submit} loading={mutating} disabled={!code.trim() || !name.trim() || !unitId} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function MaterialsPage() {
  return <MaterialsPageImpl />;
}
