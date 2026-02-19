import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { TabMenu } from 'primereact/tabmenu';
import { Tooltip } from 'primereact/tooltip';
import type { MenuItem } from 'primereact/menuitem';
import { confirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';

import ItemFormDialog, { type ItemFormDraft } from '../components/items/ItemFormDialog';
import ItemsTable, { type ItemTableRow } from '../components/items/ItemsTable';
import { formatUnitLabelWithName } from '../components/items/itemUtils';
import type { AppDispatch, RootState } from '../store';
import { useI18n } from '../hooks/useI18n';
import { enqueueToast } from '../store/uiSlice';
import {
  deleteInventoryItem,
  deleteInventoryMovement,
  fetchInventoryData,
  type ItemRow,
  type MovementRow,
  type NodeRow,
  upsertInventoryItem,
  upsertInventoryMovement
} from '../store/inventorySlice';

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

type MovementDisplayRow = {
  // DataTable needs a stable key; for transfers use groupId.
  row_key: string;
  movement_group_id: string | null;
  movement_type: string;
  from_label: string;
  to_label: string;
  item_code: string;
  item_name: string;
  quantity: string | number;
  uom: string;
  occurred_at: string;
  // For actions
  _sourceMovementId?: number;
};

type EventLineDraft = {
  id: string;
  item_id: number | null;
  quantity: number | null;
  unit_id: number | null;
};

type NodeGroupKey = 'WAREHOUSE' | 'LOCATION' | 'SUPPLIER' | 'CUSTOMER';

type GroupedNodeOption = {
  label: string;
  groupKey: NodeGroupKey;
  items: { label: string; value: number }[];
};

const emptyItemDraft: ItemFormDraft = {
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

export default function InventoryMovementsPage() {
  const { t, tWarehouseType, tUnit, tUnitSymbol } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { units, items, warehouseTypes, warehouses, nodes, movements, balances, loading: fetchLoading, mutating } =
    useSelector((s: RootState) => s.inventory);
  const refTooltip = useRef<Tooltip>(null);
  const loading = fetchLoading || mutating;

  const [activeWarehouseTypeId, setActiveWarehouseTypeId] = useState<number | null>(null);
  const [selectedBalanceWarehouseId, setSelectedBalanceWarehouseId] = useState<number | null>(null);

  const [entryOpen, setEntryOpen] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<number | null>(null);

  const [fromNodeId, setFromNodeId] = useState<number | null>(null);
  const [toNodeId, setToNodeId] = useState<number | null>(null);
  const [eventLines, setEventLines] = useState<EventLineDraft[]>([]);
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [referenceType, setReferenceType] = useState('');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemFormMode, setItemFormMode] = useState<'create' | 'edit'>('create');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemFormDraft>(emptyItemDraft);

  const [itemsListOpen, setItemsListOpen] = useState(false);
  const [itemsSearch, setItemsSearch] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [contentTab, setContentTab] = useState<'movements' | 'balances'>('movements');
  const [movementFilters, setMovementFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    from_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
    to_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
    item_code: { value: null, matchMode: FilterMatchMode.CONTAINS },
    item_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    uom: { value: null, matchMode: FilterMatchMode.CONTAINS }
  });
  const formatInventoryUnitLabel = (unit?: { name?: string | null; symbol?: string | null; code?: string | null } | null) =>
    formatUnitLabelWithName(
      unit ?? null,
      unit ? tUnit(unit.code ?? undefined, unit.name ?? unit.code ?? '-') : undefined,
      unit ? tUnitSymbol(unit.symbol ?? undefined, unit.symbol ?? undefined) : undefined
    );

  useEffect(() => {
    if (!organizationId) return;
    dispatch(fetchInventoryData(organizationId));
  }, [dispatch, organizationId]);

  useEffect(() => {
    if (warehouseTypes.length === 0) return;
    if (activeWarehouseTypeId === null || !warehouseTypes.some((t) => t.id === activeWarehouseTypeId)) {
      setActiveWarehouseTypeId(warehouseTypes[0].id);
    }
  }, [warehouseTypes, activeWarehouseTypeId]);

  useEffect(() => {
    if (!entryOpen) return;
    // Dialog content is portaled; bind tooltip events after it becomes visible.
    const t = window.setTimeout(() => refTooltip.current?.updateTargetEvents(), 0);
    return () => window.clearTimeout(t);
  }, [entryOpen]);

  const warehouseTypeNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const wt of warehouseTypes) map.set(wt.id, tWarehouseType(wt.code, wt.name));
    return map;
  }, [warehouseTypes, tWarehouseType]);

  const warehousesByType = useMemo(() => {
    return activeWarehouseTypeId === null
      ? warehouses
      : warehouses.filter((w) => w.warehouse_type_id === activeWarehouseTypeId);
  }, [warehouses, activeWarehouseTypeId]);

  const balanceWarehouseOptions = useMemo(
    () => warehousesByType.map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
    [warehousesByType]
  );

  useEffect(() => {
    if (warehousesByType.length === 0) {
      setSelectedBalanceWarehouseId(null);
      return;
    }
    setSelectedBalanceWarehouseId((prev) => {
      if (prev && warehousesByType.some((warehouse) => warehouse.id === prev)) return prev;
      return warehousesByType[0].id;
    });
  }, [warehousesByType]);

  const warehouseTypeByWarehouseId = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of warehouses) map.set(w.id, w.warehouse_type_id);
    return map;
  }, [warehouses]);

  const nodeById = useMemo(() => {
    const map = new Map<number, NodeRow>();
    for (const node of nodes) map.set(node.id, node);
    return map;
  }, [nodes]);

  const nodeLabel = (node: NodeRow) => node.name;

  const groupedNodeOptions = useMemo(() => {
    const warehouseIdsForType = new Set(
      warehousesByType.map((warehouse) => warehouse.id)
    );

    const warehouseGroup = nodes
      .filter((node) => node.node_type === 'WAREHOUSE')
      .filter((node) => warehouseIdsForType.has(Number(node.ref_id)))
      .map((node) => ({ label: nodeLabel(node), value: node.id }));

    const locationGroup = nodes
      .filter((node) => node.node_type === 'LOCATION')
      .map((node) => ({ label: nodeLabel(node), value: node.id }));

    const supplierGroup = nodes
      .filter((node) => node.node_type === 'SUPPLIER')
      .map((node) => ({ label: nodeLabel(node), value: node.id }));

    const customerGroup = nodes
      .filter((node) => node.node_type === 'CUSTOMER')
      .map((node) => ({ label: nodeLabel(node), value: node.id }));

    const groups: GroupedNodeOption[] = [];
    if (warehouseGroup.length > 0) {
      groups.push({ label: t('inventory.group.warehouses', 'Warehouses'), groupKey: 'WAREHOUSE', items: warehouseGroup });
    }
    if (locationGroup.length > 0) {
      groups.push({ label: t('inventory.group.locations', 'Locations'), groupKey: 'LOCATION', items: locationGroup });
    }
    if (supplierGroup.length > 0) {
      groups.push({ label: t('inventory.group.suppliers', 'Suppliers'), groupKey: 'SUPPLIER', items: supplierGroup });
    }
    if (customerGroup.length > 0) {
      groups.push({ label: t('inventory.group.customers', 'Customers'), groupKey: 'CUSTOMER', items: customerGroup });
    }
    return groups;
  }, [nodes, warehousesByType, t]);

  const nodeGroupTemplate = (group: GroupedNodeOption) => {
    const iconByGroupKey: Record<NodeGroupKey, string> = {
      WAREHOUSE: 'pi pi-building',
      LOCATION: 'pi pi-map-marker',
      SUPPLIER: 'pi pi-truck',
      CUSTOMER: 'pi pi-users'
    };

    return (
      <div className="inventory-node-group-chip">
        <i className={`${iconByGroupKey[group.groupKey]} text-xs`} />
        <span>{group.label}</span>
        <span className="inventory-node-group-count">{group.items.length}</span>
      </div>
    );
  };

  const movementsForType = useMemo(() => {
    if (activeWarehouseTypeId === null) return movements;
    return movements.filter((m) => warehouseTypeByWarehouseId.get(m.warehouse_id) === activeWarehouseTypeId);
  }, [movements, activeWarehouseTypeId, warehouseTypeByWarehouseId]);

  const balancesForType = useMemo(() => {
    if (activeWarehouseTypeId === null) return balances;
    return balances.filter((balance) => {
      if (balance.node_type !== 'WAREHOUSE') return false;
      const node = nodeById.get(balance.node_id);
      if (!node || node.ref_table !== 'warehouses') return false;
      const warehouseIdFromNode = Number(node.ref_id);
      if (!Number.isFinite(warehouseIdFromNode)) return false;
      if (warehouseTypeByWarehouseId.get(warehouseIdFromNode) !== activeWarehouseTypeId) return false;
      if (selectedBalanceWarehouseId && warehouseIdFromNode !== selectedBalanceWarehouseId) return false;
      return true;
    });
  }, [balances, activeWarehouseTypeId, nodeById, warehouseTypeByWarehouseId, selectedBalanceWarehouseId]);

  const unitLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) map.set(u.code.toLowerCase(), formatInventoryUnitLabel(u));
    return map;
  }, [units]);

  const displayMovements = useMemo<MovementDisplayRow[]>(
    () =>
      movementsForType.map((m) => ({
        row_key: `m:${m.id}`,
        movement_group_id: m.movement_group_id ?? null,
        movement_type: m.movement_type,
        from_label: m.from_node_name ?? m.from_ref ?? '',
        to_label: m.to_node_name ?? m.to_ref ?? '',
        item_code: m.item_code ?? '',
        item_name: m.item_name ?? '',
        quantity: m.quantity,
        uom: unitLabelByCode.get(String(m.uom ?? '').toLowerCase()) ?? m.uom,
        occurred_at: m.occurred_at,
        _sourceMovementId: m.id
      })),
    [movementsForType, unitLabelByCode]
  );

  const itemOptions = useMemo(
    () =>
      items
        .filter((i) => i.active)
        .filter((i) => (activeWarehouseTypeId ? i.warehouse_type_id === activeWarehouseTypeId : true))
        .map((i) => ({ label: `${i.code} - ${i.name}`, value: i.id })),
    [items, activeWarehouseTypeId]
  );

  const unitLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of units) map.set(u.id, formatInventoryUnitLabel(u));
    return map;
  }, [units]);

  const itemById = useMemo(() => {
    const map = new Map<number, ItemRow>();
    for (const i of items) map.set(i.id, i);
    return map;
  }, [items]);

  const unitOptions = useMemo(
    () =>
      units
        .filter((u) => u.active)
        .map((u) => ({ label: formatInventoryUnitLabel(u), value: u.id, code: u.code })),
    [units]
  );

  const warehouseTypeOptions = useMemo(
    () => warehouseTypes.map((wt) => ({ label: tWarehouseType(wt.code, wt.name), value: wt.id })),
    [warehouseTypes, tWarehouseType]
  );

  const createDraftLine = (seed?: Partial<EventLineDraft>): EventLineDraft => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item_id: seed?.item_id ?? null,
    quantity: seed?.quantity ?? null,
    unit_id: seed?.unit_id ?? null
  });

  const openEntry = () => {
    const firstFromNode = groupedNodeOptions[0]?.items[0]?.value ?? null;
    const secondNode = groupedNodeOptions.flatMap((g) => g.items).find((node) => node.value !== firstFromNode)?.value ?? null;

    setEditingMovementId(null);
    setFromNodeId(firstFromNode);
    setToNodeId(secondNode ?? firstFromNode);
    const firstItem = itemOptions[0];
    const firstItemRow = firstItem?.value ? itemById.get(firstItem.value) : undefined;
    setEventLines([
      createDraftLine({
        item_id: firstItem?.value ?? null,
        quantity: null,
        unit_id: firstItemRow?.unit_id ?? null
      })
    ]);
    setOccurredAt(new Date());
    setReferenceType('');
    setEntryOpen(true);
  };

  const openCreateItem = () => {
    setItemFormMode('create');
    setEditingItemId(null);
    setItemDraft({
      ...emptyItemDraft,
      warehouseTypeId: activeWarehouseTypeId,
      unitId: unitOptions[0]?.value ?? null
    });
    setItemDialogOpen(true);
  };

  const openEditItem = (row: ItemTableRow) => {
    setItemFormMode('edit');
    setEditingItemId(row.id);
    setItemDraft({
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
    setItemDialogOpen(true);
  };

  const openEdit = (row: MovementRow) => {
    setEditingMovementId(row.id);
    setFromNodeId(row.from_node_id ?? null);
    setToNodeId(row.to_node_id ?? null);
    const item = itemById.get(row.item_id);
    setEventLines([
      createDraftLine({
        item_id: row.item_id,
        quantity: Number(row.quantity),
        unit_id: item?.unit_id ?? null
      })
    ]);
    setOccurredAt(row.occurred_at ? new Date(row.occurred_at) : new Date());
    setReferenceType(row.reference_type ?? '');
    setEntryOpen(true);
  };

  const updateLine = (lineId: string, patch: Partial<EventLineDraft>) => {
    setEventLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    const firstItem = itemOptions[0];
    const firstItemRow = firstItem?.value ? itemById.get(firstItem.value) : undefined;
    setEventLines((prev) => [
      ...prev,
      createDraftLine({ item_id: firstItem?.value ?? null, unit_id: firstItemRow?.unit_id ?? null, quantity: null })
    ]);
  };

  const removeLine = (lineId: string) => {
    setEventLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const submitEntry = async () => {
    if (!organizationId || !fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
    if (eventLines.length === 0) return;

    const linesPayload = eventLines
      .filter((line) => line.item_id && line.quantity && line.unit_id)
      .map((line) => ({
        item_id: Number(line.item_id),
        quantity: Number(line.quantity),
        unit_id: Number(line.unit_id),
        from_node_id: fromNodeId,
        to_node_id: toNodeId
      }));
    if (linesPayload.length !== eventLines.length) return;

    try {
      const payload = {
        event_type: 'MOVE' as const,
        status: 'POSTED' as const,
        lines: linesPayload,
        reference_type: referenceType || null,
        occurred_at: occurredAt.toISOString()
      };

      await dispatch(
        upsertInventoryMovement({
          organizationId,
          movementId: editingMovementId ?? undefined,
          payload
        })
      ).unwrap();
      setEntryOpen(false);
      setEditingMovementId(null);
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: 'Hata',
          detail: t('inventory.error.save_failed', 'Kaydetme basarisiz.')
        })
      );
    }
  };

  const submitNewItem = async () => {
    if (!organizationId) return;
    const warehouseTypeId = itemDraft.warehouseTypeId ?? activeWarehouseTypeId;
    if (!warehouseTypeId) {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: 'Hata',
          detail: t('inventory.error.type_not_selected', 'Depo tipi secili degil.')
        })
      );
      return;
    }
    const code = itemDraft.code.trim();
    const name = itemDraft.name.trim();
    if (!code || !name || !itemDraft.unitId) return;

    try {
      if (itemFormMode === 'create') {
        const created = await dispatch(
          upsertInventoryItem({
            organizationId,
            warehouseTypeId,
            code,
            name,
            brand: itemDraft.brand.trim() || null,
            model: itemDraft.model.trim() || null,
            sizeSpec: itemDraft.sizeSpec.trim() || null,
            sizeUnitId: itemDraft.sizeUnitId ?? null,
            unitId: itemDraft.unitId,
            active: itemDraft.active
          })
        ).unwrap();
        setEventLines((prev) =>
          prev.length > 0
            ? prev.map((line, index) =>
                index === 0 ? { ...line, item_id: created.id, unit_id: created.unit_id ?? line.unit_id } : line
              )
            : [createDraftLine({ item_id: created.id, unit_id: created.unit_id ?? null, quantity: null })]
        );
        setItemDialogOpen(false);
      } else {
        if (!editingItemId) return;
        await dispatch(
          upsertInventoryItem({
            organizationId,
            itemId: editingItemId,
            warehouseTypeId,
            code,
            name,
            brand: itemDraft.brand.trim() || null,
            model: itemDraft.model.trim() || null,
            sizeSpec: itemDraft.sizeSpec.trim() || null,
            sizeUnitId: itemDraft.sizeUnitId ?? null,
            unitId: itemDraft.unitId,
            active: itemDraft.active
          })
        ).unwrap();
        setItemDialogOpen(false);
      }
      setItemDraft(emptyItemDraft);
    } catch {
      dispatch(
        enqueueToast({
          severity: 'error',
          summary: 'Hata',
          detail: t('inventory.error.item_upsert_failed', 'Urun/Malzeme kaydedilemedi (kod benzersiz olmali).')
        })
      );
    }
  };

  const occurredAtBody = (row: MovementRow) => {
    const date = new Date(row.occurred_at);
    return <span className="text-sm text-slate-700">{date.toLocaleString()}</span>;
  };

  const actionsBody = (row: MovementDisplayRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          icon="pi pi-pencil"
          size="small"
          text
          rounded
          onClick={() => {
            const src = movements.find((m) => m.id === row._sourceMovementId);
            if (src) openEdit(src);
          }}
          aria-label={t('inventory.action.edit', 'Duzenle')}
        />
        <Button
          icon="pi pi-trash"
          size="small"
          text
          rounded
          severity="danger"
          onClick={() => {
            if (!organizationId) return;
            confirmDialog({
              message: t('inventory.confirm.delete_movement', 'Bu stok hareketini silmek istiyor musun?'),
              header: t('inventory.confirm.title', 'Silme Onayi'),
              icon: 'pi pi-exclamation-triangle',
              acceptClassName: 'p-button-danger p-button-sm',
              acceptLabel: t('common.delete', 'Sil'),
              rejectLabel: t('common.cancel', 'Vazgec'),
              accept: async () => {
                try {
                  if (!row._sourceMovementId) return;
                  await dispatch(
                    deleteInventoryMovement({
                      organizationId,
                      movementId: row._sourceMovementId
                    })
                  ).unwrap();
                } catch {
                  dispatch(
                    enqueueToast({
                      severity: 'error',
                      summary: 'Hata',
                      detail: t('inventory.error.delete_failed', 'Silme basarisiz.')
                    })
                  );
                }
              }
            });
          }}
          aria-label={t('common.delete', 'Sil')}
        />
      </div>
    );
  };

  if (!organizationId) {
    return <Message severity="warn" text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')} className="w-full" />;
  }

  const tabItems: MenuItem[] = warehouseTypes.map((wt) => ({
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
  }));
  const contentTabItems: MenuItem[] = [
    { label: t('inventory.tab.movements', 'Hareketler'), icon: 'pi pi-arrow-right-arrow-left', command: () => setContentTab('movements') },
    { label: t('inventory.tab.stock', 'Stok'), icon: 'pi pi-table', command: () => setContentTab('balances') }
  ];

  const activeIndex = Math.max(0, warehouseTypes.findIndex((t) => t.id === activeWarehouseTypeId));
  const contentActiveIndex = contentTab === 'movements' ? 0 : 1;
  const canCreateMovement = activeWarehouseTypeId !== null && groupedNodeOptions.some((group) => group.items.length > 0);

  const activeWarehouseTypeName = activeWarehouseTypeId ? warehouseTypeNameById.get(activeWarehouseTypeId) ?? '-' : '-';
  const itemsForActiveType = activeWarehouseTypeId ? items.filter((i) => i.warehouse_type_id === activeWarehouseTypeId) : [];
  const itemsList = itemsSearch.trim()
    ? itemsForActiveType.filter((i) => {
        const q = itemsSearch.trim().toLowerCase();
        return i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
      })
    : itemsForActiveType;

  return (
    <div className="grid gap-4">
        <Tooltip
        ref={refTooltip}
        target="#inventory-ref-info"
        position="top"
        content={t(
          'inventory.reference.tooltip',
          'Bu stok hareketi hangi belge/isten kaynaklandi? Ornek: PO (Satin Alma), WO (Is Emri), SO (Satis), INV (Fatura).'
        )}
      />

      <div className="rounded-xl border border-slate-200 bg-white pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <TabMenu model={tabItems} activeIndex={activeIndex} className="p-component-sm" />
          </div>
          <div className="hidden h-8 w-px bg-slate-200 lg:block" />
          <div className="overflow-x-auto">
            <TabMenu model={contentTabItems} activeIndex={contentActiveIndex} className="p-component-sm" />
          </div>
        </div>
      </div>

      {contentTab === 'movements' ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            label={`${t('inventory.materials', 'Malzemeler')} (${activeWarehouseTypeName})`}
            icon="pi pi-list"
            size="small"
            outlined
            onClick={() => setItemsListOpen(true)}
            disabled={!activeWarehouseTypeId}
          />
          <IconField iconPosition="left" className="w-full sm:w-auto">
            <InputIcon className="pi pi-search text-slate-400" />
            <InputText
              value={movementSearch}
              onChange={(e) => {
                const v = e.target.value;
                setMovementSearch(v);
                setMovementFilters((prev) => ({ ...prev, global: { ...prev.global, value: v } }));
              }}
              placeholder={t('common.search', 'Ara')}
              className="w-full sm:w-72"
            />
          </IconField>
          <Button label={t('inventory.new_movement', 'Yeni Hareket')} icon="pi pi-plus" size="small" onClick={openEntry} disabled={!canCreateMovement} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            label={`${t('inventory.materials', 'Malzemeler')} (${activeWarehouseTypeName})`}
            icon="pi pi-list"
            size="small"
            outlined
            onClick={() => setItemsListOpen(true)}
            disabled={!activeWarehouseTypeId}
          />
          <Dropdown
            value={selectedBalanceWarehouseId}
            onChange={(e) => setSelectedBalanceWarehouseId(e.value ?? null)}
            options={balanceWarehouseOptions}
            className="w-full sm:w-72"
            placeholder={t('inventory.select_warehouse', 'Depo sec')}
            filter
            disabled={balanceWarehouseOptions.length === 0}
          />
        </div>
      )}

      {contentTab === 'movements' ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto py-3">
            <DataTable
              value={displayMovements}
              loading={loading}
              size="small"
              emptyMessage={t('inventory.empty.movements', 'Hareket yok.')}
              removableSort
              sortMode="multiple"
              sortField="occurred_at"
              sortOrder={-1}
              filters={movementFilters}
              onFilter={(e) => setMovementFilters(e.filters)}
              globalFilterFields={['from_label', 'to_label', 'item_code', 'item_name', 'uom']}
              dataKey="row_key"
              tableStyle={{ minWidth: '70rem' }}
            >
              <Column field="item_code" header={t('inventory.col.code', 'Kod')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
              <Column field="item_name" header={t('inventory.col.item', 'Urun')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
              <Column field="from_label" header={t('inventory.col.from', 'Nereden')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
              <Column field="to_label" header={t('inventory.col.to', 'Nereye')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
              <Column field="quantity" header={t('inventory.col.qty', 'Miktar')} sortable style={{ width: '8rem' }} />
              <Column field="uom" header={t('inventory.col.unit', 'Birim')} sortable filter filterPlaceholder={t('common.search', 'Ara')} />
              <Column header={t('inventory.col.date', 'Tarih')} body={occurredAtBody} sortField="occurred_at" sortable />
              <Column header="" body={actionsBody} />
            </DataTable>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{t('inventory.stock_info', 'Stok Bilgisi')}</span>
            </div>
            <div className="overflow-x-auto">
              <DataTable value={balancesForType} size="small" emptyMessage={t('inventory.empty.balance', 'Bakiye yok.')} paginator rows={12} tableStyle={{ minWidth: '44rem' }}>
                <Column field="item_code" header={t('inventory.col.code', 'Kod')} sortable />
                <Column field="item_name" header={t('inventory.col.item', 'Urun')} sortable />
                <Column field="balance_qty" header={t('inventory.col.balance', 'Bakiye')} sortable />
                <Column
                  field="unit_code"
                  header={t('inventory.col.unit', 'Birim')}
                  sortable
                  body={(row: { unit_code?: string | null }) =>
                    row.unit_code ? unitLabelByCode.get(row.unit_code.toLowerCase()) ?? row.unit_code : '-'
                  }
                />
              </DataTable>
            </div>
          </div>
        </div>
      )}

      <Dialog
        header={editingMovementId ? t('inventory.edit_movement', 'Stok Hareketi Duzelt') : t('inventory.new_movement_dialog', 'Yeni Stok Hareketi')}
        visible={entryOpen}
        onHide={() => {
          setEntryOpen(false);
          setEditingMovementId(null);
        }}
        className="w-full max-w-4xl"
      >
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('inventory.col.date', 'Tarih')}</span>
            <Calendar value={occurredAt} onChange={(e) => setOccurredAt(e.value ?? new Date())} showTime className="w-full" />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('inventory.from_node', 'From Node')}</span>
              <Dropdown
                value={fromNodeId}
                onChange={(e) => setFromNodeId(e.value ?? null)}
                options={groupedNodeOptions}
                optionGroupLabel="label"
                optionGroupChildren="items"
                optionGroupTemplate={nodeGroupTemplate}
                className="w-full inventory-node-dropdown"
                panelClassName="inventory-node-panel"
                filter
                filterBy="label"
                filterPlaceholder={t('common.search', 'Ara')}
                placeholder={t('inventory.select_source_node', 'Kaynak node sec')}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{t('inventory.to_node', 'To Node')}</span>
              <Dropdown
                value={toNodeId}
                onChange={(e) => setToNodeId(e.value ?? null)}
                options={groupedNodeOptions}
                optionGroupLabel="label"
                optionGroupChildren="items"
                optionGroupTemplate={nodeGroupTemplate}
                className="w-full inventory-node-dropdown"
                panelClassName="inventory-node-panel"
                filter
                filterBy="label"
                filterPlaceholder={t('common.search', 'Ara')}
                placeholder={t('inventory.select_target_node', 'Hedef node sec')}
              />
            </label>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">{t('inventory.lines', 'Hareket Satirlari')}</span>
              <div className="flex items-center gap-2">
                <Button label={t('inventory.new_item', 'Yeni Item')} icon="pi pi-plus" size="small" outlined onClick={openCreateItem} />
                <Button label={t('inventory.add_line', 'Satir Ekle')} icon="pi pi-plus" size="small" onClick={addLine} />
              </div>
            </div>
            {eventLines.map((line) => {
              const unitLabel = line.unit_id ? unitLabelById.get(line.unit_id) ?? '-' : '-';
              return (
                <div
                  key={line.id}
                  className="grid items-center gap-2 overflow-hidden rounded-lg border border-slate-200 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,10rem)_minmax(8rem,9.5rem)_2.5rem]"
                >
                  <Dropdown
                    value={line.item_id}
                    onChange={(e) => {
                      const nextItemId = e.value ?? null;
                      const nextItem = nextItemId ? itemById.get(nextItemId) : undefined;
                      updateLine(line.id, { item_id: nextItemId, unit_id: nextItem?.unit_id ?? null });
                    }}
                    options={itemOptions}
                    className="w-full min-w-0"
                    filter
                    placeholder={t('inventory.item_or_material', 'Urun/Malzeme')}
                  />
                  <InputNumber
                    value={line.quantity}
                    onValueChange={(e) => updateLine(line.id, { quantity: e.value ?? null })}
                    className="w-full min-w-0"
                    inputClassName="w-full"
                    min={0}
                    placeholder={t('inventory.col.qty', 'Miktar')}
                  />
                  <InputText
                    value={unitLabel}
                    readOnly
                    tabIndex={-1}
                    onFocus={(e) => e.currentTarget.blur()}
                    className="w-full min-w-0 text-sm readonly-display-input"
                  />
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    onClick={() => removeLine(line.id)}
                    disabled={eventLines.length <= 1}
                  />
                </div>
              );
            })}
          </div>

          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {t('inventory.reference', 'Referans')}
              <i
                id="inventory-ref-info"
                className="pi pi-info-circle cursor-help text-xs text-slate-400 hover:text-slate-700"
                aria-label={t('inventory.reference_info', 'Referans aciklamasi')}
                tabIndex={0}
              />
            </span>
            <InputText value={referenceType} onChange={(e) => setReferenceType(e.target.value)} placeholder={t('inventory.reference_placeholder', 'PO, WO, ...')} className="w-full" />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={() => setEntryOpen(false)} />
            <Button
              label={t('common.save', 'Kaydet')}
              size="small"
              onClick={submitEntry}
              loading={loading}
              disabled={
                !fromNodeId ||
                !toNodeId ||
                fromNodeId === toNodeId ||
                eventLines.length === 0 ||
                eventLines.some((line) => !line.item_id || !line.quantity || !line.unit_id)
              }
            />
          </div>
        </div>
      </Dialog>

      <ItemFormDialog
        visible={itemDialogOpen}
        mode={itemFormMode}
        draft={itemDraft}
        onDraftChange={setItemDraft}
        warehouseTypeOptions={warehouseTypeOptions}
        unitOptions={unitOptions}
        loading={loading}
        warehouseTypeDisabled={itemFormMode === 'edit'}
        onHide={() => setItemDialogOpen(false)}
        onSubmit={submitNewItem}
      />

      <Dialog
        header={`${t('inventory.materials', 'Malzemeler')} (${activeWarehouseTypeName})`}
        visible={itemsListOpen}
        onHide={() => setItemsListOpen(false)}
        className="w-full max-w-4xl"
        contentStyle={{ minHeight: '50vh' }}
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <IconField iconPosition="left" className="w-full sm:w-auto">
              <InputIcon className="pi pi-search text-slate-400" />
              <InputText
                value={itemsSearch}
                onChange={(e) => setItemsSearch(e.target.value)}
                placeholder={t('common.search', 'Ara')}
                className="w-full sm:w-72"
              />
            </IconField>
            <Button label={t('inventory.new_item', 'Yeni Item')} icon="pi pi-plus" size="small" onClick={openCreateItem} disabled={!activeWarehouseTypeId} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
            <ItemsTable
              items={itemsList}
              units={units}
              emptyMessage={t('inventory.empty.items', 'Item yok.')}
              tableStyle={{ minWidth: '62rem' }}
              actionBody={(row) => (
                <div className="flex items-center justify-end gap-1">
                  <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEditItem(row)} aria-label={t('inventory.action.edit', 'Duzenle')} />
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    rounded
                    severity="danger"
                    onClick={() => {
                      if (!organizationId) return;
                      confirmDialog({
                        message: t('inventory.confirm.delete_item', 'Bu item silinsin mi? (Pasife alinacak)'),
                        header: t('inventory.confirm.title', 'Silme Onayi'),
                        icon: 'pi pi-exclamation-triangle',
                        acceptClassName: 'p-button-danger p-button-sm',
                        acceptLabel: t('common.delete', 'Sil'),
                        rejectLabel: t('common.cancel', 'Vazgec'),
                        accept: async () => {
                          try {
                            await dispatch(
                              deleteInventoryItem({
                                organizationId,
                                itemId: row.id
                              })
                            ).unwrap();
                          } catch {
                            dispatch(
                              enqueueToast({
                                severity: 'error',
                                summary: 'Hata',
                                detail: t('inventory.error.delete_failed', 'Silme basarisiz.')
                              })
                            );
                          }
                        }
                      });
                    }}
                    aria-label={t('common.delete', 'Sil')}
                  />
                </div>
              )}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
