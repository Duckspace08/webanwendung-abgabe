'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchNearbyStations, type StationResult } from '../../lib/api';

const StationMap = dynamic(
  () => import('../../components/StationMap').then((mod) => mod.StationMap),
  { ssr: false },
);

const defaultParams = {
  lat: 52.52,
  lon: 13.405,
  radiusKm: 500,
  limit: 10,
  minYear: 2018,
  maxYear: 2024,
};

export default function ExplorePage() {
  const [params, setParams] = useState(defaultParams);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<StationResult[]>({
    queryKey: ['stations', params],
    queryFn: () => fetchNearbyStations(params),
    enabled: shouldFetch,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShouldFetch(true);
    void refetch();
  };

  return (
    <section className="grid gap-8">
      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8"
      >
        <h2 className="text-xl font-semibold text-white">Stationssuche</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              { key: 'lat', label: 'Latitude', step: '0.01' },
              { key: 'lon', label: 'Longitude', step: '0.01' },
              { key: 'radiusKm', label: 'Radius (km)', step: '1' },
              { key: 'limit', label: 'Limit', step: '1' },
              { key: 'minYear', label: 'Min Year', step: '1' },
              { key: 'maxYear', label: 'Max Year', step: '1' },
            ] as const
          ).map((field) => (
            <label key={field.key} className="grid gap-2 text-sm text-slate-200">
              {field.label}
              <input
                aria-label={field.label}
                type="number"
                step={field.step}
                value={params[field.key]}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    [field.key]: Number(event.target.value),
                  }))
                }
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
        >
          Stationen suchen
        </button>
        {isLoading && <p className="text-slate-300">Lade Stationen…</p>}
        {error && <p className="text-rose-300">Fehler beim Laden der Stationen.</p>}
      </form>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-white">Gefundene Stationen</h3>
          <ul className="mt-4 grid gap-3">
            {data?.map((station) => (
              <li
                key={station.id}
                className={`rounded-xl border px-4 py-3 transition ${
                  selectedId === station.id
                    ? 'border-blue-500 bg-blue-950/40'
                    : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(station.id)}
                  className="flex w-full flex-col items-start gap-1 text-left text-slate-200"
                >
                  <span className="text-base font-semibold text-white">{station.name}</span>
                  <span className="text-sm text-slate-400">
                    Distanz: {station.distanceKm} km · Zeitraum {station.firstYear}–
                    {station.lastYear}
                  </span>
                </button>
                <Link
                  href={`/station/${station.id}?fromYear=${params.minYear}&toYear=${params.maxYear}`}
                  className="mt-3 inline-flex text-sm font-medium text-blue-300"
                >
                  Zur Auswertung
                </Link>
              </li>
            ))}
            {!data && !isLoading && (
              <li className="text-slate-400">
                Keine Suche gestartet. Bitte Parameter eingeben und suchen.
              </li>
            )}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-white">Karte</h3>
          <div className="mt-4">
            <StationMap
              stations={data ?? []}
              selectedId={selectedId ?? undefined}
              onSelect={setSelectedId}
              center={{ lat: params.lat, lon: params.lon }}
              radiusKm={params.radiusKm}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
