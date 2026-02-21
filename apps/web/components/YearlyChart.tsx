'use client';

import ReactECharts from 'echarts-for-react';

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
  const tmin = yearly.map((entry) => entry.avgTminC);
  const tmax = yearly.map((entry) => entry.avgTmaxC);

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Diagramm: Jahresmittelwerte für Tmin und Tmax'}
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