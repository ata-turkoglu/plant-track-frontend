import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
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
import { Checkbox } from 'primereact/checkbox';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import type { DataTableFilterMeta } from 'primereact/datatable';

import { api } from '../services/api';
import type { RootState } from '../store';

type UnitRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  symbol: string | null;
  system: boolean;
  active: boolean;
};

type ItemRow = {
  id: number;
  organization_id: number;
  warehouse_type_id?: number;
  type: string;
  code: string;
  name: string;
  unit_id?: number;
  active: boolean;
};

type WarehouseTypeRow = {
  id: number;
  organization_id: number;
  code: string;
  name: string;
  description: string | null;
  system: boolean;
  active: boolean;
};

type WarehouseRow = {
  id: number;
  organization_id: number;
  location_id: number;
  name: string;
  warehouse_type_id: number;
  warehouse_type_name?: string;
};

type NodeRow = {
  id: number;
  organization_id: number;
  node_type: 'WAREHOUSE' | 'LOCATION' | 'SUPPLIER' | 'CUSTOMER' | 'ASSET' | 'VIRTUAL';
  ref_table: string;
  ref_id: string;
  code?: string | null;
  name: string;
  is_stocked: boolean;
};

type MovementRow = {
  id: number;
  organization_id: number;
  movement_group_id?: string | null;
  from_kind?: string | null;
  from_ref?: string | null;
  to_kind?: string | null;
  to_ref?: string | null;
  from_node_id?: number | null;
  to_node_id?: number | null;
  from_node_type?: string | null;
  from_node_name?: string | null;
  to_node_type?: string | null;
  to_node_name?: string | null;
  warehouse_id: number;
  location_id: number | null;
  item_id: number;
  movement_type: string;
  quantity: string | number;
  uom: string;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  occurred_at: string;
  item_code?: string;
  item_name?: string;
  location_name?: string;
};

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

type BalanceRow = {
  organization_id: number;
  node_id: number;
  node_type: string;
  node_name: string;
  item_id: number;
  item_code?: string;
  item_name?: string;
  unit_code?: string;
  balance_qty: string | number;
};

type EventLineDraft = {
  id: string;
  item_id: number | null;
  quantity: number | null;
  unit_id: number | null;
};

