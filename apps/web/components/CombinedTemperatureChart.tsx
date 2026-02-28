'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const round1 = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(1)) : null;

const format1 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—');

type YearlyRow = { year: number; avgTminC: number | null; avgTmaxC: number | null };
type SeasonalRow = { year: number; season: string; avgTminC: number | null; avgTmaxC: number | null };

type SeriesKey =
  | 'TMIN-YR'
  | 'TMIN-SP'
  | 'TMIN-SU'
  | 'TMIN-AU'
  | 'TMIN-WI'
  | 'TMAX-YR'
  | 'TMAX-SP'
  | 'TMAX-SU'
  | 'TMAX-AU'
  | 'TMAX-WI';

const SEASON_TO_ABBR: Partial<Record<string, 'SP' | 'SU' | 'AU' | 'WI'>> = {
  SPRING: 'SP',
  SUMMER: 'SU',
  AUTUMN: 'AU',
  WINTER: 'WI',
};

// Farb-Anforderungen:
// - TMAX-SP: Gelbgrün
// - TMAX-SU: Gelb
// - TMAX-AU: Rotorange/Braun
// - TMAX-WI: Blauviolett
// - Alle TMIN sind die Komplementärfarbe zum jeweiligen TMAX-Paar
const COLORS: Record<SeriesKey, string> = {
  'TMAX-YR': '#ef4444', // rot
  'TMIN-YR': '#22d3ee', // cyan (Komplement zu rot)

  'TMAX-SP': '#a3e635', // gelbgrün
  'TMIN-SP': '#8b5cf6', // violett (Komplement zu gelbgrün)

  'TMAX-SU': '#facc15', // gelb
  'TMIN-SU': '#3b82f6', // blau (Komplement zu gelb)

  'TMAX-AU': '#c2410c', // rotorange/braun
  'TMIN-AU': '#2dd4bf', // teal (Komplement zu rotorange/braun)

  'TMAX-WI': '#6366f1', // blauviolett
  'TMIN-WI': '#f59e0b', // amber (Komplement zu blauviolett)
};

const SERIES_ORDER: SeriesKey[] = [
  'TMIN-YR',
  'TMIN-SP',
  'TMIN-SU',
  'TMIN-AU',
  'TMIN-WI',
  'TMAX-YR',
  'TMAX-SP',
  'TMAX-SU',
  'TMAX-AU',
  'TMAX-WI',
];

const createSeriesData = (len: number): Record<SeriesKey, Array<number | null>> =>
  SERIES_ORDER.reduce((acc, key) => {
    acc[key] = len === 0 ? ([] as Array<number | null>) : Array.from({ length: len }, () => null);
    return acc;
  }, {} as Record<SeriesKey, Array<number | null>>);

export const CombinedTemperatureChart = ({
  yearly,
  seasonal,
  fromYear,
  toYear,
  ariaLabel,
  tableId,
}: {
  yearly: YearlyRow[];
  seasonal: SeasonalRow[];
  /**
   * Optional: wenn gesetzt, wird die X-Achse exakt auf diesen Bereich "fixiert"
   * (konsistent zur Tabelle/Filter).
   */
  fromYear?: number;
  toYear?: number;
  ariaLabel?: string;
  tableId?: string;
}) => {
  const { years, seriesData } = useMemo(() => {
    const hasValidRange =
      Number.isInteger(fromYear) && Number.isInteger(toYear) && (fromYear as number) <= (toYear as number);

    if (hasValidRange) {
      const years: number[] = [];
      for (let y = fromYear as number; y <= (toYear as number); y += 1) years.push(y);

      const idxByYear = new Map<number, number>();
      years.forEach((y, idx) => idxByYear.set(y, idx));

      const seriesData = createSeriesData(years.length);

      for (const row of yearly) {
        const idx = idxByYear.get(row.year);
        if (idx === undefined) continue;
        seriesData['TMIN-YR'][idx] = round1(row.avgTminC);
        seriesData['TMAX-YR'][idx] = round1(row.avgTmaxC);
      }

      for (const row of seasonal) {
        const abbr = SEASON_TO_ABBR[row.season];
        if (!abbr) continue;
        const idx = idxByYear.get(row.year);
        if (idx === undefined) continue;

        const tminKey = `TMIN-${abbr}` as SeriesKey;
        const tmaxKey = `TMAX-${abbr}` as SeriesKey;

        seriesData[tminKey][idx] = round1(row.avgTminC);
        seriesData[tmaxKey][idx] = round1(row.avgTmaxC);
      }

      return { years, seriesData };
    }

    // Fallback: Range aus vorhandenen Daten ableiten
    const yearsInData = new Set<number>();
    for (const y of yearly) yearsInData.add(y.year);
    for (const s of seasonal) yearsInData.add(s.year);

    const yearList = Array.from(yearsInData).sort((a, b) => a - b);
    if (yearList.length === 0) {
      return {
        years: [] as number[],
        seriesData: createSeriesData(0),
      };
    }

    const minYear = yearList[0];
    const maxYear = yearList[yearList.length - 1];
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y += 1) years.push(y);

    const idxByYear = new Map<number, number>();
    years.forEach((y, idx) => idxByYear.set(y, idx));

    const seriesData = createSeriesData(years.length);

    for (const row of yearly) {
      const idx = idxByYear.get(row.year);
      if (idx === undefined) continue;
      seriesData['TMIN-YR'][idx] = round1(row.avgTminC);
      seriesData['TMAX-YR'][idx] = round1(row.avgTmaxC);
    }

    for (const row of seasonal) {
      const abbr = SEASON_TO_ABBR[row.season];
      if (!abbr) continue;
      const idx = idxByYear.get(row.year);
      if (idx === undefined) continue;

      const tminKey = `TMIN-${abbr}` as SeriesKey;
      const tmaxKey = `TMAX-${abbr}` as SeriesKey;

      seriesData[tminKey][idx] = round1(row.avgTminC);
      seriesData[tmaxKey][idx] = round1(row.avgTmaxC);
    }

    return { years, seriesData };
  }, [yearly, seasonal, fromYear, toYear]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const header = items?.[0]?.axisValueLabel ?? items?.[0]?.axisValue ?? '';
          const lines = items
            .filter((p: any) => p && p.seriesName)
            .map((p: any) => {
              const value = p?.data;
              const marker = p?.marker ?? '';
              return `${marker}${p.seriesName}: ${format1(value)} °C`;
            });
          return [header, ...lines].join('<br/>');
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        icon: 'rect',
        textStyle: { color: '#e2e8f0' },
      },
      grid: {
        left: 52,
        right: 28,
        top: 40,
        bottom: 78,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { color: '#cbd5f5' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#cbd5f5',
          formatter: (value: number) => Number(value).toFixed(1),
        },
        name: '°C',
        nameTextStyle: { color: '#cbd5f5' },
      },
      series: SERIES_ORDER.map((key) => {
        const isTmin = key.startsWith('TMIN-');
        return {
          name: key,
          type: 'line',
          data: seriesData[key],
          connectNulls: false,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            type: isTmin ? 'dashed' : 'solid',
            color: COLORS[key],
          },
          itemStyle: { color: COLORS[key] },
          emphasis: { focus: 'series' },
        };
      }),
    }),
    [years, seriesData]
  );

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Diagramm: Jahres- und Saisonmittelwerte (TMIN/TMAX)'}
      aria-describedby={tableId}
    >
      <ReactECharts option={option} style={{ height: 420 }} />
    </div>
  );
};