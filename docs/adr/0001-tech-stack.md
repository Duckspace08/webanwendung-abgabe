# ADR 0001: Tech Stack

## Status

Accepted

## Kontext

Die Anwendung ist eine browserbasierte Client‑Server‑Webanwendung, die:

* Stationen über Geo‑Suche findet (UC‑01),
* eine Station auswählt (UC‑02),
* Voraggregationen (Jahr/Saison) performant visualisiert (UC‑03),
* eine reproduzierbare Datenbasis bereitstellt (UC‑04),
* lokal in Docker (Windows 11) und in CI/CD reproduzierbar läuft.

## Entscheidung

* **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS
* **Backend:** Fastify + Node.js 20 + TypeScript
* **Datenhaltung:** PostgreSQL 16 + PostGIS + Prisma
* **Charts:** Apache ECharts
* **Karte:** Leaflet + OpenStreetMap Tiles

## Begründung

* Next.js + TypeScript bieten moderne UI‑Struktur, performantes Rendering und klare Routing‑Modelle.
* Fastify ist leichtgewichtig und schnell für eine kleine REST‑API.
* PostGIS deckt Geo‑Suchen (Radius/Distanzsortierung) ohne zusätzliche Services ab.
* Prisma reduziert Boilerplate in der DB‑Schicht und erhöht Wartbarkeit.
* ECharts liefert flexible, performante Visualisierungen.
* Leaflet + OSM ermöglichen eine Kartenansicht ohne Vendor‑Lock‑in.

## Konsequenzen

* Klare Schichtung **Web → API → DB**.
* Geo‑Performance hängt an PostGIS‑Indexierung.
* Kartenkacheln sind externe Abhängigkeit (OSM) → Graceful Degradation erforderlich.

## Referenzen

* Use‑Cases: `docs/use-cases/`
* Architecture Canvas: `docs/architecture-communication-canvas.md`
