import { useEffect, useMemo, useState } from 'react';
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
import type { MenuItem } from 'primereact/menuitem';

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

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseTypeRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeWarehouseTypeId, setActiveWarehouseTypeId] = useState<number | null>(null);

  const [entryOpen, setEntryOpen] = useState(false);

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
  const [newItemType, setNewItemType] = useState('RAW_MATERIAL');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnitId, setNewItemUnitId] = useState<number | null>(null);

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

        if (types.length > 0) {
          setActiveWarehouseTypeId((prev) => (prev === null ? types[0].id : prev));
        }
      })
      .catch(() => setError('Veriler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [organizationId]);

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
        .map((i) => ({ label: `${i.code} - ${i.name}`, value: i.id, uom: i.uom })),
    [items]
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
    setMovementType('IN');
    setWarehouseId(warehouseOptions[0]?.value ?? null);
    setItemId(itemOptions[0]?.value ?? null);
    const firstItem = itemOptions[0];
    setUom(firstItem?.uom ?? 'adet');
    setQuantity(null);
    setOccurredAt(new Date());
    setReferenceType('');
    setReferenceId('');
    setNote('');
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
      const res = await api.post(`/api/organizations/${organizationId}/inventory-movements`, {
        warehouse_id: warehouseId,
        item_id: itemId,
        movement_type: movementType,
        quantity,
        uom,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        note: note || null,
        occurred_at: occurredAt.toISOString()
      });

      const created = res.data.movement as MovementRow;
      // Reload list to include joins (item/warehouse names)
      const movRes = await api.get(`/api/organizations/${organizationId}/inventory-movements?limit=200`);
      setMovements(movRes.data.movements ?? []);
      setEntryOpen(false);

      // Keep UI responsive even if list reload fails
      if (!created) return;
    } catch {
      setError('Kaydetme basarisiz.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewItem = async () => {
    if (!organizationId) return;
    const code = newItemCode.trim();
    const name = newItemName.trim();
    const type = newItemType.trim();
    if (!code || !name || !type || !newItemUnitId) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/api/organizations/${organizationId}/items`, {
        type,
        code,
        name,
        unit_id: newItemUnitId,
        active: true
      });
      const created: ItemRow = res.data.item;
      setItems((prev) => [...prev, created]);
      setItemId(created.id);
      setUom(created.uom);
      setItemDialogOpen(false);
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

  if (!organizationId) {
    return <Message severity="warn" text="Organization bulunamadı. Lütfen tekrar giriş yap." className="w-full" />;
  }

  const tabItems: MenuItem[] = [
    {
      label: 'Tum',
      icon: 'pi pi-list',
      command: () => setActiveWarehouseTypeId(null)
    },
    ...warehouseTypes.map((wt) => ({
      label: wt.name,
      icon: 'pi pi-box',
      command: () => setActiveWarehouseTypeId(wt.id)
    }))
  ];

  const activeIndex =
    activeWarehouseTypeId === null
      ? 0
      : 1 + Math.max(0, warehouseTypes.findIndex((t) => t.id === activeWarehouseTypeId));

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Stok Hareketleri</h1>
          <p className="mt-1 text-sm text-slate-600">
            {activeWarehouseTypeId
              ? `Depo tipi: ${warehouseTypeNameById.get(activeWarehouseTypeId) ?? '-'}`
              : 'Tum depo tipleri'}
          </p>
        </div>
        <Button label="Yeni Hareket" icon="pi pi-plus" size="small" onClick={openEntry} />
      </div>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-2 py-2">
          <TabMenu model={tabItems} activeIndex={activeIndex} className="p-component-sm" />
        </div>
        <div className="p-3">
          <DataTable value={filteredMovements} loading={loading} size="small" stripedRows emptyMessage="Hareket yok.">
            <Column field="movement_type" header="Tip" style={{ width: '8rem' }} />
            <Column field="item_code" header="Kod" style={{ width: '10rem' }} />
            <Column field="item_name" header="Urun" />
            <Column field="warehouse_name" header="Depo" style={{ width: '12rem' }} />
            <Column field="quantity" header="Miktar" style={{ width: '8rem' }} />
            <Column field="uom" header="Birim" style={{ width: '6rem' }} />
            <Column header="Tarih" body={occurredAtBody} style={{ width: '13rem' }} />
          </DataTable>
        </div>
      </div>

      <Dialog header="Yeni Stok Hareketi" visible={entryOpen} onHide={() => setEntryOpen(false)} className="w-full max-w-2xl">
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
              <Button label="Yeni Item" icon="pi pi-plus" size="small" outlined onClick={() => setItemDialogOpen(true)} />
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
              <span className="text-sm font-medium text-slate-700">Referans</span>
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

      <Dialog header="Yeni Item" visible={itemDialogOpen} onHide={() => setItemDialogOpen(false)} className="w-full max-w-lg">
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <InputText value={newItemType} onChange={(e) => setNewItemType(e.target.value)} className="w-full" />
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button label="Vazgec" size="small" text onClick={() => setItemDialogOpen(false)} />
            <Button
              label="Kaydet"
              size="small"
              onClick={submitNewItem}
              loading={loading}
              disabled={!newItemType.trim() || !newItemCode.trim() || !newItemName.trim() || !newItemUnitId}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
