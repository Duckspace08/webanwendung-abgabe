# Teststrategie

Dieses Dokument beschreibt die Teststrategie für das Projekt **GHCN Climate Explorer**. Ziel ist eine nachvollziehbare, reproduzierbare Testausführung in lokaler Entwicklung und CI.

## Testpyramide (Überblick)

1. **Unit-Tests**
   * Fokus: reine Logik ohne IO (z. B. Validierung, Saison-Logik, Aggregations-Helpers).
2. **Integrationstests**
   * Fokus: API-Endpunkte inkl. DB-Integration (Prisma + PostGIS).
3. **E2E-Tests (Smoke)**
   * Fokus: „läuft die Anwendung end-to-end“ (Web lädt, Suche/Station-Ansicht erreichbar).

---

## Unit-Tests

### Scope

* `packages/shared`
  * Validierungsschemas (Zod)
  * Saison-Zuordnung / Hilfsfunktionen
  * sonstige Shared-Logik

### Umsetzung

* Runner: **Vitest** (`pnpm test`)
* Coverage: **V8-Coverage** (`pnpm test:coverage`)

### Motivation

Unit-Tests liefern schnelle Rückmeldung ohne Infrastrukturabhängigkeiten.

---

## Integrationstests

### Scope

* `apps/api`
  * Endpunkte:
    * `GET /api/stations/nearby`
    * `GET /api/stations/:id/aggregates`
    * `GET /api/health`
    * `GET /api/import/status`

### Datenbasis

* Die Tests laufen gegen die **Prisma Minimal-Seed** (`prisma/seed.ts`).
* In der CI wird der NOAA-Importer **nicht** ausgeführt; die Minimal-Seed ist dafür bewusst ausreichend.

### Infrastruktur

* CI stellt eine PostGIS-DB als **Container-Service** bereit (GitHub Actions `services.db`).
* Workflow führt aus:
  1. `pnpm prisma migrate deploy`
  2. `pnpm prisma db seed`
  3. `pnpm test`

> Hinweis: „Testcontainer“ meint hier die containerisierte Testdatenbank (PostGIS) in der CI.

---

## E2E-Tests (Playwright Smoke)

### Scope

* `tests/e2e/smoke.spec.ts`
  * Minimaler Smoke-Test: Startseite lädt, Navigation in die Exploration/Stationsansicht möglich.

### Ausführung

* Lokal: `pnpm e2e`
* CI (optional/erweiterbar): kann bei Bedarf ergänzt werden, typischerweise nach Build/Deploy.

### Erweiterung weiterer Szenarien

* Zusätzliche Playwright-Tests werden unter `tests/e2e/*.spec.ts` ergänzt.
* Empfohlene Erweiterungen:
  * Suche starten und mindestens eine Station finden
  * Station öffnen und sicherstellen, dass Chart + Tabelle gerendert werden
  * Validierungsfälle (Limit/Radius überschritten)

---

## Stubs/Mocks

### Grundsatz

* **Unit-Tests**: externe Abhängigkeiten (Fetch, Zeit, Random) werden gemockt.
* **Integrationstests**: keine Mocks für DB/Prisma – echte DB-Queries sind Teil des Testziels.

### Warum Minimal-Seed / Importer-Deaktivierung?

* Der NOAA-Initialimport ist bewusst **nicht** Teil der CI, um Laufzeit und Flakiness (Netzwerk/Download) zu vermeiden.
* Die Minimal-Seed bildet die Kern-Domäne (Stationen + Voraggregationen) vollständig ab und ist reproduzierbar.

---

## Coverage

* Ausführung: `pnpm test:coverage`
* Reports:
  * Textausgabe in der Konsole
  * HTML-Report unter `*/coverage/` (z. B. `apps/api/coverage/`)
* CI veröffentlicht den Coverage-Report als Artifact „coverage-report“.