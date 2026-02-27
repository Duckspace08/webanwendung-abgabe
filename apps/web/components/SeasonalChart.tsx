'use client';

import ReactECharts from 'echarts-for-react';

const round1 = (v: number | null) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(1)) : null);

const format1 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—');

export const SeasonalChart = ({
  seasonal,
  season,
  ariaLabel,
  tableId,
}: {
  seasonal: Array<{ year: number; season: string; avgTminC: number | null; avgTmaxC: number | null }>;
  season: string;
  ariaLabel?: string;
  tableId?: string;
}) => {
  const filtered = seasonal.filter((entry) => entry.season === season);
  const years = filtered.map((entry) => entry.year);

  const tmin = filtered.map((e) => round1(e.avgTminC));
  const tmax = filtered.map((e) => round1(e.avgTmaxC));

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `Diagramm: Saisonmittelwerte (${season}) für Tmin und Tmax`}
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
              type: 'bar',
              data: tmin,
              itemStyle: {
                color: '#60a5fa',
                decal: {
                  symbol: 'rect',
                  dashArrayX: [2, 2],
                  dashArrayY: [2, 2],
                  color: 'rgba(255,255,255,0.35)',
                },
              },
            },
            {
              name: 'Tmax',
              type: 'bar',
              data: tmax,
              itemStyle: {
                // explizit Rot (Anforderung)
                color: '#ef4444',
                decal: {
                  symbol: 'circle',
                  dashArrayX: [1, 0],
                  dashArrayY: [3, 3],
                  color: 'rgba(255,255,255,0.35)',
                },
              },
            },
          ],
        }}
        style={{ height: 320 }}
      />
    </div>
  );
};