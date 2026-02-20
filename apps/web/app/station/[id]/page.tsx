'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchAggregates } from '../../../lib/api';
import { YearlyChart } from '../../../components/YearlyChart';
import { SeasonalChart } from '../../../components/SeasonalChart';

type AggregatesResponse = Awaited<ReturnType<typeof fetchAggregates>>;

const seasons = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as const;

function SkeletonBlock({
  className,
  label,
}: {
  className: string;
  label?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 ${className}`}
    >
      {label ? (
        <div className="p-4 text-sm text-slate-400">{label}</div>
      ) : null}
    </div>
  );
}

export default function StationPage() {
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

  const [season, setSeason] = useState<(typeof seasons)[number]>('SUMMER');

  const queryKey = useMemo(
    () => ['aggregates', stationId, fromYear, toYear],
    [stationId, fromYear, toYear]
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AggregatesResponse>({
    queryKey,
    queryFn: () => fetchAggregates(stationId, { fromYear, toYear }),
    enabled: Boolean(stationId),
  });

  // Keep last successful data to avoid layout jumps during refetch
  const [lastData, setLastData] = useState<AggregatesResponse | null>(null);
  useEffect(() => {
    if (data) setLastData(data);
  }, [data]);

  const renderData = data ?? lastData;
  const isInitialLoading = (isLoading || isFetching) && !renderData;

  const applyRange = () => {
    const changed = fromYear !== fromYearInput || toYear !== toYearInput;
    setFromYear(fromYearInput);
    setToYear(toYearInput);

    // If the range did not change, force a refetch (user explicitly requested reload)
    if (!changed) void refetch();
  };

  return (
    <section className="grid gap-8" aria-busy={isLoading || isFetching}>
      {/* Header / Filters */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <h2 className="text-xl font-semibold text-white">Station Auswertung</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-200">
            From Year
            <input
              aria-label="From Year"
              type="number"
              value={fromYearInput}
              onChange={(event) => setFromYearInput(Number(event.target.value))}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-200">
            To Year
            <input
              aria-label="To Year"
              type="number"
              value={toYearInput}
              onChange={(event) => setToYearInput(Number(event.target.value))}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>

          <button
            type="button"
            onClick={applyRange}
            disabled={isLoading || isFetching || !stationId}
            className="self-end rounded-lg bg-primary px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading || isFetching ? 'Lade…' : 'Auswertung laden'}
          </button>
        </div>

        {/* Station meta (reserve space to prevent CLS) */}
        <div className="mt-6 min-h-[56px] text-slate-200" aria-live="polite">
          {renderData ? (
            <>
              <p className="text-lg font-semibold text-white">{renderData.station.name}</p>
              <p className="text-sm text-slate-400">
                {renderData.station.latitude.toFixed(2)}, {renderData.station.longitude.toFixed(2)} ·
                Zeitraum {renderData.station.firstYear}–{renderData.station.lastYear}
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
          <p className="mt-4 text-rose-300" role="alert">
            Fehler beim Laden der Daten.
          </p>
        ) : null}
      </div>

      {/* Content: always render both cards with reserved space (avoid CLS) */}
      <div className="grid gap-8">
        {/* Yearly */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-white">Jahresmittelwerte</h3>

          <div className="mt-4">
            {renderData ? (
              <YearlyChart yearly={renderData.yearly} />
            ) : (
              <SkeletonBlock className="h-[360px] w-full" label="Chart lädt…" />
            )}
          </div>

          <div className="mt-6 overflow-x-auto">
            {renderData ? (
              <table className="min-w-full text-sm text-slate-200">
                <thead className="text-left text-slate-400">
                  <tr>
                    <th className="py-2">Year</th>
                    <th className="py-2">Avg Tmin (°C)</th>
                    <th className="py-2">Avg Tmax (°C)</th>
                    <th className="py-2">Days Tmin</th>
                    <th className="py-2">Days Tmax</th>
                  </tr>
                </thead>
                <tbody>
                  {renderData.yearly.map((row) => (
                    <tr key={row.year} className="border-t border-slate-800">
                      <td className="py-2">{row.year}</td>
                      <td className="py-2">{row.avgTminC?.toFixed(2) ?? '—'}</td>
                      <td className="py-2">{row.avgTmaxC?.toFixed(2) ?? '—'}</td>
                      <td className="py-2">{row.daysCountTmin}</td>
                      <td className="py-2">{row.daysCountTmax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <SkeletonBlock className="h-[240px] w-full" label="Tabelle lädt…" />
            )}
          </div>
        </div>

        {/* Seasonal */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-white">Saisonmittelwerte</h3>

            <label className="text-sm text-slate-300">
              Saison
              <select
                value={season}
                onChange={(event) => setSeason(event.target.value as (typeof seasons)[number])}
                disabled={!renderData}
                className="ml-3 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-60"
              >
                {seasons.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
            {renderData ? (
              <SeasonalChart seasonal={renderData.seasonal} season={season} />
            ) : (
              <SkeletonBlock className="h-[320px] w-full" label="Chart lädt…" />
            )}
          </div>

          <div className="mt-6 overflow-x-auto">
            {renderData ? (
              <table className="min-w-full text-sm text-slate-200">
                <thead className="text-left text-slate-400">
                  <tr>
                    <th className="py-2">Year</th>
                    <th className="py-2">Season</th>
                    <th className="py-2">Avg Tmin (°C)</th>
                    <th className="py-2">Avg Tmax (°C)</th>
                    <th className="py-2">Days Tmin</th>
                    <th className="py-2">Days Tmax</th>
                  </tr>
                </thead>
                <tbody>
                  {renderData.seasonal
                    .filter((row) => row.season === season)
                    .map((row) => (
                      <tr key={`${row.year}-${row.season}`} className="border-t border-slate-800">
                        <td className="py-2">{row.year}</td>
                        <td className="py-2">{row.season}</td>
                        <td className="py-2">{row.avgTminC?.toFixed(2) ?? '—'}</td>
                        <td className="py-2">{row.avgTmaxC?.toFixed(2) ?? '—'}</td>
                        <td className="py-2">{row.daysCountTmin}</td>
                        <td className="py-2">{row.daysCountTmax}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <SkeletonBlock className="h-[260px] w-full" label="Tabelle lädt…" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}