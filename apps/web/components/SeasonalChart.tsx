'use client';

import ReactECharts from 'echarts-for-react';

type SeasonalRow = { year: number; season: string; avgTminC: number | null; avgTmaxC: number | null };
type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

const round1 = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(1)) : null;

const format1 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—');

// konsistent zur CombinedTemperatureChart-Farbwelt
const SEASON_COLORS: Record<Season, { tmax: string; tmin: string }> = {
  SPRING: { tmax: '#a3e635', tmin: '#8b5cf6' }, // TMAX-SP / TMIN-SP
  SUMMER: { tmax: '#facc15', tmin: '#3b82f6' }, // TMAX-SU / TMIN-SU
  AUTUMN: { tmax: '#c2410c', tmin: '#2dd4bf' }, // TMAX-AU / TMIN-AU
  WINTER: { tmax: '#6366f1', tmin: '#f59e0b' }, // TMAX-WI / TMIN-WI
};

export const SeasonalChart = ({
  seasonal,
  season,
  ariaLabel,
}: {
  seasonal: SeasonalRow[];
  season: Season;
  ariaLabel?: string;
}) => {
  const filtered = seasonal.filter((entry) => entry.season === season);
  const years = filtered.map((entry) => entry.year);

  const tmin = filtered.map((e) => round1(e.avgTminC));
  const tmax = filtered.map((e) => round1(e.avgTmaxC));

  const colors = SEASON_COLORS[season];

  return (
    <div role="img" aria-label={ariaLabel ?? `Diagramm: Saisonmittelwerte (${season}) für TMIN/TMAX`}>
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
            data: ['TMIN', 'TMAX'],
            icon: 'rect',
            textStyle: { color: '#e2e8f0' },
          },
          grid: { left: 52, right: 28, top: 40, bottom: 44, containLabel: true },
          xAxis: { type: 'category', data: years, axisLabel: { color: '#cbd5f5' } },
          yAxis: {
            type: 'value',
            name: '°C',
            nameTextStyle: { color: '#cbd5f5' },
            axisLabel: {
              color: '#cbd5f5',
              formatter: (value: number) => Number(value).toFixed(1),
            },
          },
          series: [
            {
              name: 'TMIN',
              type: 'bar',
              data: tmin,
              itemStyle: { color: colors.tmin },
            },
            {
              name: 'TMAX',
              type: 'bar',
              data: tmax,
              itemStyle: { color: colors.tmax },
            },
          ],
        }}
        style={{ height: 320 }}
      />
    </div>
  );
};