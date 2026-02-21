# GHCN Climate Explorer

Client-Server-Webanwendung zur Suche und Visualisierung von NOAA **GHCN Daily** Temperaturdaten (Min/Max) weltweit verteilter Wetterstationen.

* **Web**: Next.js 14 (App Router), TypeScript, TailwindCSS, Apache ECharts, Leaflet + OpenStreetMap
* **API**: Fastify (Node.js 20), Zod-Validierung, LRU Cache, Prisma
* **Datenhaltung**: PostgreSQL + PostGIS (Geo-Queries/Geodistanz)
* **Importer**: One-shot NOAA Initialimport (bis inkl. 2025) + Offline-Start danach (SeedMeta)

---

## Inhaltsverzeichnis

* [Quickstart (Docker, Build aus Source)](#quickstart-docker-build-aus-source)
* [Installation (Docker über GHCR)](#installation-docker-über-ghcr)
* [Konfiguration (Environment Variablen)](#konfiguration-environment-variablen)
* [Lokale Entwicklung](#lokale-entwicklung)
* [Performance-/Load-Test](#performanceload-test)
* [Testabdeckung](#testabdeckung)
* [Caching-Strategie (TTL, Key-Design)](#caching-strategie-ttl-key-design)
* [API Endpoints (Auszug)](#api-endpoints-auszug)
* [CI/CD](#cicd)
* [Projektstruktur](#projektstruktur-monorepo)
* [Troubleshooting](#troubleshooting)
* [Dokumentation](#dokumentation)

---

## Quickstart (Docker, Build aus Source)

### Voraussetzungen

* Docker Desktop (inkl. Docker Compose v2)

### Start

```bash
cp .env.example .env
docker compose up --build
```

### Was passiert beim ersten Start?

1. `db` startet (Postgres + PostGIS).
2. `importer` lädt NOAA-Daten und schreibt Voraggregationen (kann je nach Maschine/Netzwerk lange dauern).
3. Danach starten `api` und `web`.

### Was passiert bei späteren Starts?

* `importer` erkennt `SeedMeta=COMPLETED` und beendet sich sofort.
* `api`/`web` starten normal und schnell.

### URLs

* Web: [http://localhost:3000](http://localhost:3000)
* API Health: [http://localhost:3001/api/health](http://localhost:3001/api/health)
* Import Status: [http://localhost:3001/api/import/status](http://localhost:3001/api/import/status)

### Stop / Reset

```bash
docker compose down
```

⚠️ **Komplett-Reset inkl. DB/Cache (Achtung: löscht Daten!)**

```bash
docker compose down -v
```

---

## Installation (Docker über GHCR)

Diese Variante startet das System **ohne lokalen Build** ausschließlich über die vorgefertigten Container-Images aus GitHub Container Registry.

### Voraussetzungen

* Docker Desktop (inkl. Docker Compose v2)

### Start

```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

### Aufruf

* Web: [http://localhost:3000](http://localhost:3000)
* API Health: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### NOAA Import optional aktivieren

Standardmäßig ist der Import für die Abnahme **deaktiviert** (schneller Start). Aktivieren:

```bash
NOAA_IMPORT_ENABLED=1 docker compose -f docker-compose.ghcr.yml up -d
```

Optional: Cache/Neuimport erzwingen:

```bash
NOAA_IMPORT_ENABLED=1 NOAA_IMPORT_FORCE=1 docker compose -f docker-compose.ghcr.yml up -d
```

---

## Konfiguration (Environment Variablen)

Die wichtigsten Variablen werden über `.env` gesetzt bzw. im Compose weitergereicht.

### API / DB

* `DATABASE_URL` – Prisma/DB-Connection-String
* `WEB_ORIGIN` – CORS Origin

### API Cache (LRU)

* `CACHE_TTL_MINUTES` – TTL in Minuten (Default: `10`)
* `CACHE_MAX_ENTRIES` – max. Einträge (Default: `500`)

### Importer (NOAA)

* `NOAA_IMPORT_ENABLED` (Default `1` im Dev-Compose / Default `0` in GHCR-Compose)
* `NOAA_IMPORT_FORCE` (Default `0`) – Import erzwingen (auch wenn SeedMeta COMPLETED)
* `NOAA_END_YEAR` (Default `2025`) – letztes Jahr für Initialimport
* `NOAA_CACHE_DIR` – Cache-Verzeichnis

---

## Lokale Entwicklung

### Voraussetzungen

* Node.js 20
* pnpm
* Docker (für DB)

### Ablauf

```bash
cp .env.example .env
docker compose up -d db

pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed

pnpm dev
```

---

## Performance-/Load-Test

### Ziel

Ein reproduzierbarer Performance-/Load-Test validiert die **Kernendpunkte** gegen die gleiche Testdatenbasis wie in CI (Minimal-Seed):

* `GET /api/stations/nearby`
* `GET /api/stations/:id/aggregates`

Das Skript gibt messbare Kennzahlen aus (**avg**, **p90**, **p95**).

### Run-Befehl

```bash
pnpm perf
```

### Voraussetzungen

* API läuft lokal (Default: `http://localhost:3001`)
* DB ist migriert und befüllt:

  * `pnpm prisma migrate deploy`
  * `pnpm prisma db seed`

### Parameter / Testdatenbasis

Das Skript nutzt „typische“ Parameter und eine Seed-Station (Standard: `DE-001`). Details zur Datenbasis siehe: `docs/seed.md`.

### Konfiguration (optional)

* `PERF_BASE_URL` (Default: `http://localhost:3001`)
* `PERF_CONNECTIONS` (Default: `20`)
* `PERF_DURATION_SECONDS` (Default: `15`)
* `PERF_WARMUP_SECONDS` (Default: `5`)

### Gemessene Ergebnisse

> Hinweis: Bitte nach dem ersten Lauf `pnpm perf` die Messwerte hier eintragen.
> In CI/Abnahme muss nachvollziehbar dokumentiert sein, dass die Kernfunktionen die Zielwerte einhalten.

Beispiel-Format (einzutragen):

| Endpoint                       | avg (ms) | p90 (ms) | p95 (ms) | Ziel      | Erfüllt |
| ------------------------------ | -------: | -------: | -------: | --------- | ------- |
| `/api/stations/nearby`         |     TODO |     TODO |     TODO | < 3000 ms | TODO    |
| `/api/stations/:id/aggregates` |     TODO |     TODO |     TODO | < 3000 ms | TODO    |

---

## Testabdeckung

### Ausführung

* Tests:

```bash
pnpm test
```

* Coverage:

```bash
pnpm test:coverage
```

### Coverage-Reports

Vitest erzeugt pro Package einen Coverage-Report unter:

* `packages/shared/coverage/`
* `apps/api/coverage/`
* `apps/web/coverage/`

### CI

Der CI-Workflow führt **zusätzlich** zu `pnpm test` auch `pnpm test:coverage` aus und lädt den HTML/lcov-Report als Artifact **coverage-report** hoch.

### Aktuelle Coverage-Kennzahl

> Hinweis: Bitte die Kennzahl nach einem `pnpm test:coverage` Lauf aktualisieren.

* Gesamt (Lines): **TODO%**

---

## Caching-Strategie (TTL, Key-Design)

Die Anwendung nutzt zwei Cache-Ebenen mit klarer Abgrenzung:

### 1) API-LRU-Cache (Server-Side)

**Welche Endpunkte werden gecached?**

* `GET /api/stations/nearby`
* `GET /api/stations/:id/aggregates`

**TTL und Parameter**

* TTL: **10 Minuten** (`CACHE_TTL_MINUTES`, Default `10`)
* Max Entries: `CACHE_MAX_ENTRIES` (Default `500`)

**Key-Design**

* Nearby: `nearby:<stable-json(query-params)>`
* Aggregates: `aggregate:<stationId>:<stable-json(query-params)>`

Dabei werden Query-Parameter stabil serialisiert (Keys alphabetisch sortiert), um Cache-Misses durch unterschiedliche Key-Reihenfolge zu vermeiden.

### 2) Frontend React-Query Cache (Client-Side)

* React Query cached HTTP-Responses clientseitig basierend auf `queryKey`.
* Default-Konfiguration (siehe `apps/web/components/Providers.tsx`):

  * `staleTime = 60s`
  * `retry = 1`

**Abgrenzung**

* **API-LRU-Cache** reduziert DB-Last und garantiert schnelle Antworten auch bei mehreren Clients.
* **React-Query-Cache** verbessert UX (weniger Refetches, schnelle Navigation), ersetzt aber nicht den API-Cache.

---

## API Endpoints (Auszug)

* `GET /api/health` – Healthcheck
* `GET /api/import/status` – Status des Imports/SeedMeta
* `GET /api/stations/nearby` – Nearby-Search (Geo)
* `GET /api/stations/:id/aggregates` – Voraggregationen (Jahr/Jahreszeiten)

---

## CI/CD

### CI

Der CI-Workflow (`.github/workflows/ci.yml`) führt aus:

* Install
* Prisma migrate + seed (Minimal-Seed)
* Lint
* Test
* Coverage (Artifact Upload)
* Build

Hinweis: CI bleibt bewusst schnell und nutzt das Minimal-Seed; der NOAA-Import wird dort nicht ausgeführt.

### Container Images (GHCR)

Der Image-Workflow (`.github/workflows/images.yml`) baut und pusht Images bei:

* `push` auf `main`
* `push` von Tags `v*.*.*`

Images:

* `ghcr.io/<owner>/<repo>-api`
* `ghcr.io/<owner>/<repo>-web`

Tagging:

* `latest`
* `sha-<commit>` (eindeutig rückverfolgbar)

**Verifikation (Prüfer)**

* GitHub Repository → **Packages** → gewünschtes Image auswählen
* Prüfen, dass sowohl `latest` als auch `sha-...` Tags vorhanden sind.

---

## Projektstruktur (Monorepo)

* `apps/api` – Fastify API + Importer + Prisma
* `apps/web` – Next.js Frontend
* `packages/shared` – Shared Types/Logic
* `prisma` – Schema, Migrations, Seed
* `tests` – Playwright E2E (Smoke)
* `tools/perf` – Performance-/Load-Test (`pnpm perf`)

---

## Troubleshooting

### Import dauert sehr lange / wirkt „hängend“

* Beim Erststart ist das erwartbar (Initialimport).
* Prüfen Sie den Import-Status: `http://localhost:3001/api/import/status`

### Import erneut erzwingen

```bash
NOAA_IMPORT_FORCE=1 docker compose up --build
```

### Komplett zurücksetzen

```bash
docker compose down -v
docker compose up --build
```

---

## Dokumentation

* **Architecture Communication Canvas**: `docs/architecture-communication-canvas.md`
* **Canvas (PNG)**: `docs/architecture-communication-canvas.png`
* **Teststrategie**: `docs/test-strategy.md`
* **Minimal-Seed**: `docs/seed.md`
* **ADRs**:

  * `docs/adr/0001-tech-stack.md`
  * `docs/adr/0002-offline-demo-dataset.md`
  * `docs/adr/0003-postgis-over-elasticsearch.md`
  * `docs/adr/0004-preaggregation-year-season.md`
  * `docs/adr/0005-caching-strategy.md`

![Architecture Communication Canvas](docs/architecture-communication-canvas.png)

---

## Hinweis

Dieses Repository dient einer Projektabgabe im Hochschulkontext. Es ist nicht als produktiver Dienstbetrieb vorgesehen.
