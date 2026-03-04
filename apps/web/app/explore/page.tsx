'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type StationApi = {
  id?: string;
  stationId?: string;
  name?: string;
  latitude?: number;
  lat?: number;
  longitude?: number;
  lon?: number;
  firstYear?: number;
  minYear?: number;
  lastYear?: number;
  maxYear?: number;
  distanceKm?: number;
};

type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  firstYear?: number;
  lastYear?: number;
  distanceKm?: number;
};

type NumericParams = {
  lat: number;
  lon: number;
  radiusKm: number;
  limit: number;
  minYear: number;
  maxYear: number;
};

type FormState = {
  lat: string;
  lon: string;
  radiusKm: string;
  limit: string;
  minYear: string;
  maxYear: string;
  nameQuery: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const StationsMap = dynamic(() => import('@/components/StationsMap'), { ssr: false });

const DEFAULT_FORM: FormState = {
  lat: '52.52',
  lon: '13.405',
  radiusKm: '50',
  limit: '5',
  minYear: '2018',
  maxYear: '2025',
  nameQuery: '',
};

const LIMITS = {
  lat: { min: -90, max: 90 },
  lon: { min: -180, max: 180 },
  radiusKm: { min: 1, max: 2000 },
  limit: { min: 1, max: 50 },
  year: { min: 1750, max: 2025 },
};

function toFiniteNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalisiert Texte für eine "umlaut-/diakritika-unabhängige" Suche.
 * Beispiele:
 *  - "Köln" -> "koln"
 *  - "Koeln" -> "koln" (über oe->o)
 *  - "München" -> "munchen"
 *  - "Straße" -> "strasse"
 */
function foldForSearch(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Diakritika entfernen
    .replace(/ß/g, 'ss')
    // optional: deutsche Umschreibungen (Koeln -> Koln etc.)
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');
}

function normalizeStation(s: StationApi): Station | null {
  const id = (s.id ?? s.stationId ?? '').trim();
  const lat = s.latitude ?? s.lat;
  const lon = s.longitude ?? s.lon;

  if (!id || typeof lat !== 'number' || typeof lon !== 'number') return null;

  return {
    id,
    name: (s.name ?? id).trim(),
    lat,
    lon,
    firstYear: s.firstYear ?? s.minYear,
    lastYear: s.lastYear ?? s.maxYear,
    distanceKm: s.distanceKm,
  };
}

function validateForm(form: FormState): { ok: true; params: NumericParams } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};

  const lat = toFiniteNumber(form.lat);
  const lon = toFiniteNumber(form.lon);
  const radiusKm = toFiniteNumber(form.radiusKm);
  const limit = toFiniteNumber(form.limit);
  const minYear = toFiniteNumber(form.minYear);
  const maxYear = toFiniteNumber(form.maxYear);

  if (lat === null) errors.lat = 'Latitude ist erforderlich.';
  else if (lat < LIMITS.lat.min || lat > LIMITS.lat.max)
    errors.lat = `Latitude muss zwischen ${LIMITS.lat.min} und ${LIMITS.lat.max} liegen.`;

  if (lon === null) errors.lon = 'Longitude ist erforderlich.';
  else if (lon < LIMITS.lon.min || lon > LIMITS.lon.max)
    errors.lon = `Longitude muss zwischen ${LIMITS.lon.min} und ${LIMITS.lon.max} liegen.`;

  if (radiusKm === null) errors.radiusKm = 'Radius ist erforderlich.';
  else if (radiusKm < LIMITS.radiusKm.min || radiusKm > LIMITS.radiusKm.max)
    errors.radiusKm = `Radius darf max. ${LIMITS.radiusKm.max} km sein.`;

  if (limit === null) errors.limit = 'Limit ist erforderlich.';
  else if (limit < LIMITS.limit.min || limit > LIMITS.limit.max) errors.limit = `Limit darf max. ${LIMITS.limit.max} sein.`;

  if (minYear === null) errors.minYear = 'Min Year ist erforderlich.';
  else if (minYear < LIMITS.year.min || minYear > LIMITS.year.max)
    errors.minYear = `Min Year muss zwischen ${LIMITS.year.min} und ${LIMITS.year.max} liegen.`;

  if (maxYear === null) errors.maxYear = 'Max Year ist erforderlich.';
  else if (maxYear < LIMITS.year.min || maxYear > LIMITS.year.max)
    errors.maxYear = `Max Year muss zwischen ${LIMITS.year.min} und ${LIMITS.year.max} liegen.`;

  if (minYear !== null && maxYear !== null && minYear > maxYear) {
    errors.minYear = 'Min Year darf nicht größer als Max Year sein.';
    errors.maxYear = 'Max Year darf nicht kleiner als Min Year sein.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    params: {
      lat: lat!,
      lon: lon!,
      radiusKm: Math.round(radiusKm!),
      limit: Math.round(limit!),
      minYear: Math.round(minYear!),
      maxYear: Math.round(maxYear!),
    },
  };
}

