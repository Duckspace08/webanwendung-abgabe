 'use client';

import ReactECharts from 'echarts-for-react';

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

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `Diagramm: Saisonmittelwerte (${season}) für Tmin und Tmax`}
      aria-describedby={tableId}
    >
      <ReactECharts
        option={{
          tooltip: { trigger: 'axis' },
          legend: {
            data: ['Tmin', 'Tmax'],
            textStyle: { color: '#e2e8f0' },
          },
          xAxis: { type: 'category', data: years, axisLabel: { color: '#cbd5f5' } },
          yAxis: { type: 'value', axisLabel: { color: '#cbd5f5' } },
          series: [
            {
              name: 'Tmin',
              type: 'bar',
              data: filtered.map((e) => e.avgTminC),
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
              data: filtered.map((e) => e.avgTmaxC),
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