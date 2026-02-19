import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card } from 'primereact/card';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';

import StockBar3DChart from '../components/dashboard/StockBar3DChart';
import { api } from '../services/api';
import type { AppDispatch, RootState } from '../store';
import { fetchProductionDailyStock, fetchRawMaterialDailyStock } from '../store/dashboardSlice';

function createDefaultWeekRange(): (Date | null)[] {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return [start, end];
}

type WarehouseTypeRow = {
  id: number;
  code: string;
  name: string;
};

type WarehouseRow = {
  id: number;
  warehouse_type_id: number;
  name: string;
};

const PRODUCTION_KEYWORDS = ['production', 'uretim', 'üretim', 'finished', 'mamul', 'product', 'finished_good'];
const RAW_MATERIAL_KEYWORDS = ['raw', 'raw_material', 'hammadde', 'ham madde'];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasAnyKeyword(haystack: string, keywords: string[]) {
  const normalized = normalizeText(haystack);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { productionDailyStock, rawMaterialDailyStock, productionLoading, rawMaterialLoading } = useSelector(
    (s: RootState) => s.dashboard
  );

  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseTypeRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [rawDateRange, setRawDateRange] = useState<(Date | null)[]>(() => createDefaultWeekRange());
  const [productionDateRange, setProductionDateRange] = useState<(Date | null)[]>(() => createDefaultWeekRange());
  const [selectedRawWarehouseIds, setSelectedRawWarehouseIds] = useState<number[]>([]);
  const [selectedProductionWarehouseIds, setSelectedProductionWarehouseIds] = useState<number[]>([]);
  const selectedRawStartDate = rawDateRange[0] ?? null;
  const selectedRawEndDate = rawDateRange[1] ?? null;
  const selectedProductionStartDate = productionDateRange[0] ?? null;
  const selectedProductionEndDate = productionDateRange[1] ?? null;

  useEffect(() => {
    if (!organizationId) {
      setWarehouseTypes([]);
      setWarehouses([]);
      return;
    }

    let active = true;
    Promise.all([
      api.get(`/api/organizations/${organizationId}/warehouse-types`),
      api.get(`/api/organizations/${organizationId}/warehouses`)
    ])
      .then(([warehouseTypesRes, warehousesRes]) => {
        if (!active) return;
        setWarehouseTypes(warehouseTypesRes.data.warehouse_types ?? []);
        setWarehouses(warehousesRes.data.warehouses ?? []);
      })
      .catch(() => {
        if (!active) return;
        setWarehouseTypes([]);
        setWarehouses([]);
      });

    return () => {
      active = false;
    };
  }, [organizationId]);

  const productionTypeIds = useMemo(
    () =>
      new Set(
        warehouseTypes
          .filter((warehouseType) => hasAnyKeyword(`${warehouseType.code} ${warehouseType.name}`, PRODUCTION_KEYWORDS))
          .map((warehouseType) => warehouseType.id)
      ),
    [warehouseTypes]
  );

  const rawMaterialTypeIds = useMemo(
    () =>
      new Set(
        warehouseTypes
          .filter((warehouseType) => hasAnyKeyword(`${warehouseType.code} ${warehouseType.name}`, RAW_MATERIAL_KEYWORDS))
          .map((warehouseType) => warehouseType.id)
      ),
    [warehouseTypes]
  );

  const productionWarehouseOptions = useMemo(
    () =>
      warehouses
        .filter((warehouse) => productionTypeIds.has(warehouse.warehouse_type_id))
        .map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
    [warehouses, productionTypeIds]
  );

  const rawWarehouseOptions = useMemo(
    () =>
      warehouses
        .filter((warehouse) => rawMaterialTypeIds.has(warehouse.warehouse_type_id))
        .map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
    [warehouses, rawMaterialTypeIds]
  );

  useEffect(() => {
    const validIds = new Set(productionWarehouseOptions.map((option) => option.value));
    setSelectedProductionWarehouseIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [productionWarehouseOptions]);

  useEffect(() => {
    const validIds = new Set(rawWarehouseOptions.map((option) => option.value));
    setSelectedRawWarehouseIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [rawWarehouseOptions]);

  useEffect(() => {
    if (organizationId) {
      const startDate = selectedProductionStartDate ? new Date(selectedProductionStartDate).toISOString() : null;
      const endDate = selectedProductionEndDate ? new Date(selectedProductionEndDate).toISOString() : null;
      dispatch(
        fetchProductionDailyStock({
          organizationId,
          startDate,
          endDate,
          warehouseIds: selectedProductionWarehouseIds
        })
      );
    }
  }, [dispatch, organizationId, selectedProductionStartDate, selectedProductionEndDate, selectedProductionWarehouseIds]);

  useEffect(() => {
    if (organizationId) {
      const startDate = selectedRawStartDate ? new Date(selectedRawStartDate).toISOString() : null;
      const endDate = selectedRawEndDate ? new Date(selectedRawEndDate).toISOString() : null;
      dispatch(
        fetchRawMaterialDailyStock({
          organizationId,
          startDate,
          endDate,
          warehouseIds: selectedRawWarehouseIds
        })
      );
    }
  }, [dispatch, organizationId, selectedRawStartDate, selectedRawEndDate, selectedRawWarehouseIds]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-component-sm dashboard-chart-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">Hammadde Stoku (Ton)</div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <MultiSelect
                value={selectedRawWarehouseIds}
                onChange={(e) => setSelectedRawWarehouseIds(Array.isArray(e.value) ? e.value : [])}
                options={rawWarehouseOptions}
                optionLabel="label"
                optionValue="value"
                maxSelectedLabels={1}
                selectedItemsLabel="{0} depo"
                display="comma"
                className="dashboard-card-select p-inputtext-sm w-full sm:w-52"
                placeholder="Depo (Tümü)"
              />
              <Calendar
                value={rawDateRange}
                onChange={(e) => setRawDateRange(((e.value as (Date | null)[] | null) ?? [null, null]))}
                selectionMode="range"
                readOnlyInput
                showIcon
                dateFormat="dd.mm.yy"
                className="dashboard-card-date w-full sm:w-52"
                inputClassName="p-inputtext-sm"
                placeholder="Tarih aralığı seç"
              />
            </div>
          </div>
          <StockBar3DChart data={rawMaterialDailyStock} loading={rawMaterialLoading} />
        </Card>

        <Card className="p-component-sm dashboard-chart-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">Üretim Stoku (Ton)</div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <MultiSelect
                value={selectedProductionWarehouseIds}
                onChange={(e) => setSelectedProductionWarehouseIds(Array.isArray(e.value) ? e.value : [])}
                options={productionWarehouseOptions}
                optionLabel="label"
                optionValue="value"
                maxSelectedLabels={1}
                selectedItemsLabel="{0} depo"
                display="comma"
                className="dashboard-card-select p-inputtext-sm w-full sm:w-52"
                placeholder="Depo (Tümü)"
              />
              <Calendar
                value={productionDateRange}
                onChange={(e) => setProductionDateRange(((e.value as (Date | null)[] | null) ?? [null, null]))}
                selectionMode="range"
                readOnlyInput
                showIcon
                dateFormat="dd.mm.yy"
                className="dashboard-card-date w-full sm:w-52"
                inputClassName="p-inputtext-sm"
                placeholder="Tarih aralığı seç"
              />
            </div>
          </div>
          <StockBar3DChart data={productionDailyStock} loading={productionLoading} />
        </Card>
      </div>

      {/* <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-component-sm">
          <div className="grid gap-2 text-sm text-slate-700">
            <div className="font-medium text-slate-900">Hammadde Stok Ozeti</div>
            <div>Guncel toplam stok: {latestRawTotal.toLocaleString('tr-TR')}</div>
            <div>Depo tipi filtre: raw / hammadde</div>
            <div>Ürün filtre: sadece `items.warehouse_type_id` hammadde tipleri</div>
            <div>Periyot: son 7 gun (gun sonu bakiye)</div>
          </div>
        </Card>
        <Card className="p-component-sm">
          <div className="grid gap-2 text-sm text-slate-700">
            <div className="font-medium text-slate-900">Üretim Stok Ozeti</div>
            <div>Guncel toplam stok: {latestTotal.toLocaleString('tr-TR')}</div>
            <div>Depo tipi filtre: production / üretim / finished / mamul</div>
            <div>Ürün filtre: sadece `items.warehouse_type_id` üretim tipleri</div>
            <div>Periyot: son 7 gun (gun sonu bakiye)</div>
          </div>
        </Card>
      </div> */}
    </div>
  );
}
