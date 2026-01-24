'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchAggregates } from '../../../lib/api';
import { YearlyChart } from '../../../components/YearlyChart';
import { SeasonalChart } from '../../../components/SeasonalChart';

const seasons = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

export default function StationPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialFrom = Number(searchParams.get('fromYear') ?? 2018);
  const initialTo = Number(searchParams.get('toYear') ?? 2024);

  const [fromYear, setFromYear] = useState(initialFrom);
  const [toYear, setToYear] = useState(initialTo);
  const [season, setSeason] = useState('SUMMER');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aggregates', params.id, fromYear, toYear],
    queryFn: () => fetchAggregates(params.id, { fromYear, toYear }),
  });

  return (
    <section className="grid gap-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <h2 className="text-xl font-semibold text-white">Station Auswertung</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-200">
            From Year
            <input
              aria-label="From Year"
              type="number"
              value={fromYear}
              onChange={(event) => setFromYear(Number(event.target.value))}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            To Year
            <input
              aria-label="To Year"
              type="number"
              value={toYear}
              onChange={(event) => setToYear(Number(event.target.value))}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => void refetch()}
            className="self-end rounded-lg bg-primary px-4 py-2 text-white"
          >
            Auswertung laden
          </button>
        </div>
        {data && (
          <div className="mt-6 text-slate-200">
            <p className="text-lg font-semibold text-white">{data.station.name}</p>
            <p className="text-sm text-slate-400">
              {data.station.latitude.toFixed(2)}, {data.station.longitude.toFixed(2)} ·
              Zeitraum {data.station.firstYear}–{data.station.lastYear}
            </p>
          </div>
        )}
        {isLoading && <p className="mt-4 text-slate-300">Lade Daten…</p>}
        {error && <p className="mt-4 text-rose-300">Fehler beim Laden der Daten.</p>}
      </div>

      {data && (
        <div className="grid gap-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-lg font-semibold text-white">Jahresmittelwerte</h3>
            <div className="mt-4">
              <YearlyChart yearly={data.yearly} />
            </div>
            <div className="mt-6 overflow-x-auto">
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
                  {data.yearly.map((row) => (
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
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">Saisonmittelwerte</h3>
              <label className="text-sm text-slate-300">
                Saison
                <select
                  value={season}
                  onChange={(event) => setSeason(event.target.value)}
                  className="ml-3 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
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
              <SeasonalChart seasonal={data.seasonal} season={season} />
            </div>
            <div className="mt-6 overflow-x-auto">
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
                  {data.seasonal
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
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
