import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { TabMenu } from 'primereact/tabmenu';
import { Tooltip } from 'primereact/tooltip';
import type { MenuItem } from 'primereact/menuitem';
import { confirmDialog } from 'primereact/confirmdialog';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';

import InventoryBalancesTable from '../components/inventory/InventoryBalancesTable';
import InventoryContentToolbar from '../components/inventory/InventoryContentToolbar';
import InventoryItemsDialog from '../components/inventory/InventoryItemsDialog';
import InventoryMovementEntryDialog from '../components/inventory/InventoryMovementEntryDialog';
import InventoryMovementsTable from '../components/inventory/InventoryMovementsTable';
import type { EventLineDraft, GroupedNodeOption, MovementDisplayRow } from '../components/inventory/types';
import { warehouseIconByType } from '../components/inventory/warehouseTypeUi';
import ItemFormDialog, { type ItemFormDraft } from '../components/items/ItemFormDialog';
import type { ItemTableRow } from '../components/items/ItemsTable';
import { formatUnitLabelWithName } from '../components/items/itemUtils';
import { useGlobalTableFilter } from '../hooks/useGlobalTableFilter';
import type { AppDispatch, RootState } from '../store';
import { useI18n } from '../hooks/useI18n';
import { enqueueToast } from '../store/uiSlice';
import {
  deleteInventoryItem,
  deleteInventoryMovement,
  fetchInventoryData,
  type InventoryItemRow,
  type MovementRow,
  type NodeRow,
  upsertInventoryItem,
  upsertInventoryMovement
} from '../store/inventorySlice';

const initialMovementFilters: DataTableFilterMeta = {
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  from_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
  to_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
  item_code: { value: null, matchMode: FilterMatchMode.CONTAINS },
  item_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  uom: { value: null, matchMode: FilterMatchMode.CONTAINS }
};

