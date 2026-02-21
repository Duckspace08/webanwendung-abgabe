#!/usr/bin/env node

import { performance } from 'node:perf_hooks';

/**
 * Reproduzierbarer Performance-/Load-Test.
 *
 * Ziel:
 * - Kernendpunkte gegen die gleiche Testdatenbasis wie in CI (Prisma Minimal-Seed) ausführen.
 * - Messwerte für avg, p90 und p95 ausgeben.
 *
 * Keine externe Dependency (bewusst), damit `pnpm install --frozen-lockfile` unverändert bleibt.
 */

const BASE_URL = process.env.PERF_BASE_URL ?? 'http://localhost:3001';

const DEFAULT_NEARBY_PARAMS = {
  lat: 52.52,
  lon: 13.405,
  radiusKm: 500,
  limit: 10,
  minYear: 2018,
  maxYear: 2025,
};

const DEFAULT_AGGREGATES_PARAMS = {
  fromYear: 2018,
  toYear: 2025,
};

const settings = {
  // „typische“ parallele Nutzung für Demo/Abnahme
  connections: Number(process.env.PERF_CONNECTIONS ?? 20),
  durationSeconds: Number(process.env.PERF_DURATION_SECONDS ?? 15),
  warmupSeconds: Number(process.env.PERF_WARMUP_SECONDS ?? 5),
  // Schutz gegen Hänger
  timeoutMs: Number(process.env.PERF_TIMEOUT_MS ?? 5000),
};

function toQueryString(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => usp.set(k, String(v)));
  return usp.toString();
}

async function withTimeout(promise, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function assertHealth() {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`API healthcheck failed: ${response.status} ${response.statusText}`);
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function summarize(latenciesMs) {
  if (latenciesMs.length === 0) {
    return { avg: null, p90: null, p95: null, p99: null };
  }
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const sum = latenciesMs.reduce((acc, v) => acc + v, 0);
  return {
    avg: sum / latenciesMs.length,
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

async function runPhase(url, durationSeconds, connections) {
  const endAt = Date.now() + durationSeconds * 1000;
  const latencies = [];
  let okCount = 0;
  let errorCount = 0;

  const worker = async () => {
    while (Date.now() < endAt) {
      const started = performance.now();

      try {
        await withTimeout(async (signal) => {
          const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          // Body lesen, um realistische Latenzen zu messen
          await response.arrayBuffer();
        }, settings.timeoutMs);

        okCount += 1;
      } catch {
        errorCount += 1;
      } finally {
        const took = performance.now() - started;
        latencies.push(took);
      }
    }
  };

  await Promise.all(Array.from({ length: connections }, () => worker()));

  const summary = summarize(latencies);
  const rps = (okCount + errorCount) / durationSeconds;

  return {
    okCount,
    errorCount,
    total: okCount + errorCount,
    rps,
    ...summary,
  };
}

function fmt(ms) {
  if (ms === null) return 'n/a';
  return `${Math.round(ms)}ms`;
}

async function resolveStationId() {
  const url = `${BASE_URL}/api/stations/nearby?${toQueryString(DEFAULT_NEARBY_PARAMS)}`;
  const response = await fetch(url);
  if (!response.ok) return 'DE-001';
  const stations = await response.json();
  if (!Array.isArray(stations) || stations.length === 0) return 'DE-001';
  return String(stations[0].id ?? 'DE-001');
}

async function runEndpoint(name, url) {
  // Warmup
  if (settings.warmupSeconds > 0) {
    await runPhase(url, settings.warmupSeconds, settings.connections);
  }

  const result = await runPhase(url, settings.durationSeconds, settings.connections);

  console.log(`\n=== ${name} ===`);
  console.log(`URL: ${url}`);
  console.log(`Requests: ${result.total} total (ok=${result.okCount}, err=${result.errorCount})`);
  console.log(`RPS: ${result.rps.toFixed(1)}`);
  console.log(`Latency: avg=${fmt(result.avg)} p90=${fmt(result.p90)} p95=${fmt(result.p95)} p99=${fmt(result.p99)}`);

  return result;
}

async function main() {
  console.log('GHCN Climate Explorer – Performance-/Load-Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(
    `Connections: ${settings.connections}, Duration: ${settings.durationSeconds}s, Warmup: ${settings.warmupSeconds}s, Timeout: ${settings.timeoutMs}ms`,
  );

  await assertHealth();

  const nearbyUrl = `${BASE_URL}/api/stations/nearby?${toQueryString(DEFAULT_NEARBY_PARAMS)}`;
  await runEndpoint('GET /api/stations/nearby', nearbyUrl);

  const stationId = await resolveStationId();
  const aggregatesUrl = `${BASE_URL}/api/stations/${encodeURIComponent(stationId)}/aggregates?${toQueryString(
    DEFAULT_AGGREGATES_PARAMS,
  )}`;
  await runEndpoint(`GET /api/stations/:id/aggregates (id=${stationId})`, aggregatesUrl);

  console.log('\nHinweis: Die Ausgabe enthält avg/p90/p95. Dokumentieren Sie die Messwerte in README.md (Abschnitt Performance).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});