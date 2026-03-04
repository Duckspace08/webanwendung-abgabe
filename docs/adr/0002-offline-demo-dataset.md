# ADR 0002: NOAA Initialimport bis 2025, danach Offline‑Betrieb

## Status

Accepted

## Kontext

Die Anwendung soll auf realen NOAA/NCEI‑Rohdaten basieren, aber im Demo‑/Abnahmebetrieb ohne externe Datenabhängigkeit laufen. Gleichzeitig muss der Start reproduzierbar und idempotent sein.

Der Datenimport ist in den Use‑Cases als Systemfunktion beschrieben (UC‑04).

## Entscheidung

Beim ersten Start (bzw. bei aktivem Import) lädt das System das NOAA **GHCN Daily** Dataset (TMIN/TMAX), begrenzt auf `year <= 2025`, und persistiert daraus:

* `Station`
* `YearlyAggregate`
* `SeasonalAggregate`
* `SeedMeta` (Importstatus)

Nach abgeschlossenem Initialimport arbeitet die Anwendung vollständig offline auf der lokalen PostgreSQL/PostGIS‑Datenbank.

## Begründung

* Erfüllt die Anforderung „NOAA als Quelle + lokaler Offline‑Betrieb“.
* Sehr schnelle API‑Antwortzeiten durch Voraggregation (siehe ADR 0004).
* Reproduzierbarer, idempotenter Import über `SeedMeta` + DB‑Lock.
* CI kann auf ein kleines, deterministisches Seed‑Dataset umschalten.

## Konsequenzen

* Der erste Import kann lange dauern und benötigt lokalen Speicher (DB + Cache).
* Folgestarts sind schnell, weil der Importer bei `COMPLETED` sofort endet.
* CI und lokale Entwicklung nutzen das Minimal‑Seed (siehe `docs/seed.md`).

## Referenzen

* UC‑04: `docs/use-cases/Use-Case 04.md`
* Seed: `docs/seed.md`
* ADR 0004: `docs/adr/0004-preaggregation-year-season.md`
