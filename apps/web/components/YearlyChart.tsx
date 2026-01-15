'use client';

import ReactECharts from 'echarts-for-react';

export const YearlyChart = ({
  yearly,
}: {
  yearly: Array<{ year: number; avgTminC: number | null; avgTmaxC: number | null }>;
}) => {
  const years = yearly.map((entry) => entry.year);
  const tmin = yearly.map((entry) => entry.avgTminC);
  const tmax = yearly.map((entry) => entry.avgTmaxC);

  return (
    <ReactECharts
      option={{
        tooltip: { trigger: 'axis' },
        legend: { data: ['Tmin', 'Tmax'], textStyle: { color: '#e2e8f0' } },
        xAxis: { type: 'category', data: years, axisLabel: { color: '#cbd5f5' } },
        yAxis: { type: 'value', axisLabel: { color: '#cbd5f5' } },
        series: [
          { name: 'Tmin', type: 'line', data: tmin, smooth: true },
          { name: 'Tmax', type: 'line', data: tmax, smooth: true },
        ],
      }}
      style={{ height: 360 }}
    />
  );
};
