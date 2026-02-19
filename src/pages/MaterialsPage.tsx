import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import type { MenuItem } from 'primereact/menuitem';
import { TabMenu } from 'primereact/tabmenu';
import { FilterMatchMode } from 'primereact/api';

import ItemFormDialog, { type ItemFormDraft } from '../components/items/ItemFormDialog';
import ItemsTable, { type ItemTableRow } from '../components/items/ItemsTable';
import { formatUnitLabelWithName } from '../components/items/itemUtils';
import type { AppDispatch, RootState } from '../store';
import { useI18n } from '../hooks/useI18n';
import {
  createMaterialItem,
  deleteMaterialItem,
  fetchMaterialsData,
  updateMaterialItem
} from '../store/materialsSlice';

function normalizeWarehouseLabel(name: string) {
  if (name === 'Urun') return 'Ürün';
  if (name === 'Yedek Parca') return 'Yedek Parça';
  return name;
}

function warehouseIconByType(name: string, code: string) {
  const key = `${code} ${name}`.toLowerCase();
  if (key.includes('hammadde') || key.includes('raw')) return 'pi pi-circle-fill';
  if (key.includes('yedek') || key.includes('spare')) return 'pi pi-cog';
  if (key.includes('ürün') || key.includes('urun') || key.includes('product') || key.includes('finished')) {
    return 'pi pi-box';
  }
  return 'pi pi-tag';
}

const emptyDraft: ItemFormDraft = {
  warehouseTypeId: null,
  code: '',
  name: '',
  brand: '',
  model: '',
  sizeSpec: '',
  sizeUnitId: null,
  unitId: null,
  active: true
};

function MaterialsPageImpl() {
  const { t, tWarehouseType, tUnit, tUnitSymbol } = useI18n();
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
    brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
    model: { value: null, matchMode: FilterMatchMode.CONTAINS },
    size_spec: { value: null, matchMode: FilterMatchMode.CONTAINS },
    active: { value: null, matchMode: FilterMatchMode.EQUALS }
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ItemFormDraft>(emptyDraft);
  const loading = fetchLoading || mutating;

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
        label: tWarehouseType(wt.code, normalizeWarehouseLabel(wt.name)),
        command: () => setActiveWarehouseTypeId(wt.id),
        template: (item, options) => {
          const iconClass = warehouseIconByType(wt.name, wt.code);
          return (
            <a className={options.className} onClick={options.onClick}>
              <div className="flex items-center gap-2">
                <i className={`${iconClass} text-sm text-slate-600`} aria-hidden />
                <span>{item.label}</span>
              </div>
            </a>
          );
        }
      })),
    [warehouseTypes, tWarehouseType]
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
        .map((u) => ({
          label: formatUnitLabelWithName(u, tUnit(u.code, u.name), tUnitSymbol(u.symbol ?? undefined, u.symbol ?? undefined)),
          value: u.id
        })),
    [units, tUnit, tUnitSymbol]
  );

  const warehouseTypeOptions = useMemo(
    () => warehouseTypes.map((wt) => ({ label: tWarehouseType(wt.code, wt.name), value: wt.id })),
    [warehouseTypes, tWarehouseType]
  );

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setDraft({
      ...emptyDraft,
      warehouseTypeId: activeWarehouseTypeId,
      unitId: unitOptions[0]?.value ?? null
    });
    setDialogOpen(true);
  };

  const openEdit = (row: ItemTableRow) => {
    setMode('edit');
    setEditingId(row.id);
    setDraft({
      warehouseTypeId: row.warehouse_type_id ?? activeWarehouseTypeId,
      code: row.code,
      name: row.name,
      brand: row.brand ?? '',
      model: row.model ?? '',
      sizeSpec: row.size_spec ?? '',
      sizeUnitId: row.size_unit_id ?? null,
      unitId: row.unit_id ?? null,
      active: row.active
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!organizationId || !draft.warehouseTypeId || !draft.unitId) return;

    const code = draft.code.trim();
    const name = draft.name.trim();
    if (!code || !name) return;

    try {
      if (mode === 'edit' && editingId) {
        await dispatch(
          updateMaterialItem({
            organizationId,
            itemId: editingId,
            code,
            name,
            brand: draft.brand.trim() || null,
            model: draft.model.trim() || null,
            sizeSpec: draft.sizeSpec.trim() || null,
            sizeUnitId: draft.sizeUnitId ?? null,
            unitId: draft.unitId,
            active: draft.active
          })
        ).unwrap();
      } else {
        await dispatch(
          createMaterialItem({
            organizationId,
            warehouseTypeId: draft.warehouseTypeId,
            code,
            name,
            brand: draft.brand.trim() || null,
            model: draft.model.trim() || null,
            sizeSpec: draft.sizeSpec.trim() || null,
            sizeUnitId: draft.sizeUnitId ?? null,
            unitId: draft.unitId,
            active: draft.active
          })
        ).unwrap();
      }
      setDialogOpen(false);
    } catch {
    }
  };

  const remove = (row: ItemTableRow) => {
    if (!organizationId) return;
    confirmDialog({
      message: t('materials.confirm.deactivate', 'Kaydi pasif etmek istiyor musun?'),
      header: t('inventory.confirm.title', 'Silme Onayi'),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger p-button-sm',
      acceptLabel: t('materials.deactivate', 'Pasif Et'),
      rejectLabel: t('common.cancel', 'Vazgec'),
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

  const globalFilterFields = useMemo(() => ['code', 'name', 'brand', 'model', 'size_spec'], []);

  if (!organizationId) {
    return <Message severity="warn" text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')} className="w-full" />;
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-slate-200 bg-white pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="max-w-full overflow-x-auto">
            {tabItems.length > 0 ? (
              <TabMenu model={tabItems} activeIndex={activeTabIndex} />
            ) : (
              <span className="text-sm text-slate-500">{t('materials.type_not_found', 'Depo tipi bulunamadi.')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <Button label={t('materials.new', 'Yeni Malzeme')} icon="pi pi-plus" size="small" onClick={openCreate} disabled={!activeWarehouseTypeId} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
        <ItemsTable
          items={rows}
          units={units}
          loading={loading}
          emptyMessage={t('materials.empty', 'Malzeme yok.')}
          showFilters
          filters={filters}
          onFilter={(e) => setFilters(e.filters)}
          globalFilterFields={globalFilterFields}
          paginator
          rows={12}
          tableStyle={{ minWidth: '58rem' }}
          actionBody={(row) => (
            <div className="flex items-center justify-end gap-1">
              <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} />
              <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} />
            </div>
          )}
        />
      </div>

      <ItemFormDialog
        visible={dialogOpen}
        mode={mode}
        draft={draft}
        onDraftChange={setDraft}
        warehouseTypeOptions={warehouseTypeOptions}
        unitOptions={unitOptions}
        loading={mutating}
        warehouseTypeDisabled={mode === 'edit'}
        onHide={() => setDialogOpen(false)}
        onSubmit={submit}
      />
    </div>
  );
}

export default function MaterialsPage() {
  return <MaterialsPageImpl />;
}
