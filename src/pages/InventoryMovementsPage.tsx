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
  uom: string;
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

type MovementRow = {
  id: number;
  organization_id: number;
  warehouse_id: number;
  location_id: number | null;
  item_id: number;
  movement_type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: string | number;
  uom: string;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  occurred_at: string;
  item_code?: string;
  item_name?: string;
  warehouse_name?: string;
  location_name?: string;
};

export default function InventoryMovementsPage() {
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const refTooltip = useRef<Tooltip>(null);

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseTypeRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeWarehouseTypeId, setActiveWarehouseTypeId] = useState<number | null>(null);

  const [entryOpen, setEntryOpen] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<number | null>(null);

  const [movementType, setMovementType] = useState<MovementRow['movement_type']>('IN');
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [itemId, setItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [uom, setUom] = useState('');
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [note, setNote] = useState('');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnitId, setNewItemUnitId] = useState<number | null>(null);
  const [newItemActive, setNewItemActive] = useState(true);
  const [itemFormMode, setItemFormMode] = useState<'create' | 'edit'>('create');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [itemsListOpen, setItemsListOpen] = useState(false);
  const [itemsSearch, setItemsSearch] = useState('');

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError('');

    Promise.all([
      api.get(`/api/organizations/${organizationId}/units`),
      api.get(`/api/organizations/${organizationId}/items`),
      api.get(`/api/organizations/${organizationId}/warehouse-types`),
      api.get(`/api/organizations/${organizationId}/warehouses`),
      api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`)
    ])
      .then(([unitsRes, itemsRes, wtRes, whRes, movRes]) => {
        setUnits(unitsRes.data.units ?? []);
        setItems(itemsRes.data.items ?? []);
        const types: WarehouseTypeRow[] = wtRes.data.warehouse_types ?? [];
        setWarehouseTypes(types);
        setWarehouses(whRes.data.warehouses ?? []);
        setMovements(movRes.data.movements ?? []);

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

  const warehouseOptions = useMemo(
    () => warehousesByType.map((w) => ({ label: w.name, value: w.id })),
    [warehousesByType]
  );

  const warehouseTypeByWarehouseId = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of warehouses) map.set(w.id, w.warehouse_type_id);
    return map;
  }, [warehouses]);

  const filteredMovements = useMemo(() => {
    if (activeWarehouseTypeId === null) return movements;
    return movements.filter((m) => warehouseTypeByWarehouseId.get(m.warehouse_id) === activeWarehouseTypeId);
  }, [movements, activeWarehouseTypeId, warehouseTypeByWarehouseId]);

  const itemOptions = useMemo(
    () =>
      items
        .filter((i) => i.active)
        .filter((i) => (activeWarehouseTypeId ? i.warehouse_type_id === activeWarehouseTypeId : true))
        .map((i) => ({ label: `${i.code} - ${i.name}`, value: i.id, uom: i.uom })),
    [items, activeWarehouseTypeId]
  );

  const unitOptions = useMemo(
    () =>
      units
        .filter((u) => u.active)
        .map((u) => ({ label: u.symbol ? `${u.name} (${u.symbol})` : u.name, value: u.id, code: u.code })),
    [units]
  );

  const movementTypeOptions = useMemo(
    () => [
      { label: 'Giris (IN)', value: 'IN' as const },
      { label: 'Cikis (OUT)', value: 'OUT' as const },
      { label: 'Transfer', value: 'TRANSFER' as const },
      { label: 'Duzeltme', value: 'ADJUSTMENT' as const }
    ],
    []
  );

  const openEntry = () => {
    setEditingMovementId(null);
    setMovementType('IN');
    setWarehouseId(warehouseOptions[0]?.value ?? null);
    const firstItem = itemOptions[0];
    setItemId(firstItem?.value ?? null);
    setUom(firstItem?.uom ?? '');
    setQuantity(null);
    setOccurredAt(new Date());
    setReferenceType('');
    setReferenceId('');
    setNote('');
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
    const unitIdFromUom =
      row.uom && units.length > 0
        ? units.find((u) => u.organization_id === row.organization_id && u.code.toLowerCase() === row.uom.toLowerCase())?.id ??
          null
        : null;
    // Prefer mapping from uom if unit_id is missing or inconsistent (older data may have defaulted to 'adet').
    setNewItemUnitId(unitIdFromUom ?? row.unit_id ?? null);
    setNewItemActive(row.active);
    setItemDialogOpen(true);
  };

  const openEdit = (row: MovementRow) => {
    setEditingMovementId(row.id);
    setMovementType(row.movement_type);
    setWarehouseId(row.warehouse_id);
    setItemId(row.item_id);
    setQuantity(Number(row.quantity));
    setUom(row.uom ?? '');
    setOccurredAt(row.occurred_at ? new Date(row.occurred_at) : new Date());
    setReferenceType(row.reference_type ?? '');
    setReferenceId(row.reference_id ?? '');
    setNote(row.note ?? '');
    setEntryOpen(true);
  };

  useEffect(() => {
    const selected = itemOptions.find((o) => o.value === itemId);
    if (selected?.uom) setUom(selected.uom);
  }, [itemId, itemOptions]);

  const submitEntry = async () => {
    if (!organizationId || !warehouseId || !itemId || !quantity || !uom.trim()) return;

    setLoading(true);
    setError('');
    try {
      const payload = {
        warehouse_id: warehouseId,
        item_id: itemId,
        movement_type: movementType,
        quantity,
        uom,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        note: note || null,
        occurred_at: occurredAt.toISOString()
      };

      if (editingMovementId) {
        await api.put(`/api/organizations/${organizationId}/inventory-movements/${editingMovementId}`, payload);
      } else {
        await api.post(`/api/organizations/${organizationId}/inventory-movements`, payload);
      }

      // Reload list to include joins (item/warehouse names)
      const movRes = await api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`);
      setMovements(movRes.data.movements ?? []);
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
        setItemId(created.id);
        setUom(created.uom);
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
        if (itemId === updated.id) setUom(updated.uom);
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

  const actionsBody = (row: MovementRow) => {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button icon="pi pi-pencil" size="small" text rounded onClick={() => openEdit(row)} aria-label="Duzelt" />
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
                  await api.delete(`/api/organizations/${organizationId}/inventory-movements/${row.id}`);
                  const movRes = await api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`);
                  setMovements(movRes.data.movements ?? []);
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

  const movementTypeBody = (row: MovementRow) => {
    const iconSrc =
      row.movement_type === 'IN'
        ? '/icons/warehouse_in.svg'
        : row.movement_type === 'OUT'
          ? '/icons/warehouse_out.svg'
          : null;

    return (
      <span className="flex items-center gap-2">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={row.movement_type === 'IN' ? 'Giris' : 'Cikis'}
            className="h-8 w-8 opacity-95 border border-slate-200"
            title={row.movement_type === 'IN' ? 'Giris' : 'Cikis'}
          />
        ) : (
          <span className="text-sm text-slate-700">
            {row.movement_type === 'TRANSFER' ? 'TRANSFER' : row.movement_type === 'ADJUSTMENT' ? 'ADJUSTMENT' : row.movement_type}
          </span>
        )}
      </span>
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
  const canCreateMovement = activeWarehouseTypeId !== null && warehouseOptions.length > 0;

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
        <Button label="Yeni Hareket" icon="pi pi-plus" size="small" onClick={openEntry} disabled={!canCreateMovement} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="p-3">
          <DataTable
            value={filteredMovements}
            loading={loading}
            size="small"
            stripedRows
            emptyMessage="Hareket yok."
            rowClassName={(row: MovementRow) =>
              row.movement_type === 'IN' ? 'inventory-row-in' : row.movement_type === 'OUT' ? 'inventory-row-out' : ''
            }
          >
            <Column header="Tip" body={movementTypeBody} style={{ width: '10rem' }} />
            <Column field="item_code" header="Kod" style={{ width: '10rem' }} />
            <Column field="item_name" header="Urun" />
            <Column field="warehouse_name" header="Depo" style={{ width: '12rem' }} />
            <Column field="quantity" header="Miktar" style={{ width: '8rem' }} />
            <Column field="uom" header="Birim" style={{ width: '6rem' }} />
            <Column header="Tarih" body={occurredAtBody} style={{ width: '13rem' }} />
            <Column header="" body={actionsBody} style={{ width: '7rem' }} />
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
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Tip</span>
              <Dropdown value={movementType} onChange={(e) => setMovementType(e.value)} options={movementTypeOptions} className="w-full" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Tarih</span>
              <Calendar value={occurredAt} onChange={(e) => setOccurredAt(e.value ?? new Date())} showTime className="w-full" />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Depo</span>
            <Dropdown value={warehouseId} onChange={(e) => setWarehouseId(e.value ?? null)} options={warehouseOptions} className="w-full" filter />
          </label>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Urun/Malzeme</span>
              <Dropdown value={itemId} onChange={(e) => setItemId(e.value ?? null)} options={itemOptions} className="w-full" filter />
            </label>
            <div className="flex items-end">
              <Button label="Yeni Item" icon="pi pi-plus" size="small" outlined onClick={openCreateItem} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Miktar</span>
              <InputNumber value={quantity} onValueChange={(e) => setQuantity(e.value ?? null)} className="w-full" min={0} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Birim</span>
              <InputText value={uom} readOnly className="w-full" />
            </label>
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
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Referans ID</span>
            <InputText value={referenceId} onChange={(e) => setReferenceId(e.target.value)} className="w-full" />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Not</span>
            <InputText value={note} onChange={(e) => setNote(e.target.value)} className="w-full" />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Vazgec" size="small" text onClick={() => setEntryOpen(false)} />
            <Button
              label="Kaydet"
              size="small"
              onClick={submitEntry}
              loading={loading}
              disabled={!warehouseId || !itemId || !quantity || !uom.trim()}
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
            <DataTable value={itemsList} size="small" stripedRows emptyMessage="Item yok.">
              <Column field="code" header="Kod" style={{ width: '10rem' }} />
              <Column field="name" header="Isim" />
              <Column field="uom" header="Birim" style={{ width: '7rem' }} />
              <Column
                header="Aktif"
                body={(row: ItemRow) => <span className="text-sm text-slate-700">{row.active ? 'Evet' : 'Hayir'}</span>}
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
