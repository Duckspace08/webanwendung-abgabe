# Test Strategy

Ziel dieses Dokuments ist eine nachvollziehbare, pragmatische Teststrategie, die

* die Kernfunktionalitäten absichert und
* die Bewertungskriterien (Teststrategie, Coverage, Mocking/Stubbing, Verständlichkeit) nachweisbar unterstützt.

## Scope & Qualitätsziele

**Systemkontext:** Browser‑Web‑App (Client) + API (Server) + Datenbank (Docker‑Stack).

**Kern‑Use‑Cases:**

* **UC‑01:** Stationen im Umkreis finden
* **UC‑02:** Station auswählen
* **UC‑03:** Stationsdaten anzeigen (Grafik + Tabelle)
* **UC‑04:** Datenbasis bereitstellen/aktualisieren (Systemfunktion)

Siehe: `docs/use-cases/`.

## Testpyramide

1. **Unit Tests (schnell, deterministisch)**

   * Pure Functions: Formatter, Validierung, Helper, Season‑Utilities.

2. **Integration Tests (API ↔ DB ↔ HTTP, gezielt)**

   * Endpunkte liefern erwartete Statuscodes, Payloads, Fehlerobjekte.
   * DB‑Zugriff inkl. PostGIS‑Query‑Pfad.

3. **Smoke/E2E (wenige Happy‑Paths, realer Stack)**

   * Web ↔ API ↔ DB inkl. Navigation.

4. **Systemtests/Abnahme (manuell, protokolliert)**

   * Verifizierte Werte + dokumentierte Testfälle gemäß Aufgabenstellung.

## Tooling

* **Unit/Integration:** Vitest
* **API HTTP:** Supertest (oder äquivalent) gegen Fastify‑Instanz
* **E2E/Smoke:** Playwright (Tests im Ordner `tests`)
* **Coverage:** Vitest Coverage → HTML/lcov

## Traceability: Tests ↔ Use‑Cases

### UC‑01 (Stationssuche im Umkreis)

* Unit:

  * Validierungsgrenzen (Koordinaten, Radius, Limit, Jahre)
  * Helper/Formatter (z. B. Rundung)
* Integration:

  * `GET /api/stations/nearby` liefert sortierte Distanzliste
  * Filter `minYear/maxYear` wirken korrekt
* E2E:

  * Explore‑Seite: Parameter setzen, Suche starten, Liste/Map aktualisiert

### UC‑02 (Station auswählen)

* E2E:

  * Klick auf Station in Liste und/oder Map führt zur Detailseite
  * URL enthält Station‑ID; Back‑Navigation funktioniert

### UC‑03 (Stationsdaten anzeigen)

* Unit:

  * Mapping/Normalisierung/Formatter für Jahres‑ und Saison‑Zeitreihen
  * Darstellung von Lücken (null) ohne Interpolation
* Integration:

  * `GET /api/stations/:id/aggregates` liefert Station + `yearly` + `seasonal`
  * 404 bei unbekannter Station
* E2E:

  * Detailseite lädt Diagramm(e) + Tabelle(n)
  * Filter `fromYear/toYear` wirkt

### UC‑04 (Datenbasis bereitstellen/aktualisieren)

* Integration:

  * Seed‑Status (`/api/import/status`) liefert konsistente Statuswerte
  * Minimal‑Seed ist deterministisch (CI)
* Manuell/Abnahme:

  * Erststart‑Import (NOAA) sichtbar im Log + Status
  * Reset (`docker compose down -v`) → Import läuft erneut

## Unit Tests

### Shared/Domain

**Ziele:**

* Season‑Mapping/Enums, stabile Serialisierung (Cache‑Keys), Formatter.
* Edge‑Cases: Null‑Werte, Rundung, Parameter‑Normalisierung.

### API (Server)

**Ziele:**

* Validierung der Request‑Parameter (Radius, Limit, Jahre, Koordinaten).
* Ergebnis‑Stabilität: Distanzsortierung, Jahr‑Filter, Fehlerobjekte.

**Mocking/Stubbing:**

* Externe Datenquellen/Downloads (NOAA) werden in Unit‑Tests nicht ausgeführt.

### Web (Client)

**Bewusster Coverage‑Scope:**

* Unit‑Tests decken gezielt `apps/web/lib/**` ab (Logik/Formatter/Validierung).
* UI/Routes werden primär über Smoke/E2E und manuelle Abnahme geprüft.

## Integration Tests

### API ↔ DB

**Ziele:**

* Endpunkte liefern erwartete Statuscodes, Payloads, Fehlerobjekte.
* DB‑Migrations/Schema‑Kompatibilität im Testsetup.
* Caching‑Verhalten nur „black‑box“ prüfen (repeat call → schneller), ohne fragile Timing‑Asserts.

**Testdatenbasis:**

* Deterministisches Minimal‑Seed (siehe `docs/seed.md`).

## Smoke / E2E (minimal, aber aussagekräftig)

**Minimalumfang (Happy Path):**

1. App lädt, Explore‑Seite erreichbar.
2. Standort setzen → Stationen suchen → Station auswählen.
3. Detailseite zeigt Charts und **Tabelle als Alternative**.
4. Fehlerfälle: ungültige Eingaben zeigen Validation‑Messages.

**Accessibility‑Scope:**

* Tastaturbedienung: Fokus erreichbar, sichtbar, logische Tab‑Reihenfolge.
* Controls sind beschriftet (Labels/ARIA) und Status/Errors sind erkennbar.

## Systemtests & Abnahme (manuell dokumentiert)

* **3 Standorte** mit geprüften Parametern (Radius, Zeitraum, Limit).
* Pro Standort **1 Station** mit geprüften Werten für Jahr + Saisons.
* Protokollierung: Input‑Parameter, erwartete/observed Ergebnisse, Screenshots.

## Quality Gates (CI)

CI soll mindestens:

* Lint/Typecheck
* Unit/Integration Tests
* Coverage‑Report (HTML) als Artifact
* Build (Web/API)
* Container‑Images bauen und nach GHCR pushen (Tags: `latest` und `sha-...`)

## Referenzen

* Use‑Cases: `docs/use-cases/`
* Seed: `docs/seed.md`
* ADRs: `docs/adr/`