export default function InventoryMovementsPage() {
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const refTooltip = useRef<Tooltip>(null);

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseTypeRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnitId, setNewItemUnitId] = useState<number | null>(null);
  const [newItemActive, setNewItemActive] = useState(true);
  const [itemFormMode, setItemFormMode] = useState<'create' | 'edit'>('create');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [itemsListOpen, setItemsListOpen] = useState(false);
  const [itemsSearch, setItemsSearch] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementFilters, setMovementFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    from_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
    to_label: { value: null, matchMode: FilterMatchMode.CONTAINS },
    item_code: { value: null, matchMode: FilterMatchMode.CONTAINS },
    item_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    uom: { value: null, matchMode: FilterMatchMode.CONTAINS }
  });

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError('');

    Promise.all([
      api.get(`/api/organizations/${organizationId}/units`),
      api.get(`/api/organizations/${organizationId}/items`),
      api.get(`/api/organizations/${organizationId}/warehouse-types`),
      api.get(`/api/organizations/${organizationId}/warehouses`),
      api.get(`/api/organizations/${organizationId}/nodes?types=WAREHOUSE,LOCATION,SUPPLIER,CUSTOMER`),
      api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`),
      api.get(`/api/organizations/${organizationId}/inventory-balances`)
    ])
      .then(([unitsRes, itemsRes, wtRes, whRes, nodesRes, movRes, balRes]) => {
        setUnits(unitsRes.data.units ?? []);
        setItems(itemsRes.data.items ?? []);
        const types: WarehouseTypeRow[] = wtRes.data.warehouse_types ?? [];
        setWarehouseTypes(types);
        setWarehouses(whRes.data.warehouses ?? []);
        setNodes(nodesRes.data.nodes ?? []);
        setMovements(movRes.data.movements ?? []);
        setBalances(balRes.data.balances ?? []);

        if (types.length > 0) setActiveWarehouseTypeId((prev) => (prev === null ? types[0].id : prev));
      })
      .catch(() => setError('Veriler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [organizationId]);

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
    for (const wt of warehouseTypes) map.set(wt.id, wt.name);
    return map;
  }, [warehouseTypes]);

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

    const groups: { label: string; items: { label: string; value: number }[] }[] = [];
    if (warehouseGroup.length > 0) groups.push({ label: 'Warehouses', items: warehouseGroup });
    if (locationGroup.length > 0) groups.push({ label: 'Locations', items: locationGroup });
    if (supplierGroup.length > 0) groups.push({ label: 'Suppliers', items: supplierGroup });
    if (customerGroup.length > 0) groups.push({ label: 'Customers', items: customerGroup });
    return groups;
  }, [nodes, warehousesByType]);

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
        uom: m.uom,
        occurred_at: m.occurred_at,
        _sourceMovementId: m.id
      })),
    [movementsForType]
  );

  const itemOptions = useMemo(
    () =>
      items
        .filter((i) => i.active)
        .filter((i) => (activeWarehouseTypeId ? i.warehouse_type_id === activeWarehouseTypeId : true))
        .map((i) => ({ label: `${i.code} - ${i.name}`, value: i.id })),
    [items, activeWarehouseTypeId]
  );

  const unitCodeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of units) map.set(u.id, u.code);
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
        .map((u) => ({ label: u.symbol ? `${u.name} (${u.symbol})` : u.name, value: u.id, code: u.code })),
    [units]
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

  const reloadItems = async () => {
    if (!organizationId) return;
    const res = await api.get(`/api/organizations/${organizationId}/items`);
    setItems(res.data.items ?? []);
  };

  const openCreateItem = () => {
    setItemFormMode('create');
    setEditingItemId(null);
    setNewItemCode('');
    setNewItemName('');
    setNewItemUnitId(unitOptions[0]?.value ?? null);
    setNewItemActive(true);
    setItemDialogOpen(true);
  };

  const openEditItem = (row: ItemRow) => {
    setItemFormMode('edit');
    setEditingItemId(row.id);
    setNewItemCode(row.code);
    setNewItemName(row.name);
    setNewItemUnitId(row.unit_id ?? null);
    setNewItemActive(row.active);
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

    setLoading(true);
    setError('');
    try {
      const payload: any = {
        event_type: 'MOVE',
        status: 'POSTED',
        lines: linesPayload,
        reference_type: referenceType || null,
        occurred_at: occurredAt.toISOString()
      };

      if (editingMovementId) {
        await api.put(`/api/organizations/${organizationId}/inventory-movements/${editingMovementId}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/inventory-movements`, payload);
      }

      // Reload list to include joins (item/warehouse names)
      const [movRes, nodesRes, balRes] = await Promise.all([
        api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`),
        api.get(`/api/organizations/${organizationId}/nodes?types=WAREHOUSE,LOCATION,SUPPLIER,CUSTOMER`),
        api.get(`/api/organizations/${organizationId}/inventory-balances`)
      ]);
      setMovements(movRes.data.movements ?? []);
      setNodes(nodesRes.data.nodes ?? []);
      setBalances(balRes.data.balances ?? []);
      setEntryOpen(false);
      setEditingMovementId(null);

    } catch {
      setError('Kaydetme basarisiz.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewItem = async () => {
    if (!organizationId) return;
    if (!activeWarehouseTypeId) {
      setError('Depo tipi secili degil.');
      return;
    }
    const code = newItemCode.trim();
    const name = newItemName.trim();
    if (!code || !name || !newItemUnitId) return;

    setLoading(true);
    setError('');
    try {
      if (itemFormMode === 'create') {
        const res = await api.post(`/api/organizations/${organizationId}/items`, {
          warehouse_type_id: activeWarehouseTypeId,
          code,
          name,
          unit_id: newItemUnitId,
          active: newItemActive
        });
        const created: ItemRow = res.data.item;
        await reloadItems();
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
        const res = await api.put(`/api/organizations/${organizationId}/items/${editingItemId}`, {
          code,
          name,
          unit_id: newItemUnitId,
          active: newItemActive
        });
        const updated: ItemRow = res.data.item;
        await reloadItems();
        setItemDialogOpen(false);
      }
      setNewItemCode('');
      setNewItemName('');
    } catch {
      setError('Urun/Malzeme eklenemedi (kod benzersiz olmali).');
    } finally {
      setLoading(false);
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
          aria-label="Duzelt"
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
              message: 'Bu stok hareketini silmek istiyor musun?',
              header: 'Silme Onayi',
              icon: 'pi pi-exclamation-triangle',
              acceptClassName: 'p-button-danger p-button-sm',
              acceptLabel: 'Sil',
              rejectLabel: 'Vazgec',
              accept: async () => {
                setLoading(true);
                setError('');
                try {
                  await api.delete(`/api/organizations/${organizationId}/inventory-movements/${row._sourceMovementId}`);
                  const [movRes, balRes] = await Promise.all([
                    api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`),
                    api.get(`/api/organizations/${organizationId}/inventory-balances`)
                  ]);
                  setMovements(movRes.data.movements ?? []);
                  setBalances(balRes.data.balances ?? []);
                } catch {
                  setError('Silme basarisiz.');
                } finally {
                  setLoading(false);
                }
              }
            });
          }}
          aria-label="Sil"
        />
      </div>
    );
  };

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadı. Lütfen tekrar giriş yap." className="w-full" />;
  }

  const tabItems: MenuItem[] = warehouseTypes.map((wt) => ({
    label: wt.name,
    icon: 'pi pi-box',
    command: () => setActiveWarehouseTypeId(wt.id)
  }));

  const activeIndex = Math.max(0, warehouseTypes.findIndex((t) => t.id === activeWarehouseTypeId));
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
        content="Bu stok hareketi hangi belge/isten kaynaklandi? Ornek: PO (Satin Alma), WO (Is Emri), SO (Satis), INV (Fatura)."
      />

      <div className="rounded-xl border border-slate-200 bg-white px-2 py-2">
        <TabMenu model={tabItems} activeIndex={activeIndex} className="p-component-sm" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          label={`Malzemeler (${activeWarehouseTypeName})`}
          icon="pi pi-list"
          size="small"
          outlined
          onClick={() => setItemsListOpen(true)}
          disabled={!activeWarehouseTypeId}
        />
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search text-slate-400" />
          <InputText
            value={movementSearch}
            onChange={(e) => {
              const v = e.target.value;
              setMovementSearch(v);
              setMovementFilters((prev) => ({ ...prev, global: { ...prev.global, value: v } }));
            }}
            placeholder="Ara: kod, urun, depo..."
            className="w-72"
          />
        </IconField>
        <Button label="Yeni Hareket" icon="pi pi-plus" size="small" onClick={openEntry} disabled={!canCreateMovement} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="p-3">
          <DataTable
            value={displayMovements}
            loading={loading}
            size="small"
            emptyMessage="Hareket yok."
            removableSort
            sortMode="multiple"
            sortField="occurred_at"
            sortOrder={-1}
            filters={movementFilters}
            onFilter={(e) => setMovementFilters(e.filters)}
            globalFilterFields={['from_label', 'to_label', 'item_code', 'item_name', 'uom']}
            dataKey="row_key"
          >
            <Column field="item_code" header="Kod" sortable filter filterPlaceholder="Ara" />
            <Column field="item_name" header="Urun" sortable filter filterPlaceholder="Ara" />
            <Column field="from_label" header="Nereden" sortable filter filterPlaceholder="Ara" />
            <Column field="to_label" header="Nereye" sortable filter filterPlaceholder="Ara" />
            <Column field="quantity" header="Miktar" sortable style={{ width: '8rem' }} />
            <Column field="uom" header="Birim" sortable filter filterPlaceholder="Ara"/>
            <Column header="Tarih" body={occurredAtBody} sortField="occurred_at" sortable/>
            <Column header="" body={actionsBody} />
          </DataTable>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Stok Bilgisi</span>
            <Dropdown
              value={selectedBalanceWarehouseId}
              onChange={(e) => setSelectedBalanceWarehouseId(e.value ?? null)}
              options={balanceWarehouseOptions}
              className="w-72"
              placeholder="Depo sec"
              filter
              disabled={balanceWarehouseOptions.length === 0}
            />
          </div>
          <DataTable value={balancesForType} size="small" emptyMessage="Bakiye yok." paginator rows={12}>
            <Column field="item_code" header="Kod" sortable />
            <Column field="item_name" header="Urun" sortable />
            <Column field="balance_qty" header="Bakiye" sortable/>
            <Column field="unit_code" header="Birim" sortable />
          </DataTable>
        </div>
      </div>

      <Dialog
        header={editingMovementId ? 'Stok Hareketi Duzelt' : 'Yeni Stok Hareketi'}
        visible={entryOpen}
        onHide={() => {
          setEntryOpen(false);
          setEditingMovementId(null);
        }}
        className="w-full max-w-2xl"
      >
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Tarih</span>
            <Calendar value={occurredAt} onChange={(e) => setOccurredAt(e.value ?? new Date())} showTime className="w-full" />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">From Node</span>
              <Dropdown
                value={fromNodeId}
                onChange={(e) => setFromNodeId(e.value ?? null)}
                options={groupedNodeOptions}
                optionGroupLabel="label"
                optionGroupChildren="items"
                className="w-full inventory-node-dropdown"
                filter
                placeholder="Kaynak node sec"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">To Node</span>
              <Dropdown
                value={toNodeId}
                onChange={(e) => setToNodeId(e.value ?? null)}
                options={groupedNodeOptions}
                optionGroupLabel="label"
                optionGroupChildren="items"
                className="w-full inventory-node-dropdown"
                filter
                placeholder="Hedef node sec"
              />
            </label>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">Hareket Satirlari</span>
              <div className="flex items-center gap-2">
                <Button label="Yeni Item" icon="pi pi-plus" size="small" outlined onClick={openCreateItem} />
                <Button label="Satir Ekle" icon="pi pi-plus" size="small" onClick={addLine} />
              </div>
            </div>
            {eventLines.map((line) => {
              const unitCode = line.unit_id ? unitCodeById.get(line.unit_id) ?? '-' : '-';
              return (
                <div key={line.id} className="grid gap-2 rounded-lg border border-slate-200 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_7rem_auto]">
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
                    placeholder="Urun/Malzeme"
                  />
                  <InputNumber
                    value={line.quantity}
                    onValueChange={(e) => updateLine(line.id, { quantity: e.value ?? null })}
                    className="w-fit min-w-0"
                    min={0}
                    placeholder="Miktar"
                  />
                  <InputText value={unitCode} readOnly className="w-fit min-w-0" />
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
              Referans
              <i
                id="inventory-ref-info"
                className="pi pi-info-circle cursor-help text-xs text-slate-400 hover:text-slate-700"
                aria-label="Referans aciklamasi"
                tabIndex={0}
              />
            </span>
            <InputText value={referenceType} onChange={(e) => setReferenceType(e.target.value)} placeholder="PO, WO, ..." className="w-full" />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Vazgec" size="small" text onClick={() => setEntryOpen(false)} />
            <Button
              label="Kaydet"
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

      <Dialog
        header={itemFormMode === 'edit' ? 'Item Duzenle' : 'Yeni Item'}
        visible={itemDialogOpen}
        onHide={() => setItemDialogOpen(false)}
        className="w-full max-w-lg"
      >
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Depo tipi</span>
            <InputText
              value={activeWarehouseTypeName}
              readOnly
              className="w-full"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Code</span>
            <InputText value={newItemCode} onChange={(e) => setNewItemCode(e.target.value)} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <InputText value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Birim</span>
            <Dropdown
              value={newItemUnitId}
              onChange={(e) => setNewItemUnitId(e.value ?? null)}
              options={unitOptions}
              optionLabel="label"
              optionValue="value"
              className="w-full"
              placeholder="Birim sec"
            />
          </label>

          <label className="flex items-center gap-2">
            <Checkbox
              inputId="item_active"
              checked={newItemActive}
              onChange={(e) => setNewItemActive(Boolean(e.checked))}
            />
            <span className="text-sm text-slate-700">Aktif</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Vazgec" size="small" text onClick={() => setItemDialogOpen(false)} />
            <Button
              label="Kaydet"
              size="small"
              onClick={submitNewItem}
              loading={loading}
              disabled={!activeWarehouseTypeId || !newItemCode.trim() || !newItemName.trim() || !newItemUnitId}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={`Malzemeler (${activeWarehouseTypeName})`}
        visible={itemsListOpen}
        onHide={() => setItemsListOpen(false)}
        className="w-full max-w-4xl"
        contentStyle={{ minHeight: '50vh' }}
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search text-slate-400" />
              <InputText
                value={itemsSearch}
                onChange={(e) => setItemsSearch(e.target.value)}
                placeholder="Ara: kod veya isim"
                className="w-72"
              />
            </IconField>
            <Button label="Yeni Item" icon="pi pi-plus" size="small" onClick={openCreateItem} disabled={!activeWarehouseTypeId} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <DataTable
              value={itemsList}
              size="small"
              emptyMessage="Item yok."
              removableSort
              sortMode="multiple"
            >
              <Column field="code" header="Kod" sortable style={{ width: '10rem' }} />
              <Column field="name" header="Isim" sortable />
              <Column
                header="Birim"
                body={(row: ItemRow) => (
                  <span className="text-sm text-slate-700">
                    {row.unit_id ? unitCodeById.get(row.unit_id) ?? '-' : '-'}
                  </span>
                )}
                sortField="unit_id"
                style={{ width: '7rem' }}
              />
              <Column
                header="Aktif"
                body={(row: ItemRow) => <span className="text-sm text-slate-700">{row.active ? 'Evet' : 'Hayir'}</span>}
                sortField="active"
                sortable
                style={{ width: '6rem' }}
              />
              <Column
                header=""
                body={(row: ItemRow) => (
                  <div className="flex items-center justify-end gap-1">
                    <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEditItem(row)} aria-label="Duzenle" />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      text
                      rounded
                      severity="danger"
                      onClick={() => {
                        if (!organizationId) return;
                        confirmDialog({
                          message: 'Bu item silinsin mi? (Pasife alinacak)',
                          header: 'Silme Onayi',
                          icon: 'pi pi-exclamation-triangle',
                          acceptClassName: 'p-button-danger p-button-sm',
                          acceptLabel: 'Sil',
                          rejectLabel: 'Vazgec',
                          accept: async () => {
                            setLoading(true);
                            setError('');
                            try {
                              await api.delete(`/api/organizations/${organizationId}/items/${row.id}`);
                              await reloadItems();
                            } catch {
                              setError('Silme basarisiz.');
                            } finally {
                              setLoading(false);
                            }
                          }
                        });
                      }}
                      aria-label="Sil"
                    />
                  </div>
                )}
                style={{ width: '7rem' }}
              />
            </DataTable>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
