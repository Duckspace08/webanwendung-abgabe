'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchAggregates } from '../../../lib/api';
import { CombinedTemperatureChart } from '../../../components/CombinedTemperatureChart';
import { SeasonalChart } from '../../../components/SeasonalChart';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { toUserMessage } from '../../../lib/errors';
import { useToast } from '../../../components/ToastProvider';

type AggregatesResponse = Awaited<ReturnType<typeof fetchAggregates>>;

const seasons = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as const;
type Season = (typeof seasons)[number];

const seasonToAbbr: Record<string, 'SP' | 'SU' | 'AU' | 'WI'> = {
  SPRING: 'SP',
  SUMMER: 'SU',
  AUTUMN: 'AU',
  WINTER: 'WI',
};

type CombinedKey =
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

type CombinedRow = {
  year: number;
} & Record<CombinedKey, number | null>;

const toFixedOrDash = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—';

function SkeletonBlock({ className, label }: { className: string; label?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 ${className}`}
    >
      {label ? <div className="p-4 text-sm text-slate-400">{label}</div> : null}
    </div>
  );
}

const validateYears = (fromYear: number, toYear: number) => {
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear)) {
    return 'Jahreswerte müssen ganze Zahlen sein.';
  }
  if (fromYear > toYear) {
    return 'From Year darf nicht größer als To Year sein.';
  }
  return null;
};

export default function StationPage() {
  const { push } = useToast();

  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const stationId = String(params?.id ?? '');

  const initialFrom = Number(searchParams.get('fromYear') ?? 2018);
  const initialTo = Number(searchParams.get('toYear') ?? 2025);

  // Form state (no auto-refetch on every keystroke)
  const [fromYearInput, setFromYearInput] = useState(initialFrom);
  const [toYearInput, setToYearInput] = useState(initialTo);

  // Applied range (drives the query)
  const [fromYear, setFromYear] = useState(initialFrom);
  const [toYear, setToYear] = useState(initialTo);

  const [season, setSeason] = useState<Season>('SUMMER');
  const [rangeError, setRangeError] = useState<string | null>(null);

  const queryKey = useMemo(() => ['aggregates', stationId, fromYear, toYear], [stationId, fromYear, toYear]);

  const { data, isLoading, isFetching, error, refetch } = useQuery<AggregatesResponse>({
    queryKey,
    queryFn: () => fetchAggregates(stationId, { fromYear, toYear }),
    enabled: Boolean(stationId),
  });

  useEffect(() => {
    if (error) {
      push({
        title: 'Fehler beim Laden der Auswertung',
        message: toUserMessage(error),
        variant: 'error',
      });
    }
  }, [error, push]);

  // Keep last successful data to avoid layout jumps during refetch
  const [lastData, setLastData] = useState<AggregatesResponse | null>(null);
  useEffect(() => {
    if (data) setLastData(data);
  }, [data]);

  const renderData = data ?? lastData;
  const isInitialLoading = (isLoading || isFetching) && !renderData;

  const applyRange = () => {
    const validation = validateYears(fromYearInput, toYearInput);
    setRangeError(validation);
    if (validation) return;

    const changed = fromYear !== fromYearInput || toYear !== toYearInput;
    setFromYear(fromYearInput);
    setToYear(toYearInput);

    if (!changed) void refetch();
  };

  const combinedTableId = 'combined-table';

  const combinedRows = useMemo<CombinedRow[] | null>(() => {
    if (!renderData) return null;

    const mkEmptyRow = (year: number): CombinedRow => ({
      year,
      'TMIN-YR': null,
      'TMIN-SP': null,
      'TMIN-SU': null,
      'TMIN-AU': null,
      'TMIN-WI': null,
      'TMAX-YR': null,
      'TMAX-SP': null,
      'TMAX-SU': null,
      'TMAX-AU': null,
      'TMAX-WI': null,
    });

    const byYear = new Map<number, CombinedRow>();
    const rows: CombinedRow[] = [];

    for (let y = fromYear; y <= toYear; y += 1) {
      const r = mkEmptyRow(y);
      byYear.set(y, r);
      rows.push(r);
    }

    for (const yr of renderData.yearly) {
      const r = byYear.get(yr.year);
      if (!r) continue;
      r['TMIN-YR'] = yr.avgTminC ?? null;
      r['TMAX-YR'] = yr.avgTmaxC ?? null;
    }

    for (const s of renderData.seasonal) {
      const abbr = seasonToAbbr[s.season];
      if (!abbr) continue;

      const r = byYear.get(s.year);
      if (!r) continue;

      const tminKey = `TMIN-${abbr}` as CombinedKey;
      const tmaxKey = `TMAX-${abbr}` as CombinedKey;
      r[tminKey] = s.avgTminC ?? null;
      r[tmaxKey] = s.avgTmaxC ?? null;
    }

    return rows;
  }, [renderData, fromYear, toYear]);

  return (
    <section className="grid gap-8" aria-busy={isLoading || isFetching}>
      {/* Header / Filters */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <h2 className="text-xl font-semibold text-white">Station Auswertung</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <label htmlFor="fromYear" className="text-sm text-slate-200">
              From Year
            </label>
            <input
              id="fromYear"
              aria-label="From Year"
              aria-describedby="year-help"
              type="number"
              value={fromYearInput}
              onChange={(event) => setFromYearInput(Number(event.target.value))}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="toYear" className="text-sm text-slate-200">
              To Year
            </label>
            <input
              id="toYear"
              aria-label="To Year"
              aria-describedby="year-help"
              type="number"
              value={toYearInput}
              onChange={(event) => setToYearInput(Number(event.target.value))}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          <button
            type="button"
            onClick={applyRange}
            disabled={isLoading || isFetching || !stationId}
            className="self-end rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading || isFetching ? 'Lade…' : 'Auswertung laden'}
          </button>
        </div>

        <p id="year-help" className="mt-2 text-xs text-slate-400">
          Hinweis: From Year muss ≤ To Year sein.
        </p>

        {rangeError ? (
          <p className="mt-2 text-sm text-rose-200" role="alert">
            {rangeError}
          </p>
        ) : null}

        {/* Station meta (reserve space to prevent CLS) */}
        <div className="mt-6 min-h-[56px] text-slate-200" aria-live="polite">
          {renderData ? (
            <>
              <p className="text-lg font-semibold text-white">{renderData.station.name}</p>
              <p className="text-sm text-slate-400">
                {renderData.station.latitude.toFixed(2)}, {renderData.station.longitude.toFixed(2)} · Zeitraum{' '}
                {renderData.station.firstYear}–{renderData.station.lastYear}
              </p>
            </>
          ) : isInitialLoading ? (
            <div className="grid gap-2">
              <SkeletonBlock className="h-6 w-[260px]" />
              <SkeletonBlock className="h-4 w-[340px]" />
            </div>
          ) : (
            <p className="text-sm text-slate-400">Keine Daten geladen.</p>
          )}
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorBanner message={toUserMessage(error)} />
          </div>
        ) : null}
      </div>

      {/* Combined chart + single combined table (Ziel: ein Graph + Tabelle darunter) */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Temperaturverlauf</h3>

        <div className="mt-4">
          {renderData ? (
            <CombinedTemperatureChart
              yearly={renderData.yearly}
              seasonal={renderData.seasonal}
              fromYear={fromYear}
              toYear={toYear}
              tableId={combinedTableId}
            />
          ) : (
            <SkeletonBlock className="h-[420px] w-full" label="Chart lädt…" />
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          {combinedRows ? (
            <table id={combinedTableId} className="min-w-full text-sm text-slate-200">
              <caption className="sr-only">
                Tabellarische Alternative: Jahres- und Saisonmittelwerte (TMIN/TMAX) pro Jahr
              </caption>
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="py-2">Year</th>
                  <th className="py-2">TMIN-YR</th>
                  <th className="py-2">TMIN-SP</th>
                  <th className="py-2">TMIN-SU</th>
                  <th className="py-2">TMIN-AU</th>
                  <th className="py-2">TMIN-WI</th>
                  <th className="py-2">TMAX-YR</th>
                  <th className="py-2">TMAX-SP</th>
                  <th className="py-2">TMAX-SU</th>
                  <th className="py-2">TMAX-AU</th>
                  <th className="py-2">TMAX-WI</th>
                </tr>
              </thead>
              <tbody>
                {combinedRows.map((row) => (
                  <tr key={row.year} className="border-t border-slate-800">
                    <td className="py-2">{row.year}</td>
                    <td className="py-2">{toFixedOrDash(row['TMIN-YR'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMIN-SP'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMIN-SU'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMIN-AU'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMIN-WI'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMAX-YR'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMAX-SP'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMAX-SU'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMAX-AU'])}</td>
                    <td className="py-2">{toFixedOrDash(row['TMAX-WI'])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <SkeletonBlock className="h-[260px] w-full" label="Tabelle lädt…" />
          )}
        </div>
      </div>

      {/* Optional wieder hinzugefügt: Saison-Balkendiagramm */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">Saisonmittelwerte (TMIN/TMAX)</h3>

          <div className="grid gap-1">
            <label htmlFor="season" className="text-sm text-slate-300">
              Saison
            </label>
            <select
              id="season"
              value={season}
              onChange={(event) => setSeason(event.target.value as Season)}
              disabled={!renderData}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-60"
            >
              {seasons.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          {renderData ? (
            <SeasonalChart seasonal={renderData.seasonal} season={season} />
          ) : (
            <SkeletonBlock className="h-[320px] w-full" label="Chart lädt…" />
          )}
        </div>
      </div>
    </section>
  );
}