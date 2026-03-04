# Architecture Communication Canvas

> System: **GHCN Climate Explorer** (Web UI + API + DB + Initial Import)

![Architecture Communication Canvas](./architecture-communication-canvas.png)

## Value Proposition

* Schnelle Exploration von Temperaturdaten über **Geo‑Suche** (Stationen im Umkreis) – siehe **UC‑01**
* Intuitive Trend‑Visualisierung über **Jahres- und Saisonwerte** – siehe **UC‑03**
* **Reproduzierbare Demo** durch One‑shot NOAA‑Initialimport bis inkl. **2025** – siehe **UC‑04**
* Nach Import vollständig **offline** nutzbar (keine NOAA‑Abhängigkeit im Runtime‑Betrieb)
* Nachvollziehbare Architekturentscheidungen über ADRs

## Core Functions

1. Standort/Parameter erfassen (Lat/Lon, Radius, Limit, Zeitraum)
2. Stationen im Umkreis finden, sortiert nach Distanz (UC‑01)
3. Station auswählen (Liste oder Karte) und als Kontext setzen (UC‑02)
4. Station‑Aggregationen (Jahr/Saison) laden und visualisieren (UC‑03)
5. Datenbasis bereitstellen/aktualisieren (Initialimport bzw. Seed) inkl. Importstatus (UC‑04)

## Use‑Case Modell (Referenz)

* [UC‑01: Stationen im Umkreis finden](./use-cases/Use-Case%2001.md)
* [UC‑02: Station auswählen](./use-cases/Use-Case%2002.md)
* [UC‑03: Stationsdaten anzeigen (Grafik + Tabelle)](./use-cases/Use-Case%2003.md)
* [UC‑04: Datenbasis bereitstellen / aktualisieren](./use-cases/Use-Case%2004.md)

## Core Decisions

* **D1 – Tech Stack & Schichten (Web → API → DB)**

  * Referenz: [ADR 0001](./adr/0001-tech-stack.md)
  * Ziel: Wartbarkeit, Testbarkeit, klare Verantwortlichkeiten

* **D2 – Offline‑Demo Dataset (Initialimport bis 2025)**

  * Referenz: [ADR 0002](./adr/0002-offline-demo-dataset.md)
  * Ziel: Demo ohne externe Runtime‑Abhängigkeit

* **D3 – PostGIS statt Elasticsearch**

  * Referenz: [ADR 0003](./adr/0003-postgis-over-elasticsearch.md)
  * Ziel: geringere Infrastruktur‑Komplexität, trotzdem schnelle Geo‑Queries

* **D4 – Voraggregation Year/Season**

  * Referenz: [ADR 0004](./adr/0004-preaggregation-year-season.md)
  * Ziel: stabile < 3s Laufzeiten für Kernabfragen (UC‑03)

* **D5 – Caching (API‑LRU + React Query)**

  * Referenz: [ADR 0005](./adr/0005-caching-strategy.md)
  * Ziel: geringe Latenz und reduzierte DB‑Last bei Wiederhol‑Requests

## Components / Modules

* **Web UI (Next.js):** Form/Filter, Stationsliste, Kartenansicht, Charts + Tabellen
* **API (Fastify):** Endpunkte, Validierung, DB‑Queries, LRU‑Cache
* **DB (Postgres + PostGIS):** Stationen, Voraggregationen (Year/Season), Indizes
* **Importer (NOAA):** Download/Parsing/Filter bis 2025, Voraggregation, SeedMeta
* **Minimal‑Seed:** synthetische Testdatenbasis für CI und lokale Entwicklung
* **Shared Package:** Contracts, Zod‑Schemas, Utilities

## Technologies

* **Frontend:** Next.js 14, TypeScript, TailwindCSS, React Query, Leaflet, Apache ECharts
* **Backend:** Node 20, Fastify, Zod, Prisma, LRU‑Cache
* **Datenbank:** PostgreSQL 16, PostGIS, GiST
* **CI/CD:** Docker, Docker Compose, GitHub Actions, GHCR

## Key Stakeholders

* **Nutzer (Student/Dozent):** will Stationen finden und Trends schnell verstehen (UC‑01..UC‑03)
* **Auftraggeber/Prüfer:** will korrekte Umsetzung + nachvollziehbare Dokumentation
* **Projektteam:** will klare Basis für Implementierung/Tests (Use‑Cases + ADRs)
* **Technischer Consultant:** will robuste Architektur, Docker‑Betrieb, Fehlerbehandlung
* **Administrator/Projektteam:** stellt Datenbasis bereit (UC‑04)

## Quality Requirements

* **Performance:** Kernfunktionen < 3s; UI‑Interaktionen < 0,5s mit Feedback
* **Maintainability:** Schichten, Shared Contracts, ADRs
* **Testability:** Unit/Integration + Smoke/E2E; Seed für deterministische Tests
* **Installability:** docker compose, GHCR Images, GitHub Actions
* **Accessibility:** Tabellen als Alternative zu Charts, Keyboard‑Bedienung

## Business Context

* **User → Web UI → API → DB**
* **Web UI → OSM Tiles** (read‑only)
* **Importer → NOAA/NCEI** (nur Initialimport)

## Risiken & Maßnahmen

* **R1 Import scheitert (Netz/Format)**

  * Maßnahmen: robustes Logging, Retry, Importstatus (`/api/import/status`), „force import“

* **R2 Geo‑Query Performance**

  * Maßnahmen: PostGIS GiST Index, Limit/Radius, Caching

* **R3 OSM nicht erreichbar**

  * Maßnahmen: UI‑Hinweis; Kernfunktionen bleiben nutzbar

* **R4 Inkonsistente Saisonjahr‑Konvention (Winter)**

  * Maßnahmen: ADR 0004 + `docs/seed.md` dokumentieren Konventionen (NOAA‑Import vs. Minimal‑Seed)

## Verweise

* [README](../README.md)
* [Test Strategy](./test-strategy.md)
* [Minimal‑Seed](./seed.md)