function makeQuery(params: NumericParams): string {
  const usp = new URLSearchParams();
  usp.set('lat', String(params.lat));
  usp.set('lon', String(params.lon));
  usp.set('radiusKm', String(params.radiusKm));
  usp.set('limit', String(params.limit));
  usp.set('minYear', String(params.minYear));
  usp.set('maxYear', String(params.maxYear));
  return usp.toString();
}

export default function ExplorePage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formTouched, setFormTouched] = useState(false);

  // Trigger für "Fit-to-Radius" nach Klick auf "Stationen suchen".
  // (Die Karte soll NICHT bei jedem Tippen automatisch zoomen.)
  const [fitToRadiusNonce, setFitToRadiusNonce] = useState(0);

  const [stations, setStations] = useState<Station[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Preview für Karte: hält den letzten gültigen Zustand, damit tippen/überschreiben keine UI crasht.
  const lastValidRef = useRef<NumericParams>({
    lat: Number(DEFAULT_FORM.lat),
    lon: Number(DEFAULT_FORM.lon),
    radiusKm: Number(DEFAULT_FORM.radiusKm),
    limit: Number(DEFAULT_FORM.limit),
    minYear: Number(DEFAULT_FORM.minYear),
    maxYear: Number(DEFAULT_FORM.maxYear),
  });

  const preview = useMemo(() => {
    const p = { ...lastValidRef.current };

    const lat = toFiniteNumber(form.lat);
    const lon = toFiniteNumber(form.lon);
    const radiusKm = toFiniteNumber(form.radiusKm);

    if (lat !== null && lat >= LIMITS.lat.min && lat <= LIMITS.lat.max) p.lat = lat;
    if (lon !== null && lon >= LIMITS.lon.min && lon <= LIMITS.lon.max) p.lon = lon;
    if (radiusKm !== null && radiusKm >= LIMITS.radiusKm.min && radiusKm <= LIMITS.radiusKm.max) p.radiusKm = Math.round(radiusKm);

    return p;
  }, [form]);

  useEffect(() => {
    lastValidRef.current = { ...lastValidRef.current, ...preview };
  }, [preview]);

  const onChange = useCallback(<K extends keyof FormState>(key: K, value: string) => {
    setFormTouched(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runSearch = useCallback(async () => {
    setFetchError(null);
    setHasSearched(true);

    const result = validateForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    lastValidRef.current = result.params;

    // Zoom/Viewport der Karte erst nach explizitem "Suchen" anpassen.
    setFitToRadiusNonce((n) => n + 1);

    const query = makeQuery(result.params);

    setLoading(true);
    try {
      const res = await fetch(`/api/stations/nearby?${query}`, { method: 'GET' });
      if (!res.ok) throw new Error(`API Fehler: ${res.status} ${res.statusText}`);

      const data = (await res.json()) as StationApi[];
      const normalized = data.map(normalizeStation).filter((x): x is Station => x !== null);

      // Stationsnamen-Filter: case-insensitive + umlaut/diakritika-insensitive
      const qFold = foldForSearch(form.nameQuery);
      const filtered = qFold ? normalized.filter((s) => foldForSearch(s.name).includes(qFold)) : normalized;

      setStations(filtered);
    } catch (e) {
      setStations([]);
      setFetchError(e instanceof Error ? e.message : 'Unbekannter Fehler beim Laden der Stationen.');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const anyErrors = Object.keys(errors).length > 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Hinweis: KEIN eigener Page-Header/Footer mehr – wird global in app/layout.tsx gerendert */}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <h2 className="text-base font-semibold text-slate-100">Stationssuche</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field
            label="Latitude"
            value={form.lat}
            onChange={(v) => onChange('lat', v)}
            inputMode="decimal"
            placeholder="z. B. 52.52"
            error={errors.lat}
          />

          <Field
            label="Longitude"
            value={form.lon}
            onChange={(v) => onChange('lon', v)}
            inputMode="decimal"
            placeholder="z. B. 13.405"
            error={errors.lon}
          />

          <Field
            label={
              <>
                Radius in km <span className="font-normal text-slate-400">(Maximal {LIMITS.radiusKm.max} km)</span>
              </>
            }
            value={form.radiusKm}
            onChange={(v) => onChange('radiusKm', v)}
            inputMode="numeric"
            placeholder="z. B. 500"
            error={errors.radiusKm}
          />

          <Field
            label={
              <>
                Limit <span className="font-normal text-slate-400">(Maximal {LIMITS.limit.max} Stationen)</span>
              </>
            }
            value={form.limit}
            onChange={(v) => onChange('limit', v)}
            inputMode="numeric"
            placeholder="z. B. 10"
            error={errors.limit}
          />

          <Field label="Min Year" value={form.minYear} onChange={(v) => onChange('minYear', v)} inputMode="numeric" error={errors.minYear} />
          <Field label="Max Year" value={form.maxYear} onChange={(v) => onChange('maxYear', v)} inputMode="numeric" error={errors.maxYear} />

          {/* Suchfeld unter Limit/Min/Max, volle Breite wie der Button */}
          <Field
            className="md:col-span-3"
            label={
              <>
                Suche <span className="font-normal text-slate-400">(Stationsname)</span>
              </>
            }
            value={form.nameQuery}
            onChange={(v) => onChange('nameQuery', v)}
            placeholder="z. B. Bamberg"
          />
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600/80 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Suche läuft…' : 'Stationen suchen'}
          </button>

          <div className="mt-3 min-h-[1rem] text-sm">
            {fetchError ? (
              <span className="text-red-400">{fetchError}</span>
            ) : formTouched && anyErrors ? (
              <span className="text-red-400">Bitte prüfen Sie die Eingaben (Parameter sind ungültig).</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
          <h3 className="text-sm font-semibold text-slate-100">Gefundene Stationen</h3>

          <div className="mt-3 text-sm text-slate-300">
            {!hasSearched ? (
              <span className="text-slate-400">Keine Suche gestartet. Bitte Parameter eingeben und suchen.</span>
            ) : loading ? (
              <span className="text-slate-400">Lade Stationen…</span>
            ) : stations.length === 0 ? (
              <span className="text-slate-400">Keine Stationen gefunden.</span>
            ) : (
              <ul className="space-y-2">
                {stations.slice(0, 50).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/station/${encodeURIComponent(s.id)}`}
                      className="block rounded-lg border border-white/10 bg-black/10 px-3 py-2 hover:border-white/20 hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      aria-label={`Station öffnen: ${s.name} (${s.id})`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-100">{s.name}</div>
                          <div className="text-xs text-slate-400">
                            {s.id} · {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
                            {typeof s.distanceKm === 'number' ? ` · ${s.distanceKm.toFixed(1)} km` : ''}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">{s.firstYear && s.lastYear ? `${s.firstYear}–${s.lastYear}` : ''}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur">
          <h3 className="px-2 pb-3 text-sm font-semibold text-slate-100">Karte</h3>
          <div className="h-[360px] overflow-hidden rounded-xl border border-white/10">
            <StationsMap
              center={{ lat: preview.lat, lon: preview.lon }}
              radiusKm={preview.radiusKm}
              stations={stations}
              fitToRadiusNonce={fitToRadiusNonce}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Field(props: {
  className?: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className={props.className}>
      <label className="mb-1 block text-xs font-medium text-slate-200">{props.label}</label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-blue-500/60"
      />
      <div className="mt-1 min-h-[1rem] text-xs text-red-400">{props.error ?? ''}</div>
    </div>
  );
}