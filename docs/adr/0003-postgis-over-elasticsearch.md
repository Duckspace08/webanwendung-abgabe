# ADR 0003: PostGIS statt Elasticsearch

## Status

Accepted

## Kontext

Für den Use‑Case **UC‑01** werden Geo‑Abfragen benötigt:

* Stationen innerhalb eines Radius um Lat/Lon
* Sortierung nach Distanz
* Filter nach Stationsverfügbarkeit (minYear/maxYear)

Eine zusätzliche Such‑/Geo‑Infrastruktur (z. B. Elasticsearch) würde Deployment, Betrieb und Fehlerbilder deutlich erweitern.

## Entscheidung

Geo‑Abfragen werden mit **PostGIS** umgesetzt. Elasticsearch (oder ein zusätzlicher Geo‑Server) wird nicht verwendet.

## Begründung

* Reduziert Komponenten und Deployment‑Aufwand (eine DB als „Single Source“).
* PostGIS unterstützt Distanzsuche performant und zuverlässig (GiST/Geography).
* Bewertungswirkung: Datenhaltung, Schema, Indizes klar nachvollziehbar.

## Konsequenzen

* DB muss PostGIS aktiviert haben und passende Indizes besitzen.
* Geo‑Queries sind SQL‑nah; für Wartbarkeit werden sie in der API gekapselt.

## Referenzen

* UC‑01: `docs/use-cases/Use-Case 01.md`
* ADR 0001: `docs/adr/0001-tech-stack.md`
