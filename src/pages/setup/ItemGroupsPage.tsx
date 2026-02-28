import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';

import SearchField from '../../components/common/SearchField';
import { formatUnitLabelWithName } from '../../components/items/itemUtils';
import { useGlobalTableFilter } from '../../hooks/useGlobalTableFilter';
import { useI18n } from '../../hooks/useI18n';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../store';
import { enqueueToast } from '../../store/uiSlice';
import ItemGroupAddEditDialog from './ItemGroupAddEditDialog';

type WarehouseTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
};

type UnitRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  symbol: string | null;
  active: boolean;
};

type ItemGroupRow = {
  id: number;
  organization_id: number;
  warehouse_type_id: number;
  amount_unit_id: number;
  code: string;
  name: string;
  type_spec: string | null;
  size_spec: string | null;
  size_unit_id: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ItemGroupViewRow = ItemGroupRow & {
  warehouse_type_label: string;
};

const ALLOWED_WAREHOUSE_TYPE_CODES = new Set(['SPARE_PART', 'RAW_MATERIAL']);

const initialFilters: DataTableFilterMeta = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  code: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  type_spec: { value: null, matchMode: FilterMatchMode.CONTAINS },
  size_spec: { value: null, matchMode: FilterMatchMode.CONTAINS }
};

export default function ItemGroupsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { t, tWarehouseType, tUnit, tUnitSymbol } = useI18n();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);

  const [rows, setRows] = useState<ItemGroupRow[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseTypeRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const { search, filters, updateGlobalSearch, applyTableFilters } = useGlobalTableFilter(initialFilters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemGroupRow | null>(null);
  const [warehouseTypeId, setWarehouseTypeId] = useState<number | null>(null);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [typeSpec, setTypeSpec] = useState('');
  const [sizeSpec, setSizeSpec] = useState('');
  const [sizeUnitId, setSizeUnitId] = useState<number | null>(null);
  const [warehouseTypeFilterIds, setWarehouseTypeFilterIds] = useState<number[] | null>(null);

  const unitsById = useMemo(() => {
    const map = new Map<number, UnitRow>();
    for (const u of units) map.set(u.id, u);
    return map;
  }, [units]);

  const warehouseTypeById = useMemo(() => {
    const map = new Map<number, WarehouseTypeRow>();
    for (const wt of warehouseTypes) map.set(wt.id, wt);
    return map;
  }, [warehouseTypes]);

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

  const rowsView = useMemo<ItemGroupViewRow[]>(
    () =>
      rows.map((row) => {
        const wt = warehouseTypeById.get(row.warehouse_type_id);
        return { ...row, warehouse_type_label: tWarehouseType(wt?.code, wt?.name ?? '') };
      }),
    [rows, tWarehouseType, warehouseTypeById]
  );

  const rowsFiltered = useMemo(() => {
    const selected = warehouseTypeFilterIds ?? [];
    if (selected.length === 0) return rowsView;
    const allowed = new Set(selected);
    return rowsView.filter((row) => allowed.has(row.warehouse_type_id));
  }, [rowsView, warehouseTypeFilterIds]);

  const fetchAll = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [groupsRes, unitsRes, wtsRes] = await Promise.all([
        // Hide legacy inactive rows (we treat deletion as hard delete from now on).
        api.get(`/api/organizations/${organizationId}/inventory-item-cards`, { params: { active: true } }),
        api.get(`/api/organizations/${organizationId}/units`),
        api.get(`/api/organizations/${organizationId}/warehouse-types`)
      ]);
      setUnits(unitsRes.data.units ?? []);
      const allWarehouseTypes = (wtsRes.data.warehouse_types ?? []) as WarehouseTypeRow[];
      const allowedWarehouseTypes = allWarehouseTypes.filter((wt) =>
        ALLOWED_WAREHOUSE_TYPE_CODES.has(String(wt.code ?? '').toUpperCase())
      );
      const allowedWarehouseTypeIds = new Set(allowedWarehouseTypes.map((wt) => wt.id));

      const allGroups = (groupsRes.data.inventory_item_cards ?? []) as ItemGroupRow[];
      setRows(allGroups.filter((g) => allowedWarehouseTypeIds.has(g.warehouse_type_id)));
      setWarehouseTypes(allowedWarehouseTypes);
    } catch {
      dispatch(enqueueToast({ severity: 'error', summary: 'Hata', detail: 'Malzeme kartları yüklenemedi.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [organizationId]);

  const resetForm = () => {
    setEditing(null);
    setWarehouseTypeId(warehouseTypeOptions[0]?.value ?? null);
    setUnitId(unitOptions[0]?.value ?? null);
    setCode('');
    setName('');
    setTypeSpec('');
    setSizeSpec('');
    setSizeUnitId(null);
  };

  const openCreate = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [warehouseTypeOptions, unitOptions]);

  const openEdit = useCallback((row: ItemGroupRow) => {
    setEditing(row);
    setWarehouseTypeId(row.warehouse_type_id ?? null);
    setUnitId(row.amount_unit_id ?? null);
    setCode(row.code ?? '');
    setName(row.name ?? '');
    setTypeSpec(row.type_spec ?? '');
    setSizeSpec(row.size_spec ?? '');
    setSizeUnitId(row.size_unit_id ?? null);
    setDialogOpen(true);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId || !warehouseTypeId || !unitId) return;

    const payload = {
      warehouse_type_id: warehouseTypeId,
      amount_unit_id: unitId,
      code: code.trim(),
      name: name.trim(),
      type_spec: typeSpec.trim() || null,
      size_spec: sizeSpec.trim() || null,
      size_unit_id: sizeUnitId ?? null
    };

    if (!payload.code || !payload.name) return;

    setMutating(true);
    try {
      const isEdit = Boolean(editing);
      if (editing) {
        await api.put(`/api/organizations/${organizationId}/inventory-item-cards/${editing.id}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/inventory-item-cards`, payload);
      }

      setDialogOpen(false);
      resetForm();
      dispatch(
        enqueueToast({
          severity: 'success',
          summary: 'Basarili',
          detail: isEdit ? 'Malzeme kartı güncellendi.' : 'Malzeme kartı oluşturuldu.'
        })
      );
      await fetchAll();
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: 'Hata',
          detail: 'Kaydetme basarisiz. Kod benzersiz olmali.'
        })
      );
    } finally {
      setMutating(false);
    }
  };

  const onDelete = useCallback(
    (row: ItemGroupRow) => {
      if (!organizationId) return;

      confirmDialog({
        header: t('setup.item_groups.confirm.delete_title', 'Malzeme Kartını Sil'),
        message: t('setup.item_groups.confirm.delete_message', 'Bu malzeme kartını silmek istiyor musun?'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('common.delete', 'Sil'),
        rejectLabel: t('common.cancel', 'Vazgec'),
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-text p-button-sm',
        accept: async () => {
          setMutating(true);
          try {
            await api.delete(`/api/organizations/${organizationId}/inventory-item-cards/${row.id}`);
            dispatch(enqueueToast({ severity: 'success', summary: 'Basarili', detail: 'Malzeme kartı silindi.' }));
            await fetchAll();
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
              dispatch(enqueueToast({ severity: 'warn', summary: 'Uyari', detail: 'Malzeme kartı kullanımda, silinemez.' }));
            } else {
              dispatch(enqueueToast({ severity: 'error', summary: 'Hata', detail: 'Malzeme kartı silinemedi.' }));
            }
          } finally {
            setMutating(false);
          }
        }
      });
    },
    [dispatch, organizationId, t]
  );

  const amountUnitBody = (row: ItemGroupRow) => {
    const unit = unitsById.get(row.amount_unit_id);
    const label = unit
      ? formatUnitLabelWithName(unit, tUnit(unit.code, unit.name), tUnitSymbol(unit.symbol ?? undefined, unit.symbol ?? undefined))
      : '-';
    return <span className="text-sm text-slate-700">{label}</span>;
  };

  const sizeBody = (row: ItemGroupRow) => {
    const spec = (row.size_spec ?? '').trim();
    if (!spec) return <span className="text-sm text-slate-500">-</span>;
    return <span className="text-sm text-slate-700">{spec}</span>;
  };

  const sizeUnitBody = (row: ItemGroupRow) => {
    const unit = row.size_unit_id ? unitsById.get(row.size_unit_id) : null;
    const label = unit
      ? formatUnitLabelWithName(unit, tUnit(unit.code, unit.name), tUnitSymbol(unit.symbol ?? undefined, unit.symbol ?? undefined))
      : '-';
    return <span className="text-sm text-slate-700">{label}</span>;
  };

  const actionsBody = (row: ItemGroupRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          icon="pi pi-pencil"
          size="small"
          text
          rounded
          onClick={() => openEdit(row)}
          aria-label={t('inventory.action.edit', 'Duzenle')}
        />
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

  if (!organizationId) {
    return (
      <Message
        severity="warn"
        text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')}
        className="w-full"
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <SearchField
            value={search}
            onChange={updateGlobalSearch}
            placeholder={t('common.search', 'Ara')}
            ariaLabel={t('setup.item_groups.search', 'Malzeme kartlarında ara')}
            className="w-full sm:w-auto"
            inputClassName="w-full sm:w-72"
          />
          <MultiSelect
            value={warehouseTypeFilterIds}
            options={warehouseTypeOptions}
            onChange={(e) => {
              const next = Array.isArray(e.value) ? (e.value as number[]) : [];
              setWarehouseTypeFilterIds(next.length > 0 ? next : null);
            }}
            placeholder={t('setup.item_groups.filter.type', 'Tür')}
            className="w-full sm:w-56"
            display="chip"
            showSelectAll
            selectAllLabel={t('common.all', 'Hepsi')}
            showClear
          />
          <div className="sm:ml-auto">
            <Button
              label={t('setup.item_groups.new', 'Yeni Malzeme Kartı')}
              icon="pi pi-plus"
              size="small"
              onClick={openCreate}
              aria-label={t('setup.item_groups.new', 'Yeni Malzeme Kartı')}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <DataTable
            value={rowsFiltered}
            loading={loading || mutating}
            size="small"
            emptyMessage={t('setup.item_groups.empty', 'Malzeme kartı yok.')}
            removableSort
            sortMode="multiple"
            filters={filters}
            onFilter={applyTableFilters}
            globalFilterFields={['code', 'name', 'type_spec', 'size_spec', 'warehouse_type_label']}
            tableStyle={{ minWidth: '60rem' }}
          >
            <Column
              field="warehouse_type_label"
              header={t('setup.item_groups.col.type', 'Tür')}
              body={(row: ItemGroupViewRow) => <span className="text-sm text-slate-700">{row.warehouse_type_label}</span>}
              sortable
              style={{ width: '14rem' }}
            />
            <Column field="name" header={t('setup.item_groups.col.name', 'Ad')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
            <Column field="code" header={t('setup.item_groups.col.code', 'Kod')} sortable filter filterPlaceholder={t('common.search', 'Ara')} style={{ width: '12rem' }} />
            <Column field="type_spec" header={t('setup.item_groups.col.type_spec', 'Tip')} sortable filter filterPlaceholder={t('common.search', 'Ara')} style={{ width: '14rem' }} />
            <Column header={t('setup.item_groups.col.unit', 'Stok Birimi')} body={amountUnitBody} sortable sortField="amount_unit_id" style={{ width: '14rem' }} />
            <Column field="size_spec" header={t('setup.item_groups.col.spec', 'Ölçü')} body={sizeBody} sortable style={{ width: '14rem' }} />
            <Column header={t('setup.item_groups.col.spec_unit', 'Ölçü Birimi')} body={sizeUnitBody} sortable sortField="size_unit_id" style={{ width: '14rem' }} />
            <Column header="" body={actionsBody} style={{ width: '8rem' }} />
          </DataTable>
        </div>
      </div>

      <ItemGroupAddEditDialog
        t={t}
        visible={dialogOpen}
        editing={Boolean(editing)}
        mutating={mutating}
        warehouseTypeOptions={warehouseTypeOptions}
        unitOptions={unitOptions}
        warehouseTypeId={warehouseTypeId}
        setWarehouseTypeId={setWarehouseTypeId}
        unitId={unitId}
        setUnitId={setUnitId}
        code={code}
        setCode={setCode}
        name={name}
        setName={setName}
        typeSpec={typeSpec}
        setTypeSpec={setTypeSpec}
        sizeSpec={sizeSpec}
        setSizeSpec={setSizeSpec}
        sizeUnitId={sizeUnitId}
        setSizeUnitId={setSizeUnitId}
        onHide={() => {
          setDialogOpen(false);
          resetForm();
        }}
        onSubmit={submit}
      />
    </div>
  );
}
