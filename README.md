# GHCN Climate Explorer

Client-Server-Webanwendung zur Suche und Visualisierung von NOAA GHCN Daily Temperaturdaten.

## Überblick

- **Web**: Next.js 14 (App Router), TypeScript, TailwindCSS, Apache ECharts, Leaflet + OpenStreetMap.
- **API**: Fastify (Node.js 20), Zod-Validierung, LRU Cache, Prisma.
- **Datenhaltung**: PostgreSQL 16 + PostGIS, Voraggregation (Yearly/Seasonal).
- **Importer**: One-shot NOAA Initialimport bis einschließlich 2025.

## Docker Setup

```bash
cp .env.example .env
docker compose up --build
```

Ablauf beim ersten Start:

1. `db` startet.
2. `importer` lädt NOAA-Daten und schreibt Voraggregationen (kann lange dauern).
3. Danach starten `api` und `web`.

Ablauf bei späteren Starts:

- `importer` erkennt `SeedMeta=COMPLETED` und beendet sich sofort.
- `api`/`web` starten normal und schnell.

Öffne:
- Web: http://localhost:3000
- API Health: http://localhost:3001/api/health
- Import Status: http://localhost:3001/api/import/status

## Lokale Entwicklung

```bash
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm dev
```

> `prisma db seed` ist ein synthetischer Fast-Mode für lokale Entwicklung/CI.
> Der produktive NOAA-Import läuft über `apps/api/src/importer/noaa.ts`.

## CI Verhalten

- CI bleibt schnell und nutzt weiterhin das synthetische Minimal-Seed.
- NOAA-Import wird in CI deaktiviert (`NOAA_IMPORT_ENABLED=0`).

## Tests

```bash
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

## Architekturentscheidungen

- ADR 0001: Tech Stack
- ADR 0002: NOAA Initialimport bis 2025 + Offline danach
- ADR 0003: PostGIS
- ADR 0004: Voraggregation Year/Season
- ADR 0005: Caching-Strategie
