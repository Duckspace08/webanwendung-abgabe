# Architecture Communication Canvas

## Werteversprechen
- Offline verfügbare Klima-Demo mit schnellen Geo-Suchen und klaren Aggregationen.

## Kernfunktionen
- Stationssuche via PostGIS Distanzfilter
- Jahres- und Saisonmittelwerte aus voraggregierten Tabellen
- Interaktive Charts und Karten

## Komponenten
- Web (Next.js + Tailwind + ECharts + Leaflet)
- API (Fastify + Prisma + LRU Cache)
- Datenbank (PostgreSQL + PostGIS)

## Stakeholder
- Studierende / Reviewer
- Entwickler:innen / Maintainer

## Risiken
- Große Seeds können Docker-Start verlängern
- PostGIS muss in CI/Docker verfügbar sein

## Entscheidungen
- Offline Seed statt NOAA Runtime Calls
- PostGIS statt Elasticsearch
- Voraggregation statt Laufzeitberechnung
