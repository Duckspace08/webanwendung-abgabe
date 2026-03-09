# GHCN Climate Explorer

Client-Server-Webanwendung zur Suche und Visualisierung von Temperaturdaten (TMIN/TMAX) aus **NOAA GHCN Daily**.

* **Web**: Next.js 14 (App Router), TypeScript, TailwindCSS, Leaflet + OpenStreetMap, Apache ECharts
* **API**: Fastify (Node.js 20), Zod-Validierung, Prisma, serverseitiger LRU-Cache
* **Datenhaltung**: PostgreSQL 16 + PostGIS (Geo-Queries, Distanzsortierung)
* **Importer**: One-shot NOAA-Initialimport (optional) + Offline-Betrieb über Demo-Dataset

Die funktionalen Anforderungen sind als Use-Cases beschrieben (`docs/use-cases/`). Die Architekturentscheidungen sind über ADRs dokumentiert (`docs/adr/`).

---

## Inhaltsverzeichnis

* [Quickstart (Docker, Build aus Source)](#quickstart-docker-build-aus-source)
* [Installation (Docker über GHCR)](#installation-docker-über-ghcr)
* [Konfiguration (Environment Variablen)](#konfiguration-environment-variablen)
* [Lokale Entwicklung](#lokale-entwicklung)
* [Performance-/Load-Test](#performance-load-test)
* [Testabdeckung](#testabdeckung)
* [Caching-Strategie (TTL, Key-Design)](#caching-strategie-ttl-key-design)
* [API Endpoints](#api-endpoints)
* [CI/CD](#cicd)
* [Projektstruktur (Monorepo)](#projektstruktur-monorepo)
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

### Welche Datenbasis wird verwendet?

Es gibt drei Betriebsarten:

1. **Offline-Demo-Dataset (empfohlen für Abnahme/Präsentation)**
   Voraggregierte Daten werden aus einem Archiv in die DB restored. Das ist der Standardfall für schnellen, reproduzierbaren Start ohne Internet.

2. **NOAA-Initialimport**
   Der Importer lädt NOAA-Daten und schreibt Voraggregationen. Das kann lange dauern und benötigt Internetzugriff.

3. **Minimal-Seed**
   Reproduzierbare Testdatenbasis für CI, lokale Entwicklung und Performance-Messungen. Diese Betriebsart wird nicht über den normalen Docker-Compose-Produktstart genutzt, sondern über `pnpm prisma db seed`.

Details zur Seed-Strategie: `docs/seed.md`.

### Was passiert beim ersten Start?

1. `db` startet (Postgres + PostGIS).
2. `seed_restore` stellt – falls vorhanden und aktiviert – ein **Offline-Demo-Dataset** aus `seed/offline-demo-db.sql.gz` wieder her.
3. `importer` führt Prisma-Migrations aus und startet optional den NOAA-Import (steuerbar über `NOAA_IMPORT_ENABLED`).
4. Danach starten `api` und `web`.

### Standard-Konfiguration in `.env.example`

Die Beispielkonfiguration ist auf **Offline-Seed** ausgelegt:

* `OFFLINE_SEED_ENABLED=1`
* `NOAA_IMPORT_ENABLED=0`

Damit funktioniert der Standardstart **nur dann direkt**, wenn das Archiv `seed/offline-demo-db.sql.gz` vorhanden ist.

### Ohne Archiv starten

Wenn kein Offline-Demo-Dataset vorhanden ist, muss für einen vollständigen Erstaufbau der NOAA-Import aktiviert werden:

```bash
OFFLINE_SEED_ENABLED=0 NOAA_IMPORT_ENABLED=1 docker compose up --build
```

### Was passiert bei späteren Starts?

* `seed_restore` überspringt die Wiederherstellung, wenn die DB bereits Daten enthält.
* `importer` erkennt `NOAA_IMPORT_ENABLED=0` oder einen bereits abgeschlossenen Import und beendet sich schnell.
* `api` und `web` starten normal.

### URLs

* Web: `http://localhost:3000`
* API Health: `http://localhost:3001/api/health`
* Import Status: `http://localhost:3001/api/import/status`

### Stop / Reset

```bash
docker compose down
```

**Komplett-Reset inkl. DB/Volumes (Achtung: löscht Daten)**

```bash
docker compose down -v
```

Hinweis: Das Verhalten entspricht dem System-Use-Case **UC-04** („Datenbasis bereitstellen/aktualisieren“).

---

## Installation (Docker über GHCR)

Diese Variante startet das System **ohne lokalen Build** ausschließlich über die vorgefertigten Container-Images aus der GitHub Container Registry.

### Start

```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

### Offline-Demo-Dataset aktiv nutzen

* Archiv ablegen: `seed/offline-demo-db.sql.gz`
* `docker-compose.ghcr.yml` enthält dieselbe `seed_restore`-Logik wie `docker-compose.yml`
* Standardmäßig versucht `seed_restore` beim Start zu restoren (konfigurierbar über `OFFLINE_SEED_*`)

### NOAA-Import optional aktivieren

Standardmäßig ist der NOAA-Import für Abnahme und Demo deaktiviert. Aktivieren:

```bash
OFFLINE_SEED_ENABLED=0 NOAA_IMPORT_ENABLED=1 docker compose -f docker-compose.ghcr.yml up -d
```

Optional: Import neu erzwingen:

```bash
OFFLINE_SEED_ENABLED=0 NOAA_IMPORT_ENABLED=1 NOAA_IMPORT_FORCE=1 docker compose -f docker-compose.ghcr.yml up -d
```

---

## Konfiguration (Environment Variablen)

Die wichtigsten Variablen werden über `.env` gesetzt bzw. im Compose weitergereicht.

### API / DB

* `DATABASE_URL` – Prisma-/DB-Connection-String
* `WEB_ORIGIN` – CORS Origin

### API Cache (LRU)

* `CACHE_TTL_MINUTES` – TTL in Minuten (Default: `10`)
* `CACHE_MAX_ENTRIES` – maximale Einträge (Default: `500`)

### Offline Demo Seed (voraggregierte Daten als Archiv)

* `OFFLINE_SEED_ENABLED` – Restore aus Archiv beim Start (Default: `1`)
* `OFFLINE_SEED_FILE` – Pfad im Container (Default: `/repo/seed/offline-demo-db.sql.gz`)
* `OFFLINE_SEED_FORCE` – erzwingt Restore auch bei vorhandenen Daten

Wichtig: Das Archiv muss ein **PUBLIC-Schema-Dump** der Anwendungsdatenbank sein.

### Importer (NOAA)

* `NOAA_IMPORT_ENABLED` – Import aktivieren/deaktivieren
* `NOAA_IMPORT_FORCE` – Import erzwingen
* `NOAA_END_YEAR` (Default `2025`) – letztes Jahr für Initialimport
* `NOAA_CACHE_DIR` – Cache-Verzeichnis
* `NOAA_PURGE_SYNTHETIC` – synthetische Seed-Daten nach erfolgreichem Import löschen

### Web

* `NEXT_PUBLIC_API_BASE_URL` – API-Base-URL (Default: `http://localhost:3001`)

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

Die lokale Seed entspricht dem Use-Case-Flow aus **UC-04** und unterstützt die Kern-Use-Cases **UC-01** bis **UC-03**.

---

## Performance-/Load-Test

### Ziel

Ein reproduzierbarer Performance-/Load-Test validiert die **Kernendpunkte** gegen die gleiche Testdatenbasis wie in CI (Minimal-Seed):

* `GET /api/stations/nearby` (Use-Case **UC-01**)
* `GET /api/stations/:id/aggregates` (Use-Case **UC-03**)

Das Skript gibt messbare Kennzahlen aus, u. a. **RPS**, **avg**, **p90**, **p95**, **p99**, **err**.

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

Das Skript nutzt typische Parameter und eine Seed-Station (Standard: `DE-001`). Details zur Datenbasis siehe `docs/seed.md`.

---

## Testabdeckung

### Ausführung

Tests:

```bash
pnpm test
```

Coverage:

```bash
pnpm test:coverage
```

### Coverage-Reports

Vitest erzeugt pro Package einen Coverage-Report unter:

* `packages/shared/coverage/`
* `apps/api/coverage/`
* `apps/web/coverage/`

### CI

Der CI-Workflow führt zusätzlich zu `pnpm test` auch `pnpm test:coverage` aus und lädt den HTML-/lcov-Report als Artifact **coverage-report** hoch.

Hinweis: Coverage-Kennzahlen ändern sich durch Commits. Für den aktuellen Stand bitte den letzten CI-Run verwenden.

---

## Caching-Strategie (TTL, Key-Design)

Die Anwendung nutzt zwei Cache-Ebenen:

### 1) API-LRU-Cache (Server-Side)

* Cacht Antworten der Endpunkte

  * `GET /api/stations/nearby` (UC-01)
  * `GET /api/stations/:id/aggregates` (UC-03)
* TTL: `CACHE_TTL_MINUTES` (Default: 10 Minuten)
* Max Entries: `CACHE_MAX_ENTRIES` (Default: 500)
* Cache-Keys basieren auf stabil serialisierten Query-Parametern (alphabetisch sortierte Keys)

### 2) React Query Cache (Client-Side)

* Standardkonfiguration:

  * `staleTime = 60s`
  * `retry = 1`

Details siehe ADR **0005**.

---

## API Endpoints

* `GET /api/health` – Healthcheck
* `GET /api/import/status` – Importstatus (UC-04)
* `GET /api/stations/nearby` – Nearby-Search (UC-01)
* `GET /api/stations/:id/aggregates` – Voraggregationen Jahr/Saison (UC-03)

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

Tagging:

* `latest`
* `sha-<commit>`

---

## Projektstruktur (Monorepo)

* `apps/api` – Fastify API + Importer + Prisma
* `apps/web` – Next.js Frontend
* `packages/shared` – Shared Types/Logic (Contracts, Schemas)
* `prisma` – Schema, Migrations, Seed
* `tests` – Playwright E2E (Smoke)
* `tools/perf` – Performance-/Load-Test (`pnpm perf`)

---

## Troubleshooting

### Offline-Demo-Dataset wird nicht verwendet

* Prüfen, ob das Archiv vorhanden ist: `seed/offline-demo-db.sql.gz`
* Prüfen, ob `OFFLINE_SEED_ENABLED=1` gesetzt ist
* Prüfen, ob `OFFLINE_SEED_FILE=/repo/seed/offline-demo-db.sql.gz` gesetzt ist

### NOAA-Import statt Offline-Restore nutzen

```bash
OFFLINE_SEED_ENABLED=0 NOAA_IMPORT_ENABLED=1 docker compose up --build
```

### Import erneut erzwingen

```bash
OFFLINE_SEED_ENABLED=0 NOAA_IMPORT_ENABLED=1 NOAA_IMPORT_FORCE=1 docker compose up --build
```

### Komplett zurücksetzen

```bash
docker compose down -v
docker compose up --build
```

### Archiv neu erzeugen

Nach abgeschlossenem NOAA-Import:

```bash
docker compose exec -T db sh -c 'pg_dump -U postgres -d ghcn --no-owner --no-privileges --schema=public' | gzip > seed/offline-demo-db.sql.gz
```

---

## Dokumentation

### Use-Cases (funktionale Anforderungen)

* `docs/use-cases/Use-Case 01.md` – Stationen im Umkreis finden (UC-01)
* `docs/use-cases/Use-Case 02.md` – Station auswählen (UC-02)
* `docs/use-cases/Use-Case 03.md` – Stationsdaten anzeigen (UC-03)
* `docs/use-cases/Use-Case 04.md` – Datenbasis bereitstellen/aktualisieren (UC-04)

### Architektur

* `docs/architecture-communication-canvas.md`
* `docs/test-strategy.md`
* `docs/seed.md`

### ADRs

* `docs/adr/0001-tech-stack.md`
* `docs/adr/0002-offline-demo-dataset.md`
* `docs/adr/0003-postgis-over-elasticsearch.md`
* `docs/adr/0004-preaggregation-year-season.md`
* `docs/adr/0005-caching-strategy.md`

---

## Hinweis

Dieses Repository dient einer Projektabgabe im Hochschulkontext. Es ist nicht als produktiver Dienstbetrieb vorgesehen.
