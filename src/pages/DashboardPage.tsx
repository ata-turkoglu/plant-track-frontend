import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';

import StockBar3DChart from '../components/dashboard/StockBar3DChart';
import type { AppDispatch, RootState } from '../store';
import { fetchProductionDailyStock, fetchRawMaterialDailyStock } from '../store/dashboardSlice';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { productionDailyStock, rawMaterialDailyStock, productionLoading, rawMaterialLoading, error } = useSelector(
    (s: RootState) => s.dashboard
  );

  const lastUpdated = useMemo(() => moment().format('DD.MM.YYYY HH:mm'), []);
  const latestTotal = productionDailyStock.totals[productionDailyStock.totals.length - 1] ?? 0;
  const latestRawTotal = rawMaterialDailyStock.totals[rawMaterialDailyStock.totals.length - 1] ?? 0;

  useEffect(() => {
    if (organizationId) {
      dispatch(fetchProductionDailyStock(organizationId));
      dispatch(fetchRawMaterialDailyStock(organizationId));
    }
  }, [dispatch, organizationId]);

  return (
    <div className="grid gap-4">
      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-component-sm">
          <div className="mb-3 text-sm font-semibold text-slate-900">Hammadde Stoku</div>
          <StockBar3DChart data={rawMaterialDailyStock} loading={rawMaterialLoading} />
        </Card>

        <Card className="p-component-sm">
          <div className="mb-3 text-sm font-semibold text-slate-900">Üretim Stoku</div>
          <StockBar3DChart data={productionDailyStock} loading={productionLoading} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-component-sm">
          <div className="grid gap-2 text-sm text-slate-700">
            <div className="font-medium text-slate-900">Hammadde Stok Ozeti</div>
            <div>Guncel toplam stok: {latestRawTotal.toLocaleString('tr-TR')}</div>
            <div>Depo tipi filtre: raw / hammadde</div>
            <div>Ürün filtre: sadece `items.type = RAW_MATERIAL`</div>
            <div>Periyot: son 7 gun (gun sonu bakiye)</div>
          </div>
        </Card>
        <Card className="p-component-sm">
          <div className="grid gap-2 text-sm text-slate-700">
            <div className="font-medium text-slate-900">Üretim Stok Ozeti</div>
            <div>Guncel toplam stok: {latestTotal.toLocaleString('tr-TR')}</div>
            <div>Depo tipi filtre: production / üretim / finished / mamul</div>
            <div>Ürün filtre: sadece `items.type = FINISHED_GOOD`</div>
            <div>Periyot: son 7 gun (gun sonu bakiye)</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
