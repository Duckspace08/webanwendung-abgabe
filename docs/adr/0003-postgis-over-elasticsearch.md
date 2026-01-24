# ADR 0003: PostGIS statt Elasticsearch

## Status
Accepted

## Entscheidung

Geo-Abfragen werden mit PostGIS umgesetzt. Elasticsearch wird nicht verwendet.

## Begründung

- Reduziert Komponenten und Deployment-Aufwand
- PostGIS unterstützt Distanzsuche performant und zuverlässig
- Gute Bewertungswirkung für Datenhaltung
