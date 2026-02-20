# Architecture Communication Canvas

> System: **GHCN Climate Explorer** (Web UI + API + DB + Initial Import)

![Architecture Communication Canvas](./ArchitectureCommunicationCanvas%20-%20Arc42%20final-acc-with-fa-icons.png)

## Value Proposition

* Schnelle Exploration von Temperaturdaten über **Geo-Suche** (Radius um Koordinate)
* Verständliche Trend-Visualisierung (**Jahres- und Saisonsmittel**) direkt in der Weboberfläche
* **First-Time-Startup Import** der NOAA/NCEI GHCN-Daily Daten (bis inkl. **2025**) für eine sofort nutzbare Demo
* **Stabile Laufzeit**: Nach dem Import keine externe Datenquelle erforderlich
* Demo/Verwendung **unabhängig von NOAA-Verfügbarkeit** (nach Initialimport)
* Transparente Architekturentscheidungen über ADRs, klare Schichten **Web / API / DB**

## Core Functions

1. Stationssuche nach **Lat/Lon + Radius + Limit**, Distanzsortierung
2. Zeitraumfilter über Stationsverfügbarkeit (**minYear / maxYear**)
3. Saisondurchschnitt anzeigen (Meta: Nordhalbk., Koordinaten, Zeitraum)
4. Jahresaggregate (avg **Tmin/Tmax** + **daysCount**) abrufen und visualisieren
5. Kartensnapshot (Spring/Map + Chart/Min/Max) abrufen und visualisieren
6. Stationsansicht mit Station-Summary + Filterwerten
7. Systemstatus prüfen (**/api/health**)
8. Initialer Datenimport (one-time):

   * Download GHCN Daily (NOAA/NCEI)
   * Parsing/Filter (bis 2025; benötigte Variablen z. B. Tmin/Tmax)
   * Bulk Load
   * Voraggregation
   * Indexe
   * Snapshot-Metadaten (seed_meta)

## Core Decisions

> „Good or Bad“ im Sinne: Entscheidung mit bewussten Trade-offs.

* **D1 – Schichten Web → API → DB** (ADR 0001)

  * Warum: klare Verantwortlichkeiten, Wartbarkeit, Testbarkeit
  * Konsequenzen: definierte Schnittstellen (**HTTP/JSON**, **SQL**), saubere Boundarys
* **D2 – First-Time-Startup Import, danach Offline-Betrieb (Stand 2025)** (ADR 0002)

  * Warum: Demo ohne externe Abhängigkeiten, wiederholbar
  * Konsequenzen: Seed/Import-DB, weniger Laufzeit-Last; lokaler Import möglich
* **D3 – PostGIS statt zusätzlichem Geo-Server / Elasticsearch** (ADR 0003)

  * Warum: Geo-Query teils raw SQL, aber kapselbar/testbar; eine DB als „Single Source“
  * Konsequenzen: keine zusätzliche Infrastruktur; DB muss PostGIS/Indexes korrekt haben
* **D4 – Voraggregation Year/Season statt Live-Aggregation** (ADR 0004)

  * Warum: Performance; schnelle API-Antworten bei wiederholten Aggregatabfragen
  * Konsequenzen: weniger flexible Ad-hoc Aggregationen; Import/Build-Step erzeugt Aggregatstände
* **D5 – Caching (LRU in API + React Query im UI)** (ADR 0005)

  * Warum: geringe Latenz, reduzierte DB-Last, „glättet“ wiederholte Requests
  * Konsequenzen: TTL/Invalidation berücksichtigen (hier unkritisch wegen statischem Datenstand)

**Verlinkte ADRs**

* [ADR 0001: Tech Stack](./adr/0001-tech-stack.md)
* [ADR 0002: NOAA Initialimport bis 2025 + Offline danach](./adr/0002-offline-demo-dataset.md)
* [ADR 0003: PostGIS statt Elasticsearch](./adr/0003-postgis-over-elasticsearch.md)
* [ADR 0004: Voraggregation Year/Season](./adr/0004-preaggregation-year-season.md)
* [ADR 0005: Caching-Strategie](./adr/0005-caching-strategy.md)

## Technologies

* **Frontend:** Next.js 14, TypeScript, TailwindCSS, React Query, Leaflet, ECharts
* **Backend:** Node 20, Fastify, TypeScript, Zod, Prisma, LRU Cache
* **Datenbank:** PostgreSQL 16, PostGIS, GiST Index
* **Import:** Node/TS Importer (Streaming/Bulk Insert), Snapshot-Metadaten (seed_meta)
* **Container/CI:** Docker, Docker Compose, GitHub Actions, GHCR

## Key Stakeholders

