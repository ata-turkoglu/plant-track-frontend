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
    // Keep low-average items at the front and high-average items at the back for better visibility.
    const sortedItemSeries = [...data.itemSeries].sort((a, b) => {
      const avgA = a.data.length ? a.data.reduce((sum, v) => sum + (Number(v) || 0), 0) / a.data.length : 0;
      const avgB = b.data.length ? b.data.reduce((sum, v) => sum + (Number(v) || 0), 0) / b.data.length : 0;
      return avgA - avgB;
    });

    const yLabels = [...sortedItemSeries.map((item) => item.name), 'Toplam'];
    const totalYIndex = yLabels.length - 1;
    const bar3dData: Array<[number, number, number]> = [];

    sortedItemSeries.forEach((item, itemIndex) => {
      item.data.forEach((value, xIndex) => {
        const qty = Number(value) || 0;
        if (qty <= 0) return;
        bar3dData.push([xIndex, itemIndex, qty]);
      });
    });

    data.totals.forEach((value, xIndex) => {
      const qty = Number(value) || 0;
      if (qty <= 0) return;
      bar3dData.push([xIndex, totalYIndex, qty]);
    });

    const maxValue = bar3dData.reduce((acc, [, , value]) => Math.max(acc, value), 0);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params: { value: [number, number, number] }) => {
          const [x, y, v] = params.value;
          return `${xLabels[x]}<br/>${yLabels[y]}: ${v.toLocaleString('tr-TR')} Ton (t)`;
        }
      },
      visualMap: {
        show: false,
        min: 1,
        max: Math.max(maxValue, 1),
        inRange: {
          color: ['#9ca3af', '#7aa2c8', '#5f9f95', '#c59a63', '#8b5e5e']
        },
        outOfRange: {
          color: ['#ffffff']
        }
      },
      xAxis3D: {
        type: 'category',
        data: xLabels,
        name: '',
        nameTextStyle: { color: 'transparent' },
        axisLabel: {
          margin: 18
        }
      },
      yAxis3D: {
        type: 'category',
        data: yLabels,
        name: '',
        nameTextStyle: { color: 'transparent' }
      },
      zAxis3D: {
        type: 'value',
        name: '',
        axisLabel: {
          margin: 24
        }
      },
      grid3D: {
        left: 12,
        right: 8,
        boxWidth: 140,
        boxDepth: 90,
        light: {
          main: { intensity: 1.1, shadow: true },
          ambient: { intensity: 0.45 }
        },
        viewControl: {
          projection: 'perspective',
          alpha: 25,
          beta: 35,
          distance: 240
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
              formatter: (params: { value: [number, number, number] }) => `${params.value[2].toLocaleString('tr-TR')} t`
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

  return <div ref={chartRef} className="h-96 w-full" />;
}
