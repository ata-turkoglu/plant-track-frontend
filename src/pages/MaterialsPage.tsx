import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { confirmDialog } from 'primereact/confirmdialog';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { Message } from 'primereact/message';
import type { MenuItem } from 'primereact/menuitem';
import { TabMenu } from 'primereact/tabmenu';
import { FilterMatchMode } from 'primereact/api';

import SearchField from '../components/common/SearchField';
import { warehouseIconByType } from '../components/inventory/warehouseTypeUi';
import ItemFormDialog, { type ItemFormDraft } from '../components/items/ItemFormDialog';
import ItemsTable, { type ItemTableRow } from '../components/items/ItemsTable';
import { formatUnitLabelWithName } from '../components/items/itemUtils';
import { useGlobalTableFilter } from '../hooks/useGlobalTableFilter';
import type { AppDispatch, RootState } from '../store';
import { useI18n } from '../hooks/useI18n';
import {
  createMaterialItem,
  deleteMaterialItem,
  fetchMaterialsData,
  updateMaterialItem
} from '../store/materialsSlice';

const emptyDraft: ItemFormDraft = {
  warehouseTypeId: null,
  itemGroupId: null,
  code: '',
  name: '',
  brand: '',
  model: '',
  sizeSpec: '',
  sizeUnitId: null,
  unitId: null,
  active: true
};

const initialMaterialFilters: DataTableFilterMeta = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  code: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  brand: { value: null, matchMode: FilterMatchMode.CONTAINS },
  model: { value: null, matchMode: FilterMatchMode.CONTAINS },
  size_spec: { value: null, matchMode: FilterMatchMode.CONTAINS },
  active: { value: null, matchMode: FilterMatchMode.EQUALS }
};

function MaterialsPageImpl() {
  const { t, tWarehouseType, tUnit, tUnitSymbol } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { warehouseTypes, units, items, itemGroups, loading: fetchLoading, mutating } = useSelector(
    (s: RootState) => s.materials
  );

  const [activeWarehouseTypeId, setActiveWarehouseTypeId] = useState<number | null>(null);

  const { search, filters, updateGlobalSearch, applyTableFilters } = useGlobalTableFilter(initialMaterialFilters);

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
        label: tWarehouseType(wt.code, wt.name),
        command: () => setActiveWarehouseTypeId(wt.id),
        template: (item, options) => {
          const iconClass = warehouseIconByType(wt.name, wt.code);
          return (
            <a
              className={options.className}
              onClick={options.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  options.onClick?.(event as any);
                }
              }}
            >
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

  const allowItemGroupEdit = useMemo(() => {
    const wtId = draft.warehouseTypeId ?? activeWarehouseTypeId;
    if (!wtId) return false;
    const wtCode = warehouseTypes.find((x) => x.id === wtId)?.code?.toUpperCase() ?? '';
    return wtCode === 'SPARE_PART' || wtCode === 'RAW_MATERIAL';
  }, [activeWarehouseTypeId, draft.warehouseTypeId, warehouseTypes]);

  const itemGroupOptions = useMemo(() => {
    const targetWarehouseTypeId = draft.warehouseTypeId ?? activeWarehouseTypeId;
    return itemGroups
      .filter((g) => g.active || g.id === draft.itemGroupId)
      .filter((g) => (targetWarehouseTypeId ? g.warehouse_type_id === targetWarehouseTypeId : true))
      .map((g) => ({
        label: `${g.code} - ${g.name}${g.size_spec?.trim() ? ` · ${g.size_spec.trim()}` : ''}`,
        value: g.id,
        amount_unit_id: g.amount_unit_id,
        size_spec: g.size_spec,
        size_unit_id: g.size_unit_id
      }));
  }, [activeWarehouseTypeId, draft.itemGroupId, draft.warehouseTypeId, itemGroups]);

  const openCreate = useCallback(() => {
    setMode('create');
    setEditingId(null);
    const nextWarehouseTypeId = activeWarehouseTypeId;
    const wtCode = warehouseTypes.find((x) => x.id === nextWarehouseTypeId)?.code?.toUpperCase() ?? '';
    const needsGroup = wtCode === 'SPARE_PART' || wtCode === 'RAW_MATERIAL';
    const firstGroup =
      needsGroup && nextWarehouseTypeId
        ? itemGroups
            .filter((g) => g.active)
            .find((g) => g.warehouse_type_id === nextWarehouseTypeId) ?? null
        : null;

    setDraft({
      ...emptyDraft,
      warehouseTypeId: nextWarehouseTypeId,
      itemGroupId: needsGroup ? firstGroup?.id ?? null : null,
      unitId: needsGroup ? firstGroup?.amount_unit_id ?? null : unitOptions[0]?.value ?? null,
      sizeSpec: needsGroup ? firstGroup?.size_spec ?? '' : '',
      sizeUnitId: needsGroup ? firstGroup?.size_unit_id ?? null : null
    });
    setDialogOpen(true);
  }, [activeWarehouseTypeId, itemGroups, unitOptions, warehouseTypes]);

  const openEdit = useCallback((row: ItemTableRow) => {
    setMode('edit');
    setEditingId(row.id);
    setDraft({
      warehouseTypeId: row.warehouse_type_id ?? activeWarehouseTypeId,
      itemGroupId: row.item_group_id ?? null,
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
  }, [activeWarehouseTypeId]);

  const submit = async () => {
    if (!organizationId || !draft.warehouseTypeId) return;
    if (allowItemGroupEdit && !draft.itemGroupId) return;
    if (!draft.unitId) return;

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
            active: draft.active,
            itemGroupId: draft.itemGroupId
          })
        ).unwrap();
      } else {
        await dispatch(
          createMaterialItem({
            organizationId,
            warehouseTypeId: draft.warehouseTypeId,
            itemGroupId: draft.itemGroupId,
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

  const remove = useCallback((row: ItemTableRow) => {
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
  }, [dispatch, organizationId, t]);

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
        <SearchField
          value={search}
          onChange={updateGlobalSearch}
          placeholder={t('common.search', 'Ara')}
          ariaLabel={t('materials.search', 'Malzemelerde ara')}
        />
        <Button
          label={t('materials.new', 'Yeni Malzeme')}
          icon="pi pi-plus"
          size="small"
          onClick={openCreate}
          disabled={!activeWarehouseTypeId}
          aria-label={t('materials.new', 'Yeni Malzeme')}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white py-2">
        <ItemsTable
          items={rows}
          units={units}
          loading={loading}
          emptyMessage={t('materials.empty', 'Malzeme yok.')}
          showFilters
          filters={filters}
          onFilter={applyTableFilters}
          globalFilterFields={globalFilterFields}
          paginator
          rows={12}
          tableStyle={{ minWidth: '58rem' }}
          actionBody={(row) => (
            <div className="flex items-center justify-end gap-1">
              <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label={t('inventory.action.edit', 'Duzenle')} />
              <Button icon="pi pi-trash" size="small" text rounded severity="danger" onClick={() => remove(row)} aria-label={t('common.delete', 'Sil')} />
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
        itemGroupOptions={allowItemGroupEdit ? itemGroupOptions : []}
        allowItemGroupEdit={allowItemGroupEdit}
        unitOptions={unitOptions}
        loading={mutating}
        warehouseTypeDisabled={mode === 'edit'}
        onHide={() => {
          setDialogOpen(false);
        }}
        onSubmit={submit}
      />
    </div>
  );
}

export default function MaterialsPage() {
  return <MaterialsPageImpl />;
}
