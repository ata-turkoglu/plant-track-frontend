import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as echarts from 'echarts';
import moment from 'moment';
import { Card } from 'primereact/card';

import type { AppDispatch, RootState } from '../store';
import { fetchHealthStatus } from '../store/dashboardSlice';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector((s: RootState) => s.dashboard.healthStatus);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const lastUpdated = useMemo(() => moment().format('DD.MM.YYYY HH:mm'), []);

  useEffect(() => {
    let chart: echarts.ECharts | undefined;

    if (chartRef.current) {
      chart = echarts.init(chartRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
        yAxis: { type: 'value' },
        series: [
          {
            name: 'Humidity %',
            type: 'line',
            smooth: true,
            data: [52, 49, 58, 55, 61, 59, 63],
            areaStyle: {}
          }
        ]
      });
    }

    const onResize = () => chart?.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart?.dispose();
    };
  }, []);

  useEffect(() => {
    dispatch(fetchHealthStatus());
  }, [dispatch]);

  return (
    <div className="grid gap-4">
      <Card className="p-component-sm">
        <div className="flex items-center justify-end">
          <span className="text-xs text-slate-500">Last update: {lastUpdated}</span>
        </div>
      </Card>

      <Card className="p-component-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Weekly Humidity</h2>
          <span className="text-xs text-slate-600">API: {status}</span>
        </div>
        <div ref={chartRef} className="h-80 w-full" />
      </Card>
    </div>
  );
}
