# ADR 0001: Tech Stack

## Status
Accepted

## Entscheidung

- Frontend: Next.js 14 (App Router) + TypeScript + TailwindCSS
- Backend: Fastify + Node.js 20 + TypeScript
- Datenhaltung: PostgreSQL 16 + PostGIS + Prisma
- Charting: Apache ECharts
- Maps: Leaflet + OpenStreetMap Tiles

## Begründung

Der Stack liefert hohe Performance, gute DX, und ermöglicht eine klare Trennung von Web/API.
PostGIS deckt Geo-Suchen ohne zusätzliche Services ab.
