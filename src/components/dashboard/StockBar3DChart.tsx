import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import 'echarts-gl';
import moment from 'moment';

type ItemSeries = {
  name: string;
  data: number[];
};

type DailyStock = {
  labels: string[];
  totals: number[];
  itemSeries: ItemSeries[];
};

type StockBar3DChartProps = {
  data: DailyStock;
  loading: boolean;
};

export default function StockBar3DChart({ data, loading }: StockBar3DChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const hasData = useMemo(() => data.labels.length > 0, [data.labels.length]);

  useEffect(() => {
    if (!chartRef.current || !hasData) return;

    const chart = echarts.init(chartRef.current);
    const xLabels = data.labels.map((label) => {
      const parsed = moment(label, [moment.ISO_8601, 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD.MM', 'YYYY/MM/DD'], true);
      return parsed.isValid() ? parsed.format('DD.MM') : String(label);
    });
    const yLabels = [...data.itemSeries.map((item) => item.name), 'Toplam'];
    const totalYIndex = yLabels.length - 1;
    const bar3dData: Array<[number, number, number]> = [];

    data.itemSeries.forEach((item, itemIndex) => {
      item.data.forEach((value, xIndex) => {
        bar3dData.push([xIndex, itemIndex, Number(value) || 0]);
      });
    });

    data.totals.forEach((value, xIndex) => {
      bar3dData.push([xIndex, totalYIndex, Number(value) || 0]);
    });

    const maxValue = bar3dData.reduce((acc, [, , value]) => Math.max(acc, value), 0);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params: { value: [number, number, number] }) => {
          const [x, y, v] = params.value;
          return `${xLabels[x]}<br/>${yLabels[y]}: ${v.toLocaleString('tr-TR')}`;
        }
      },
      visualMap: {
        max: maxValue || 1,
        calculable: true,
        realtime: false,
        inRange: {
          color: ['#313695', '#74add1', '#e0f3f8', '#fee090', '#fdae61']
        },
        textStyle: { color: '#64748b', fontSize: 11 }
      },
      xAxis3D: {
        type: 'category',
        data: xLabels
      },
      yAxis3D: {
        type: 'category',
        data: yLabels
      },
      zAxis3D: {
        type: 'value',
        name: 'Ton (t)'
      },
      grid3D: {
        boxWidth: 140,
        boxDepth: 90,
        light: {
          main: { intensity: 1.1, shadow: true },
          ambient: { intensity: 0.45 }
        },
        viewControl: {
          projection: 'perspective',
          alpha: 25,
          beta: 35
        }
      },
      series: [
        {
          name: 'Punch Card',
          type: 'bar3D',
          data: bar3dData,
          shading: 'lambert',
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              formatter: (params: { value: [number, number, number] }) => `${params.value[2].toLocaleString('tr-TR')}`
            }
          }
        }
      ]
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [data, hasData]);

  if (!hasData) {
    return (
      <div className="flex h-80 items-center justify-center text-xs text-slate-500">
        {loading ? 'Yükleniyor...' : 'Grafik için veri bulunamadı.'}
      </div>
    );
  }

  return <div ref={chartRef} className="h-80 w-full" />;
}
