'use client';

import ReactECharts from 'echarts-for-react';

export const SeasonalChart = ({
  seasonal,
  season,
}: {
  seasonal: Array<{ year: number; season: string; avgTminC: number | null; avgTmaxC: number | null }>;
  season: string;
}) => {
  const filtered = seasonal.filter((entry) => entry.season === season);
  const years = filtered.map((entry) => entry.year);

  return (
    <ReactECharts
      option={{
        tooltip: { trigger: 'axis' },
        legend: { data: ['Tmin', 'Tmax'], textStyle: { color: '#e2e8f0' } },
        xAxis: { type: 'category', data: years, axisLabel: { color: '#cbd5f5' } },
        yAxis: { type: 'value', axisLabel: { color: '#cbd5f5' } },
        series: [
          { name: 'Tmin', type: 'bar', data: filtered.map((e) => e.avgTminC) },
          { name: 'Tmax', type: 'bar', data: filtered.map((e) => e.avgTmaxC) },
        ],
      }}
      style={{ height: 320 }}
    />
  );
};
