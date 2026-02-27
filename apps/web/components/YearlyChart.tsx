'use client';

import ReactECharts from 'echarts-for-react';

const round1 = (v: number | null) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(1)) : null);

const format1 = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—';

export const YearlyChart = ({
  yearly,
  ariaLabel,
  tableId,
}: {
  yearly: Array<{ year: number; avgTminC: number | null; avgTmaxC: number | null }>;
  ariaLabel?: string;
  tableId?: string;
}) => {
  const years = yearly.map((entry) => entry.year);
  const tmin = yearly.map((entry) => round1(entry.avgTminC));
  const tmax = yearly.map((entry) => round1(entry.avgTmaxC));

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Diagramm: Jahresmittelwerte für Tmin und Tmax'}
      aria-describedby={tableId}
    >
      <ReactECharts
        option={{
          tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
              const items = Array.isArray(params) ? params : [params];
              const header = items?.[0]?.axisValueLabel ?? items?.[0]?.axisValue ?? '';
              const lines = items.map((p: any) => {
                const value = p?.data;
                const marker = p?.marker ?? '';
                return `${marker}${p?.seriesName ?? ''}: ${format1(value)} °C`;
              });
              return [header, ...lines].join('<br/>');
            },
          },
          legend: {
            data: ['Tmin', 'Tmax'],
            textStyle: { color: '#e2e8f0' },
          },
          xAxis: { type: 'category', data: years, axisLabel: { color: '#cbd5f5' } },
          yAxis: {
            type: 'value',
            axisLabel: {
              color: '#cbd5f5',
              formatter: (value: number) => Number(value).toFixed(1),
            },
          },
          series: [
            {
              name: 'Tmin',
              type: 'line',
              data: tmin,
              smooth: true,
              symbol: 'circle',
              symbolSize: 8,
              lineStyle: { type: 'dashed', width: 2 },
              itemStyle: { color: '#60a5fa' },
            },
            {
              name: 'Tmax',
              type: 'line',
              data: tmax,
              smooth: true,
              symbol: 'triangle',
              symbolSize: 9,
              lineStyle: { type: 'solid', width: 2 },
              itemStyle: { color: '#ef4444' },
            },
          ],
        }}
        style={{ height: 360 }}
      />
    </div>
  );
};