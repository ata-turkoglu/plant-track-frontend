import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { Card } from 'primereact/card';
import { Calendar } from 'primereact/calendar';
import { Message } from 'primereact/message';

import StockBar3DChart from '../components/dashboard/StockBar3DChart';
import type { AppDispatch, RootState } from '../store';
import { fetchProductionDailyStock, fetchRawMaterialDailyStock } from '../store/dashboardSlice';

function createDefaultWeekRange(): (Date | null)[] {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return [start, end];
}

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { productionDailyStock, rawMaterialDailyStock, productionLoading, rawMaterialLoading, error } = useSelector(
    (s: RootState) => s.dashboard
  );

  const lastUpdated = useMemo(() => moment().format('DD.MM.YYYY HH:mm'), []);
  const [rawDateRange, setRawDateRange] = useState<(Date | null)[]>(() => createDefaultWeekRange());
  const [productionDateRange, setProductionDateRange] = useState<(Date | null)[]>(() => createDefaultWeekRange());
  const selectedRawStartDate = rawDateRange[0] ?? null;
  const selectedRawEndDate = rawDateRange[1] ?? null;
  const selectedProductionStartDate = productionDateRange[0] ?? null;
  const selectedProductionEndDate = productionDateRange[1] ?? null;
  const latestTotal = productionDailyStock.totals[productionDailyStock.totals.length - 1] ?? 0;
  const latestRawTotal = rawMaterialDailyStock.totals[rawMaterialDailyStock.totals.length - 1] ?? 0;

  useEffect(() => {
    if (organizationId) {
      const startDate = selectedProductionStartDate ? new Date(selectedProductionStartDate).toISOString() : null;
      const endDate = selectedProductionEndDate ? new Date(selectedProductionEndDate).toISOString() : null;
      dispatch(fetchProductionDailyStock({ organizationId, startDate, endDate }));
    }
  }, [dispatch, organizationId, selectedProductionStartDate, selectedProductionEndDate]);

  useEffect(() => {
    if (organizationId) {
      const startDate = selectedRawStartDate ? new Date(selectedRawStartDate).toISOString() : null;
      const endDate = selectedRawEndDate ? new Date(selectedRawEndDate).toISOString() : null;
      dispatch(fetchRawMaterialDailyStock({ organizationId, startDate, endDate }));
    }
  }, [dispatch, organizationId, selectedRawStartDate, selectedRawEndDate]);

  return (
    <div className="grid gap-4">
      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-component-sm dashboard-chart-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">Hammadde Stoku (Ton)</div>
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
          <StockBar3DChart data={rawMaterialDailyStock} loading={rawMaterialLoading} />
        </Card>

        <Card className="p-component-sm dashboard-chart-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900">Üretim Stoku (Ton)</div>
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