* **Demo-Nutzer:in (Explorer):** nutzt Suche/Filter/Visualisierung ohne Anleitung
* **Dozent/Reviewer:** bewertet Architektur, Nachvollziehbarkeit, Quality
* **Requirements/Risiken/Entscheider:** bewertet Trade-offs (Offline-Demo, Pre-Aggregation, PostGIS)
* **Entwickler:in/Maintainer:** Erweiterbarkeit (z. B. inkrementelle Updates), Testbarkeit, klare Schnittstellen
* **Betrieb/CI:** GitHub Actions als Ausführungsumgebung für Build/Test/Publishing
* **Datenprovider (NOAA/NCEI):** liefert GHCN-Daily Rohdaten für einmaligen Import
* **Externer Provider:** OSM Tiles (read-only) für Kartenkacheln

## Quality Requirements

* **Performance (API):** Kernabfragen i. d. R. < **2–3 s**

  * Hebel: Voraggregation + PostGIS GiST Index + API LRU Cache
* **Responsiveness (UI):** Interaktionen i. d. R. < **0,5 s** mit Feedback (Loading/Skeleton)

  * Hebel: React Query Cache + UI Loading States
* **Reliability (nach Import):** Laufzeit ohne NOAA; OSM-Ausfall degradiert primär nur Karte

  * Hebel: Graceful Degradation (Hinweis im UI), lokale DB als Kern
* **Installability/Portability:** Start per docker compose; reproduzierbare Umgebung

  * Hebel: Containerimages + dokumentierte Setup-Schritte
* **Maintainability:** klare Schichtung + Shared Contracts

  * Hebel: TS End-to-End + shared package (Zod/Types) + ADRs
* **Startup Time:** nicht kritisch; Fokus auf stabile Laufzeit
* **Accessibility:** semantisches HTML, klare Lade-/Fehlerzustände
* **Observability:** strukturierte Logs (Import & API), Healthcheck (**/api/health**), klare Fehlermeldungen

## Business Context

### Externe Interfaces / Nachbarsysteme

* **User (Browser) → Web UI**
* **Web UI → OSM Tile Server** (HTTP Tile Requests, read-only)
* **Initial Import → NOAA/NCEI GHCN Daily** (Download einmalig)
* **Web UI → API** (HTTP/JSON)
* **API → DB** (SQL/PostGIS)

### Wichtigster Abgrenzungssatz

* NOAA wird nur für den **Initialimport** genutzt; im Normalbetrieb arbeitet das System ausschließlich gegen die **eigene DB**.

### Kontextdiagramm (textuell)

* User → Web UI → API → DB
* Web UI → OSM
* Initial Import Job → NOAA → DB

## Components / Modules

* **Web UI (Next.js):** Karte/Charts/Filter; ruft API auf; visualisiert Daten
* **API (Fastify):** Endpunkte, Validierung, Query-Logik, DB-Zugriff, LRU Cache (u. a. für /nearby und /aggregates)
* **Endpunkte:**

  * `/api/stations/nearby`
  * `/api/stations/{id}/aggregates`
  * `/api/health`
* **DB (Postgres + PostGIS):** Persistenz, Geo-Queries, Aggregat-Tabellen, Indexes
* **Initial Import Job (First-Time-Startup):** Download/Parsing/Filter (bis 2025) → Bulk Load → Voraggregation → Indexe → seed_meta
* **Shared package:** gemeinsame Contracts (Zod-Schemas/Types), Season-Enum/Utilities
* **CI/CD Pipeline:** GitHub Actions (Build/Test/Docker), GHCR

## Core Risks and Missing Information

Legende: **E** = Eintritt, **S** = Schaden (L/M/H)

* **R1 Import scheitert** (Netz/Quellenformat) – **E=M / S=H**

  * Maßnahmen: Retry/Backoff, klare Fehlermeldungen, robuste Parser, Import-Logs
* **R2 Doppelimport** bei Restart/Parallelstart – **E=L / S=H**

  * Maßnahmen: seed_meta Marker + DB-Lock/Transaktion, Import idempotent
* **R3 Datenmenge / Plattenbedarf** groß – **E=M / S=M**

  * Maßnahmen: Filter bis 2025, Fokus auf benötigte Variablen (TMIN/TMAX), optional Demo-Subset
* **R4 Geo-Query Performance** bei Skalen – **E=M / S=M**

  * Maßnahmen: GiST Index, Limit/Radius, Voraggregation, API Cache
* **R5 OSM Tiles nicht erreichbar** – **E=M / S=M**

  * Maßnahmen: Graceful Degradation (Hinweis), alternative Tiles optional
* **R6 Import abgebrochen → inkonsistenter Zustand** – **E=M / S=H**

  * Maßnahmen: Staging/Transaktion, import_in_progress Flag + Cleanup/Retry; Import nur bei leerer DB

**Offen**

* Erwartete Importdauer und Speicherbedarf in Zielumgebung
* CI-Strategie bzgl. Daten: Voller Import vs. kleines Testdataset
* Minimaler Demo-Datenstand für Station-Detailseite (mindestens 1 Station + Aggregatdaten)
