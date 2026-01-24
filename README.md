# GHCN Climate Explorer

Offline-demonstrierbare Client-Server-Webanwendung zum Durchsuchen und Visualisieren synthetischer GHCN Daily Temperaturdaten.

## Überblick

- **Web**: Next.js 14 (App Router), TypeScript, TailwindCSS, Apache ECharts, Leaflet + OpenStreetMap.
- **API**: Fastify (Node.js 20), Zod-Validierung, LRU Cache, Prisma.
- **Datenhaltung**: PostgreSQL 16 + PostGIS, Voraggregation (Yearly/Seasonal).

## Installation (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Öffne:
- Web: http://localhost:3000
- API Health: http://localhost:3001/api/health

## Architekturentscheidungen (Kurzfassung)

1. **Offline Demo Dataset**: Alle NOAA/GHCN-Daten werden synthetisch per Seed generiert, keine Runtime-Abhängigkeit.
2. **PostGIS**: Distanzsuche via `ST_DWithin` und `ST_Distance` direkt in der Datenbank.
3. **Voraggregation**: Yearly/Seasonal Aggregates werden beim Seed erzeugt.
4. **Strikte Trennung**: `apps/web` und `apps/api` als getrennte Services.
5. **LRU Cache**: API-Caching mit 10 Minuten TTL für Stationssuche & Aggregationsabfragen.

## Verzeichnisse

- `apps/web`: Next.js Frontend
- `apps/api`: Fastify Backend
- `packages/shared`: Zod-Schemas, Aggregations-Utils
- `prisma`: Schema, Migration, Seed
- `docs/adr`: Architekturentscheidungen

## Lokale Entwicklung

```bash
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm dev
```

## Tests

```bash
pnpm test
pnpm test:coverage
pnpm e2e
```

## NOAA/GHCN Hinweise

Die Datenbasis ist synthetisch, folgt aber GHCN Daily Strukturen. Eine Anbindung an NOAA
ist bewusst als optionale Erweiterung dokumentiert, damit die Anwendung offline stabil bleibt.
