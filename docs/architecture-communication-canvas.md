# Architecture Communication Canvas

## Werteversprechen
1. NOAA GHCN Daily als glaubwürdige Primärquelle.
2. Vollständiger Initialimport bis einschließlich 2025 beim ersten Start.
3. Danach 100% Offline-Betrieb aus lokaler PostgreSQL/PostGIS-DB.
4. Sehr schnelle Karten- und Aggregationsabfragen durch Voraggregation + Caching.
5. Reproduzierbarer, idempotenter Importprozess mit `SeedMeta` und DB-Locking.

## Kernfunktionen (1–8)
1. **Initialimport (one-shot Importer)**
   - Lädt `ghcnd-stations.txt`, `ghcnd-inventory.txt`, `ghcnd_all.tar.gz`.
   - Schreibt `SeedMeta` Status: `NOT_STARTED/RUNNING/COMPLETED/FAILED`.
2. **Idempotenz + Locking**
   - `seed_meta.key=noaa_ghcn_daily` verhindert Doppelimporte.
   - Postgres Advisory Lock verhindert parallele Importer.
3. **Stationenaufbau**
   - Import nur Stationen mit Schnittmenge aus TMIN/TMAX-Jahren.
   - `lastYear` ist hart auf 2025 gecappt.
4. **Voraggregation Jahr**
   - Persistenz in `YearlyAggregate` mit Durchschnitt und Tagesanzahl je Tmin/Tmax.
5. **Voraggregation Saison**
   - Persistenz in `SeasonalAggregate`.
   - Meteorologische Saisons innerhalb des gleichen Jahres (`WINTER`=12/1/2).
6. **API-Endpunkte**
   - `GET /api/stations/nearby`
   - `GET /api/stations/:id/aggregates`
   - `GET /api/import/status`
   - `GET /api/health`
7. **Web-Analysefluss**
   - Explore: Geo-Suche + Year-Filter (Default maxYear=2025).
   - Station: Jahres-/Saisoncharts (Default toYear=2025).
8. **CI/Dev Fast Mode**
   - Synthetisches Prisma-Seed für schnelle Tests.
   - NOAA-Import in CI deaktiviert (`NOAA_IMPORT_ENABLED=0`).

## Business Context
- NOAA ist nur Quelle für den Initialimport.
- Kartenkacheln: OpenStreetMap.
- Laufender Betrieb danach ohne NOAA-Netzwerkabhängigkeit.

## Stakeholder
- Endnutzer:innen (Klimaanalyse pro Region/Station)
- Reviewer/Prüfer (MS2-Konformität)
- Entwickler:innen und Maintainer
- DevOps/CI-Verantwortliche

## Quality Requirements
- **Performance**: niedrige API-Latenz durch Voraggregation + Caches.
- **UI-Reactivity**: reaktive Filter/Charts über React Query.
- **Installierbarkeit**: klarer Compose-Startpfad `db -> importer -> api -> web`.
- **Observability**: Importstatus/Fehler in `SeedMeta` und `/api/import/status`.
- **Accessibility**: Formulareingaben und Visualisierungen keyboard-/screenreader-freundlich.

## Core Risks
1. **Sehr lange Initiallaufzeit**
   - Eintritt: hoch, Schaden: mittel.
   - Maßnahme: One-shot Importer + NOAA Cache Volume.
2. **Parallele Importe**
   - Eintritt: mittel, Schaden: hoch.
   - Maßnahme: Advisory Lock + `SeedMeta` State Machine.
3. **Inkonsistenter Year-Cutoff**
   - Eintritt: mittel, Schaden: mittel.
   - Maßnahme: Import-Cap `<=2025` und Saisonkonvention ohne year+1 Shift.
4. **CI-Laufzeiten explodieren**
   - Eintritt: hoch, Schaden: hoch.
   - Maßnahme: NOAA-Import in CI deaktivieren, Minimal-Seed verwenden.

## Core Decisions
- **D1**: Tech Stack (Next.js/Fastify/Prisma/Postgres/PostGIS). → ADR 0001
- **D2**: NOAA Initialimport bis 2025 + Offline danach. → ADR 0002
- **D3**: PostGIS statt Elasticsearch für Geo-Querys. → ADR 0003
- **D4**: Voraggregation Year/Season statt Runtime-Aggregation. → ADR 0004
- **D5**: Mehrstufige Caching-Strategie in API und Web. → ADR 0005
