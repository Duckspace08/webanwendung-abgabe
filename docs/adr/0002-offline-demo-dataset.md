# ADR 0002: NOAA Initialimport bis 2025, danach Offline-Betrieb

## Status
Accepted

## Entscheidung

Die Anwendung lädt beim ersten produktiven Start das komplette NOAA GHCN Daily Dataset,
begrenzt auf `year <= 2025`, und persistiert daraus:

- `Station`
- `YearlyAggregate`
- `SeasonalAggregate`
- `SeedMeta` (Importstatus)

Nach dem abgeschlossenen Initialimport arbeitet die Anwendung vollständig offline auf der
lokalen PostgreSQL/PostGIS-Datenbank. `DailyObservation` bleibt im Schema, wird im
Standardpfad aber nicht befüllt.

## Begründung

- Erfüllt MS2-Anforderung „NOAA als Quelle + lokaler Offline-Betrieb“.
- Sehr schnelle API-Antwortzeiten durch Voraggregation.
- Reproduzierbarer, idempotenter Startprozess durch `SeedMeta` + Advisory Lock.
- Kein externer Datenzugriff mehr im laufenden Betrieb.

## Auswirkungen

- Der erste Start kann sehr lange dauern (voller NOAA-Import).
- Folgestarts sind schnell, da der Importer bei `COMPLETED` sofort endet.
- CI nutzt weiterhin ein synthetisches Minimal-Seed und führt keinen NOAA-Download aus.
