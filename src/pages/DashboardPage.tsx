import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as echarts from 'echarts';
import moment from 'moment';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';

import type { AppDispatch, RootState } from '../store';
import { fetchHealthStatus, fetchProductionDailyStock } from '../store/dashboardSlice';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const organizationId = useSelector((s: RootState) => s.user.organizationId);
  const { healthStatus, productionDailyStock, productionLoading, error } = useSelector((s: RootState) => s.dashboard);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const lastUpdated = useMemo(() => moment().format('DD.MM.YYYY HH:mm'), []);
  const latestTotal = productionDailyStock.totals[productionDailyStock.totals.length - 1] ?? 0;

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    const series = [
      {
        name: 'Toplam',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color: '#94a3b8' },
        data: productionDailyStock.totals
      },
      ...productionDailyStock.itemSeries.map((item, index) => ({
        name: item.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        yAxisIndex: 1,
        lineStyle: { width: 2 },
        data: item.data,
        color: ['#64748b', '#475569', '#334155'][index % 3]
      }))
    ];

    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: {
        type: 'scroll',
        textStyle: { color: '#475569', fontSize: 11 }
      },
      grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: productionDailyStock.labels,
        axisLabel: { color: '#64748b' }
      },
      yAxis: [
        { type: 'value', axisLabel: { color: '#64748b' } },
        { type: 'value', axisLabel: { color: '#64748b' } }
      ],
      series
    });

    const onResize = () => chart?.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [productionDailyStock]);

  useEffect(() => {
    dispatch(fetchHealthStatus());
    if (organizationId) {
      dispatch(fetchProductionDailyStock(organizationId));
    }
  }, [dispatch, organizationId]);

  return (
    <div className="grid gap-4">
      <Card className="p-component-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-700">Uretim depolari / FINISHED_GOOD stok trendi</div>
          <span className="text-xs text-slate-500">Last update: {lastUpdated}</span>
        </div>
      </Card>

      {error ? <Message severity="error" text={error} className="w-full" /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-component-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">7 Gunluk Stok</h2>
            <span className="text-xs text-slate-600">API: {healthStatus}</span>
          </div>
          {productionDailyStock.labels.length > 0 ? (
            <div ref={chartRef} className="h-80 w-full" />
          ) : (
            <div className="flex h-80 items-center justify-center text-xs text-slate-500">
              {productionLoading ? 'Yukleniyor...' : 'Grafik icin veri bulunamadi.'}
            </div>
          )}
        </Card>

        <Card className="p-component-sm">
          <div className="grid gap-2 text-sm text-slate-700">
            <div className="font-medium text-slate-900">Uretim Stok Ozeti</div>
            <div>Guncel toplam stok: {latestTotal.toLocaleString('tr-TR')}</div>
            <div>Depo tipi filtre: production / uretim / finished / mamul</div>
            <div>Urun filtre: sadece `items.type = FINISHED_GOOD`</div>
            <div>Periyot: son 7 gun (gun sonu bakiye)</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
