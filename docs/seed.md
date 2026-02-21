# Minimal-Seed (Testdatenbasis)

Die Anwendung nutzt für **CI** und lokale Entwicklung eine **reproduzierbare Minimal-Seed** (`prisma/seed.ts`).

Diese Minimal-Seed ist bewusst unabhängig vom NOAA-Initialimport und stellt genau die Daten bereit, die für die Kernfunktionen und Tests benötigt werden.

## Enthaltene Daten

### Stationen

* Es werden **30 Stationen** mit festen IDs (z. B. `DE-001`, `DE-002`, `FR-001`, `US-001` …) angelegt.
* Jede Station enthält:
  * Geokoordinaten (Latitude/Longitude)
  * `geom` als PostGIS-Geography (für `ST_DWithin`/`ST_Distance`)
  * `firstYear`/`lastYear` (Default: 2015–2025)

Beispielstation (wird auch in Tests/Perf verwendet):

* `DE-001` – **Berlin Tempelhof** (52.47, 13.40)

### Daily Observations (synthetisch)

* Für jede Station werden synthetische Tageswerte (`DailyObservation`) erzeugt.
* Zeitraum: **2015 bis 2025**.
* Werte:
  * `tminC` / `tmaxC` werden aus einer saisonalen Funktion (Latitude + Sinus) + Rauschen erzeugt.
  * Es werden bewusst **Datenlücken** simuliert (ca. 3% `null`), um UI/Logik auf fehlende Werte zu testen.

### Voraggregationen

Damit die Kernfunktion „Auswertung unter 3 Sekunden“ demonstrierbar ist, werden direkt in der Seed folgende Aggregationen berechnet und gespeichert:

* `YearlyAggregate` (Jahr)
  * `avgTminC`, `avgTmaxC`
  * `daysCountTmin`, `daysCountTmax`
* `SeasonalAggregate` (meteorologische Jahreszeiten)
  * `SPRING`, `SUMMER`, `AUTUMN`, `WINTER`
  * `avgTminC`, `avgTmaxC`

## Warum genügt das für CI/Tests?

* Die Kernendpunkte basieren auf:
  * Geo-Query (PostGIS) auf `Station`
  * Read-only Queries auf `YearlyAggregate` / `SeasonalAggregate`
* Genau diese Tabellen sind vollständig abgedeckt.
* Der NOAA-Initialimport ist für CI nicht notwendig und wäre zu langsam bzw. netzwerkabhängig.

## Bezug zu Performance-/Load-Tests

Der Performance-Test (`pnpm perf`) nutzt typische Parameter gegen diese Seed:

* `GET /api/stations/nearby` – Suche um Berlin, Radius 500km, Limit 10, Zeitraum 2018–2025
* `GET /api/stations/:id/aggregates` – Aggregationen für eine Seed-Station (Standard: `DE-001`)