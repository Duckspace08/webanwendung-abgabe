'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchImportStatus, fetchNearbyStations, type StationResult } from '../../lib/api';
import { ErrorBanner } from '../../components/ErrorBanner';
import { toUserMessage } from '../../lib/errors';
import { useToast } from '../../components/ToastProvider';

const StationMap = dynamic(
  () => import('../../components/StationMap').then((mod) => mod.StationMap),
  { ssr: false },
);

const MAX_LIMIT = 50;
const MAX_RADIUS_KM = 2000;

const defaultParams = {
  lat: 52.52,
  lon: 13.405,
  radiusKm: 500,
  limit: 10,
  minYear: 2018,
  maxYear: 2025,
};

type Params = typeof defaultParams;

type FieldKey = keyof Params;

type FieldConfig = {
  key: FieldKey;
  label: string;
  step: string;
  help: string;
  maxHint?: string;
};

const fields: FieldConfig[] = [
  {
    key: 'lat',
    label: 'Latitude',
    step: '0.01',
    help: 'Breitengrad des Standpunkts (−90 bis 90).',
  },
  {
    key: 'lon',
    label: 'Longitude',
    step: '0.01',
    help: 'Längengrad des Standpunkts (−180 bis 180).',
  },
  {
    key: 'radiusKm',
    label: 'Radius (km)',
    step: '1',
    help: 'Suchradius um den Standpunkt.',
    maxHint: `Max. ${MAX_RADIUS_KM} km`,
  },
  {
    key: 'limit',
    label: 'Limit',
    step: '1',
    help: 'Maximale Anzahl gefundener Stationen.',
    maxHint: `Max. ${MAX_LIMIT}`,
  },
  {
    key: 'minYear',
    label: 'Min Year',
    step: '1',
    help: 'Station muss Daten ab diesem Jahr haben.',
  },
  {
    key: 'maxYear',
    label: 'Max Year',
    step: '1',
    help: 'Station muss Daten bis zu diesem Jahr haben.',
  },
];

const validate = (p: Params) => {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (p.lat < -90 || p.lat > 90) errors.lat = 'Latitude muss zwischen −90 und 90 liegen.';
  if (p.lon < -180 || p.lon > 180) errors.lon = 'Longitude muss zwischen −180 und 180 liegen.';

  if (p.radiusKm < 1) errors.radiusKm = 'Radius muss mindestens 1 km sein.';
  if (p.radiusKm > MAX_RADIUS_KM) errors.radiusKm = `Radius darf max. ${MAX_RADIUS_KM} km sein.`;

  if (!Number.isInteger(p.limit)) errors.limit = 'Limit muss eine ganze Zahl sein.';
  if (p.limit < 1) errors.limit = 'Limit muss mindestens 1 sein.';
  if (p.limit > MAX_LIMIT) errors.limit = `Limit darf max. ${MAX_LIMIT} sein.`;

  if (!Number.isInteger(p.minYear)) errors.minYear = 'Min Year muss eine ganze Zahl sein.';
  if (!Number.isInteger(p.maxYear)) errors.maxYear = 'Max Year muss eine ganze Zahl sein.';

  if (p.minYear > p.maxYear) errors.minYear = 'Min Year darf nicht größer als Max Year sein.';

  return errors;
};

export default function ExplorePage() {
  const { push } = useToast();

  const [params, setParams] = useState<Params>(defaultParams);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);

  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const validationErrors = useMemo(() => validate(params), [params]);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const { data: importStatus } = useQuery({
    queryKey: ['import-status'],
    queryFn: fetchImportStatus,
    refetchInterval: 10000,
  });

  const { data, isLoading, error, refetch } = useQuery<StationResult[]>({
    queryKey: ['stations', params],
    queryFn: () => fetchNearbyStations(params),
    enabled: shouldFetch && !hasValidationErrors,
  });

  useEffect(() => {
    if (error) {
      push({
        title: 'Fehler beim Laden der Stationen',
        message: toUserMessage(error),
        variant: 'error',
      });
    }
  }, [error, push]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    if (hasValidationErrors) {
      push({
        title: 'Eingaben prüfen',
        message: 'Bitte beheben Sie die markierten Felder und starten Sie die Suche erneut.',
        variant: 'error',
      });
      setShouldFetch(false);
      return;
    }

    setShouldFetch(true);
    void refetch();
  };

  const showError = (key: FieldKey) => Boolean((submitted || touched[key]) && validationErrors[key]);

  return (
    <section className="grid gap-8">
      {importStatus?.status === 'RUNNING' && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
          NOAA Initialimport läuft noch. Ergebnisse werden nach Abschluss vollständig verfügbar.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Stationssuche</h2>
          <p className="text-sm text-slate-400">
            Grenzwerte: <strong>Radius max. {MAX_RADIUS_KM} km</strong>, <strong>Limit max. {MAX_LIMIT}</strong>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {fields.map((field) => {
            const inputId = `field-${field.key}`;
            const helpId = `help-${field.key}`;
            const errorId = `error-${field.key}`;

            return (
              <div key={field.key} className="grid gap-2">
                <label htmlFor={inputId} className="text-sm text-slate-200">
                  {field.label}
                </label>

                <input
                  id={inputId}
                  aria-label={field.label}
                  aria-describedby={showError(field.key) ? `${helpId} ${errorId}` : helpId}
                  aria-invalid={showError(field.key) ? 'true' : 'false'}
                  type="number"
                  step={field.step}
                  value={params[field.key]}
                  onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
                  onChange={(event) =>
                    setParams((prev) => ({
                      ...prev,
                      [field.key]: Number(event.target.value),
                    }))
                  }
                  className={`rounded-md border bg-slate-950 px-3 py-2 text-white ${
                    showError(field.key) ? 'border-rose-500/60' : 'border-slate-700'
                  }`}
                />

                <p id={helpId} className="text-xs text-slate-400">
                  {field.help} {field.maxHint ? <span className="font-medium">{field.maxHint}</span> : null}
                </p>

                {showError(field.key) ? (
                  <p id={errorId} className="text-xs text-rose-200" role="alert">
                    {validationErrors[field.key]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-blue-600"
        >
          Stationen suchen
        </button>

        {isLoading && <p className="text-slate-300">Lade Stationen…</p>}
        {error ? <ErrorBanner message={toUserMessage(error)} /> : null}
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
                    Distanz: {station.distanceKm} km · Zeitraum {station.firstYear}–{station.lastYear}
                  </span>
                </button>
                <Link
                  href={`/station/${station.id}?fromYear=${params.minYear}&toYear=${params.maxYear}`}
                  className="mt-3 inline-flex rounded-md text-sm font-medium text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
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