const emptyItemDraft: ItemFormDraft = {
  warehouseTypeId: null,
  inventoryItemCardId: null,
  code: '',
  name: '',
  description: '',
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
  const { units, inventoryItems, inventoryItemCards, warehouseTypes, warehouses, nodes, movements, balances, loading: fetchLoading, mutating } =
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
  const [contentTab, setContentTab] = useState<'movements' | 'balances'>('movements');
  const { search: movementSearch, filters: movementFilters, updateGlobalSearch, applyTableFilters } =
    useGlobalTableFilter(initialMovementFilters);
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

  const orderedWarehouseTypes = useMemo(() => [...warehouseTypes].reverse(), [warehouseTypes]);

  useEffect(() => {
    if (orderedWarehouseTypes.length === 0) return;
    if (activeWarehouseTypeId === null || !orderedWarehouseTypes.some((t) => t.id === activeWarehouseTypeId)) {
      setActiveWarehouseTypeId(orderedWarehouseTypes[0].id);
    }
  }, [orderedWarehouseTypes, activeWarehouseTypeId]);

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

  const nodeGroupTemplate = useCallback((group: GroupedNodeOption) => {
    const iconByGroupKey: Record<string, string> = {
      WAREHOUSE: 'pi pi-building',
      LOCATION: 'pi pi-map-marker',
      SUPPLIER: 'pi pi-truck',
      CUSTOMER: 'pi pi-users'
    };
    const iconClass = iconByGroupKey[group.groupKey] ?? 'pi pi-tag';

    return (
      <div className="inventory-node-group-chip">
        <i className={`${iconClass} text-xs`} />
        <span>{group.label}</span>
        <span className="inventory-node-group-count">{group.items.length}</span>
      </div>
    );
  }, []);

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
        item_code: m.inventory_item_code ?? '',
        item_name: m.inventory_item_name ?? '',
        quantity: m.quantity,
        uom: unitLabelByCode.get(String(m.uom ?? '').toLowerCase()) ?? m.uom,
        occurred_at: m.occurred_at,
        _sourceMovementId: m.id
      })),
    [movementsForType, unitLabelByCode]
  );

  const itemOptions = useMemo(
    () =>
      inventoryItems
        .filter((i) => i.active)
        .filter((i) => (activeWarehouseTypeId ? i.warehouse_type_id === activeWarehouseTypeId : true))
        .map((i) => ({ label: `${i.code} - ${i.name}`, value: i.id })),
    [inventoryItems, activeWarehouseTypeId]
  );

  const unitLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of units) map.set(u.id, formatInventoryUnitLabel(u));
    return map;
  }, [units]);

  const itemById = useMemo(() => {
    const map = new Map<number, InventoryItemRow>();
    for (const i of inventoryItems) map.set(i.id, i);
    return map;
  }, [inventoryItems]);

  const movementById = useMemo(() => {
    const map = new Map<number, MovementRow>();
    for (const movement of movements) map.set(movement.id, movement);
    return map;
  }, [movements]);

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

  const allowInventoryItemCardEdit = useMemo(() => {
    const wtId = itemDraft.warehouseTypeId ?? activeWarehouseTypeId;
    if (!wtId) return false;
    const wtCode = warehouseTypes.find((x) => x.id === wtId)?.code?.toUpperCase() ?? '';
    return wtCode === 'SPARE_PART' || wtCode === 'RAW_MATERIAL';
  }, [activeWarehouseTypeId, itemDraft.warehouseTypeId, warehouseTypes]);

  const inventoryItemCardOptions = useMemo(() => {
    const targetWarehouseTypeId = itemDraft.warehouseTypeId ?? activeWarehouseTypeId;
    return inventoryItemCards
      .filter((g) => g.active || g.id === itemDraft.inventoryItemCardId)
      .filter((g) => (targetWarehouseTypeId ? g.warehouse_type_id === targetWarehouseTypeId : true))
      .map((g) => ({
        label: `${g.code} - ${g.name}${g.type_spec?.trim() ? ` · ${g.type_spec.trim()}` : ''}${g.size_spec?.trim() ? ` · ${g.size_spec.trim()}` : ''}`,
        value: g.id,
        amount_unit_id: g.amount_unit_id,
        size_spec: g.size_spec,
        size_unit_id: g.size_unit_id
      }));
  }, [activeWarehouseTypeId, itemDraft.inventoryItemCardId, itemDraft.warehouseTypeId, inventoryItemCards]);

  const createDraftLine = useCallback((seed?: Partial<EventLineDraft>): EventLineDraft => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    inventory_item_id: seed?.inventory_item_id ?? null,
    quantity: seed?.quantity ?? null,
    amount_unit_id: seed?.amount_unit_id ?? null
  }), []);

  const openEntry = useCallback(() => {
    const firstFromNode = groupedNodeOptions[0]?.items[0]?.value ?? null;
    const secondNode = groupedNodeOptions.flatMap((g) => g.items).find((node) => node.value !== firstFromNode)?.value ?? null;

    setEditingMovementId(null);
    setFromNodeId(firstFromNode);
    setToNodeId(secondNode ?? firstFromNode);
    const firstItem = itemOptions[0];
    const firstItemRow = firstItem?.value ? itemById.get(firstItem.value) : undefined;
    setEventLines([
      createDraftLine({
        inventory_item_id: firstItem?.value ?? null,
        quantity: null,
        amount_unit_id: firstItemRow?.unit_id ?? null
      })
    ]);
    setOccurredAt(new Date());
    setReferenceType('');
    setEntryOpen(true);
  }, [createDraftLine, groupedNodeOptions, itemById, itemOptions]);

  const openCreateItem = useCallback(() => {
    setItemFormMode('create');
    setEditingItemId(null);
    const wtCode = warehouseTypes.find((x) => x.id === activeWarehouseTypeId)?.code?.toUpperCase() ?? '';
    const needsCard = wtCode === 'SPARE_PART' || wtCode === 'RAW_MATERIAL';
    const firstCard =
      needsCard && activeWarehouseTypeId
        ? inventoryItemCards
            .filter((g) => g.active)
            .find((g) => g.warehouse_type_id === activeWarehouseTypeId) ?? null
        : null;
    setItemDraft({
      ...emptyItemDraft,
      warehouseTypeId: activeWarehouseTypeId,
      inventoryItemCardId: needsCard ? firstCard?.id ?? null : null,
      unitId: needsCard ? firstCard?.amount_unit_id ?? null : unitOptions[0]?.value ?? null,
      sizeSpec: needsCard ? firstCard?.size_spec ?? '' : '',
      sizeUnitId: needsCard ? firstCard?.size_unit_id ?? null : null
    });
    setItemDialogOpen(true);
  }, [activeWarehouseTypeId, emptyItemDraft, inventoryItemCards, unitOptions, warehouseTypes]);

  const openEditItem = useCallback((row: ItemTableRow) => {
    setItemFormMode('edit');
    setEditingItemId(row.id);
    setItemDraft({
      warehouseTypeId: row.warehouse_type_id ?? activeWarehouseTypeId,
      inventoryItemCardId: row.inventory_item_card_id ?? null,
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      brand: row.brand ?? '',
      model: row.model ?? '',
      sizeSpec: row.size_spec ?? '',
      sizeUnitId: row.size_unit_id ?? null,
      unitId: row.unit_id ?? null,
      active: row.active
    });
    setItemDialogOpen(true);
  }, [activeWarehouseTypeId]);

  const openEdit = useCallback((row: MovementRow) => {
    setEditingMovementId(row.id);
    setFromNodeId(row.from_node_id ?? null);
    setToNodeId(row.to_node_id ?? null);
    const item = itemById.get(row.inventory_item_id);
    setEventLines([
      createDraftLine({
        inventory_item_id: row.inventory_item_id,
        quantity: Number(row.quantity),
        amount_unit_id: item?.unit_id ?? null
      })
    ]);
    setOccurredAt(row.occurred_at ? new Date(row.occurred_at) : new Date());
    setReferenceType(row.reference_type ?? '');
    setEntryOpen(true);
  }, [createDraftLine, itemById]);

  const updateLine = (lineId: string, patch: Partial<EventLineDraft>) => {
    setEventLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    const firstItem = itemOptions[0];
    const firstItemRow = firstItem?.value ? itemById.get(firstItem.value) : undefined;
    setEventLines((prev) => [
      ...prev,
      createDraftLine({ inventory_item_id: firstItem?.value ?? null, amount_unit_id: firstItemRow?.unit_id ?? null, quantity: null })
    ]);
  };

  const removeLine = (lineId: string) => {
    setEventLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)));
  };

  const submitEntry = async () => {
    if (!organizationId || !fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
    if (eventLines.length === 0) return;

    const linesPayload = eventLines
      .filter((line) => line.inventory_item_id && line.quantity && line.amount_unit_id)
      .map((line) => ({
        inventory_item_id: Number(line.inventory_item_id),
        quantity: Number(line.quantity),
        amount_unit_id: Number(line.amount_unit_id),
        from_node_id: fromNodeId,
        to_node_id: toNodeId
      }));
    if (linesPayload.length !== eventLines.length) return;

    try {
      const payload = {
        event_type: 'MOVE' as const,
        status: 'DRAFT' as const,
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
      // Global rejected-action toast handler displays error message.
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
    if (allowInventoryItemCardEdit && !itemDraft.inventoryItemCardId) return;

    try {
      if (itemFormMode === 'create') {
        const created = await dispatch(
          upsertInventoryItem({
            organizationId,
            warehouseTypeId,
            inventoryItemCardId: itemDraft.inventoryItemCardId,
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
                index === 0
                  ? { ...line, inventory_item_id: created.id, amount_unit_id: created.unit_id ?? line.amount_unit_id }
                  : line
              )
            : [createDraftLine({ inventory_item_id: created.id, amount_unit_id: created.unit_id ?? null, quantity: null })]
        );
        setItemDialogOpen(false);
      } else {
        if (!editingItemId) return;
        await dispatch(
          upsertInventoryItem({
            organizationId,
            inventoryItemId: editingItemId,
            warehouseTypeId,
            code,
            name,
            brand: itemDraft.brand.trim() || null,
            model: itemDraft.model.trim() || null,
            sizeSpec: itemDraft.sizeSpec.trim() || null,
            sizeUnitId: itemDraft.sizeUnitId ?? null,
            unitId: itemDraft.unitId,
            active: itemDraft.active,
            inventoryItemCardId: itemDraft.inventoryItemCardId
          })
        ).unwrap();
        setItemDialogOpen(false);
      }
      setItemDraft(emptyItemDraft);
    } catch {
      // Global rejected-action toast handler displays error message.
    }
  };

  const occurredAtBody = (row: { occurred_at: string }) => {
    const date = new Date(row.occurred_at);
    return <span className="text-sm text-slate-700">{date.toLocaleString()}</span>;
  };

  const actionsBody = useCallback((row: MovementDisplayRow) => {
    const src = row._sourceMovementId ? movementById.get(row._sourceMovementId) : undefined;
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          icon="pi pi-pencil"
          size="small"
          text
          rounded
          onClick={() => {
            if (!src) return;
            if (src.status !== 'DRAFT') {
              dispatch(
                enqueueToast({
                  severity: 'warn',
                  summary: 'Uyari',
                  detail: t('inventory.error.movement_immutable', 'Sadece taslak (DRAFT) hareketler duzenlenebilir.')
                })
              );
              return;
            }
            openEdit(src);
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
                  // Global rejected-action toast handler displays error message.
                }
              }
            });
          }}
          aria-label={t('common.delete', 'Sil')}
        />
      </div>
    );
  }, [dispatch, movementById, openEdit, organizationId, t]);

  const onEntryHide = useCallback(() => {
    setEntryOpen(false);
    setEditingMovementId(null);
  }, []);

  const onLineItemChange = useCallback((lineId: string, itemId: number | null) => {
    const nextItem = itemId ? itemById.get(itemId) : undefined;
    updateLine(lineId, { inventory_item_id: itemId, amount_unit_id: nextItem?.unit_id ?? null });
  }, [itemById]);

  const onLineQuantityChange = useCallback((lineId: string, quantity: number | null) => {
    updateLine(lineId, { quantity });
  }, []);

  const movementSaveDisabled =
    !fromNodeId ||
    !toNodeId ||
    fromNodeId === toNodeId ||
    eventLines.length === 0 ||
    eventLines.some((line) => !line.inventory_item_id || !line.quantity || !line.amount_unit_id);

  const itemActionsBody = useCallback((row: ItemTableRow) => (
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
                    inventoryItemId: row.id
                  })
                ).unwrap();
              } catch {
                // Global rejected-action toast handler displays error message.
              }
            }
          });
        }}
        aria-label={t('common.delete', 'Sil')}
      />
    </div>
  ), [dispatch, openEditItem, organizationId, t]);

  if (!organizationId) {
    return <Message severity="warn" text={t('common.organization_missing', 'Organization bulunamadi. Lutfen tekrar giris yap.')} className="w-full" />;
  }

  const tabItems: MenuItem[] = orderedWarehouseTypes.map((wt) => ({
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
  }));
  const contentTabItems: MenuItem[] = [
    { label: t('inventory.tab.movements', 'Hareketler'), icon: 'pi pi-arrow-right-arrow-left', command: () => setContentTab('movements') },
    { label: t('inventory.tab.stock', 'Stok'), icon: 'pi pi-table', command: () => setContentTab('balances') }
  ];

  const activeIndex = Math.max(0, orderedWarehouseTypes.findIndex((t) => t.id === activeWarehouseTypeId));
  const contentActiveIndex = contentTab === 'movements' ? 0 : 1;
  const canCreateMovement = activeWarehouseTypeId !== null && groupedNodeOptions.some((group) => group.items.length > 0);

  const activeWarehouseTypeName = activeWarehouseTypeId ? warehouseTypeNameById.get(activeWarehouseTypeId) ?? '-' : '-';
  const itemsForActiveType = activeWarehouseTypeId ? inventoryItems.filter((i) => i.warehouse_type_id === activeWarehouseTypeId) : [];
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

      <InventoryContentToolbar
        translate={t}
        contentTab={contentTab}
        activeWarehouseTypeId={activeWarehouseTypeId}
        activeWarehouseTypeName={activeWarehouseTypeName}
        onOpenItems={() => setItemsListOpen(true)}
        movementSearch={movementSearch}
        onMovementSearchChange={updateGlobalSearch}
        onOpenEntry={openEntry}
        canCreateMovement={canCreateMovement}
        selectedBalanceWarehouseId={selectedBalanceWarehouseId}
        onSelectedBalanceWarehouseIdChange={setSelectedBalanceWarehouseId}
        balanceWarehouseOptions={balanceWarehouseOptions}
      />

      {contentTab === 'movements' ? (
        <InventoryMovementsTable
          translate={t}
          loading={loading}
          rows={displayMovements}
          filters={movementFilters}
          onFilter={applyTableFilters}
          occurredAtBody={occurredAtBody}
          actionsBody={actionsBody}
        />
      ) : (
        <InventoryBalancesTable
          translate={t}
          rows={balancesForType}
          unitLabelResolver={(unitCode) => (unitCode ? unitLabelByCode.get(unitCode.toLowerCase()) ?? unitCode : '-')}
        />
      )}

      <InventoryMovementEntryDialog
        translate={t}
        visible={entryOpen}
        editingMovement={Boolean(editingMovementId)}
        occurredAt={occurredAt}
        onOccurredAtChange={setOccurredAt}
        fromNodeId={fromNodeId}
        toNodeId={toNodeId}
        onFromNodeChange={setFromNodeId}
        onToNodeChange={setToNodeId}
        groupedNodeOptions={groupedNodeOptions}
        nodeGroupTemplate={nodeGroupTemplate}
        eventLines={eventLines}
        itemOptions={itemOptions}
        getUnitLabel={(unitId) => (unitId ? unitLabelById.get(unitId) ?? '-' : '-')}
        onLineItemChange={onLineItemChange}
        onLineQuantityChange={onLineQuantityChange}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        onOpenCreateItem={openCreateItem}
        referenceType={referenceType}
        onReferenceTypeChange={setReferenceType}
        onHide={onEntryHide}
        onSubmit={submitEntry}
        loading={loading}
        saveDisabled={movementSaveDisabled}
      />

      <ItemFormDialog
        visible={itemDialogOpen}
        mode={itemFormMode}
        draft={itemDraft}
        onDraftChange={setItemDraft}
        warehouseTypeOptions={warehouseTypeOptions}
        inventoryItemCardOptions={allowInventoryItemCardEdit ? inventoryItemCardOptions : []}
        allowInventoryItemCardEdit={allowInventoryItemCardEdit}
        unitOptions={unitOptions}
        loading={loading}
        warehouseTypeDisabled={itemFormMode === 'edit'}
        onHide={() => {
          setItemDialogOpen(false);
        }}
        onSubmit={submitNewItem}
      />

      <InventoryItemsDialog
        translate={t}
        visible={itemsListOpen}
        activeWarehouseTypeName={activeWarehouseTypeName}
        searchValue={itemsSearch}
        onSearchChange={setItemsSearch}
        onHide={() => setItemsListOpen(false)}
        onOpenCreateItem={openCreateItem}
        createDisabled={!activeWarehouseTypeId}
        items={itemsList}
        units={units}
        actionBody={itemActionsBody}
      />
    </div>
  );
}
