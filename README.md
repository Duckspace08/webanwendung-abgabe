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
* [Tests & Quality Gates](#tests--quality-gates)
* [API Endpoints (Auszug)](#api-endpoints-auszug)
* [CI/CD](#cicd)
* [Projektstruktur](#projektstruktur)
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

## Tests & Quality Gates

```bash
pnpm lint
pnpm test
pnpm build
```

---

## API Endpoints (Auszug)

* `GET /api/health` – Healthcheck
* `GET /api/import/status` – Status des Imports/SeedMeta
* `GET /api/stations/nearby` – Nearby-Search (Geo)
* `GET /api/stations/:id/aggregates` – Voraggregationen (Jahr/Jahreszeiten)

---

## CI/CD

### CI

Der CI-Workflow führt aus:

* Install
* Prisma migrate + seed
* Lint
* Test
* Build

Hinweis: CI bleibt bewusst schnell und nutzt das Minimal-Seed; der NOAA-Import wird dort nicht ausgeführt.

### Container Images (GHCR)

Für `main` werden Images gebaut und nach GHCR gepusht:

* `ghcr.io/<owner>/<repo>-api`
* `ghcr.io/<owner>/<repo>-web`

Tags:

* `latest`
* `sha-<commit>`

---

## Projektstruktur (Monorepo)

* `apps/api` – Fastify API + Importer + Prisma
* `apps/web` – Next.js Frontend
* `packages/shared` – Shared Types/Logic
* `prisma` – Schema, Migrations, Seed

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

- **Architecture Communication Canvas**: [docs/architecture-communication-canvas.md](docs/architecture-communication-canvas.md)
- **Canvas (PNG)**: [docs/architecture-communication-canvas.png](docs/architecture-communication-canvas.png)
- **ADRs**:
  - [0001 Tech Stack](docs/adr/0001-tech-stack.md)
  - [0002 NOAA Initialimport bis 2025 + Offline](docs/adr/0002-offline-demo-dataset.md)
  - [0003 PostGIS statt Elasticsearch](docs/adr/0003-postgis-over-elasticsearch.md)
  - [0004 Voraggregation Year/Season](docs/adr/0004-preaggregation-year-season.md)
  - [0005 Caching-Strategie](docs/adr/0005-caching-strategy.md)

![Architecture Communication Canvas](docs/architecture-communication-canvas.png)

---

## Hinweis

Dieses Repository dient einer Projektabgabe im Hochschulkontext. Es ist nicht als produktiver Dienstbetrieb vorgesehen.
