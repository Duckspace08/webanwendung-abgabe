# Test Strategy

Ziel dieses Dokuments ist eine nachvollziehbare, pragmatische Teststrategie, die
(a) die Kernfunktionalitäten absichert und (b) die Bewertungskriterien (Teststrategie, Coverage, Mocking/Stubbing, Verständlichkeit) unterstützt.

## Scope & Qualitätsziele

**Systemkontext:** Browser-basierte Web-App (Client) + API (Server) + Datenbank (Container-Stack).  
**Kernfunktionalitäten (fachlich):**
- Standort wählen (Koordinaten) und Stationen im Umkreis finden (Radius, Limit, Jahr-Filter).
- Station auswählen und Temperatur-Aggregate (Jahr + meteorologische Jahreszeiten) **grafisch und tabellarisch** darstellen.
- Eingabevalidierung/Fehlerfälle (ungültige Parameter, keine Stationen, Datenlücken).

**Nicht-funktional (prüf-/zeigbar):**
- Reaktionsfähigkeit UI (Loading-States), robuste Fehlerbehandlung.
- Barrierefreiheit: Tastaturbedienung, sichtbarer Fokus, sinnvolle ARIA-Attribute; Tabellen als Alternativdarstellung zu Charts.
- Performance: Kernaktionen bei verfügbaren abhängigen Systemen schnell ausführbar.

## Testpyramide (Levels)

1. **Unit Tests (schnell, deterministisch)**
   - Prüfen reine Logik, Formatierung, Validierung, Aggregationen.
2. **Integration Tests (API/DB/HTTP, begrenzt)**
   - Prüfen API-Endpunkte + DB-Schicht + Serialisierung/Validierung.
3. **Smoke/E2E (wenige Happy-Paths)**
   - Prüfen „läuft grundsätzlich“ im echten Stack (Web ↔ API ↔ DB) inkl. Navigation.
4. **Systemtests/Abnahme (manuell + dokumentiert)**
   - Prüfen fachliche Korrektheit anhand verifizierbarer Werte und definierter Testfälle. :contentReference[oaicite:0]{index=0}

## Tools & Ausführung (konzeptionell)

- **Test Runner Unit/Integration:** z. B. Vitest/Jest (projektabhängig).
- **API HTTP Tests:** z. B. Supertest (oder äquivalent).
- **E2E/Smoke:** z. B. Playwright/Cypress (minimaler Umfang).
- **Coverage:** Coverage-Provider des Test-Runners → HTML-Report als CI-Artifact.

> Hinweis: Konkrete Befehle/Script-Namen liegen in den jeweiligen `package.json`-Scripts. Die CI nutzt dieselben Scripts wie lokal.

## Unit Tests

### API (Server)
**Ziele:**
- Validierung der Request-Parameter (Radius, Limit, Jahre, Koordinaten).
- Distanzberechnung / Station-Filtern (Edge Cases, Grenzen).
- Aggregationslogik (Jahresmittel/Season-Mittel, Umgang mit Datenlücken).

**Mocking/Stubbing:**
- Externe Datenquellen/Downloads (falls vorhanden) **mocken**.
- DB-Repositories je nach Testziel:  
  - reine Service-Logik: Repos mocken  
  - DB-Integration: echte Test-DB (siehe Integration Tests)

### Shared/Domain (falls vorhanden)
- Pure Functions: Typen, Parser, Berechnungen, Helper.

### Web (Client)
**Bewusster Coverage-Scope:**
- **Unit-Tests decken gezielt `apps/web/lib/**` ab** (Logik/Formatter/Validierung).  
- **UI/Routes** werden **nicht** breit per Component-Unit-Tests abgedeckt, sondern über **Smoke/E2E** und/oder **manuelle Abnahme** geprüft.

## Integration Tests

### API ↔ DB
**Ziele:**
- Endpunkte liefern erwartete Statuscodes, Payloads, Fehlerobjekte.
- DB-Migrationen/Schema-Kompatibilität im Testsetup.
- Caching-Verhalten (sofern vorhanden) nur „black-box“ (z. B. repeated call schneller / weniger DB-Hits), ohne fragile Timings.

**Test-DB:**
- Bevorzugt isolierte, ephemeral DB (Container/Schema pro Run).
- Seed-Daten klein und deterministisch.

## Smoke / E2E (minimal, aber aussagekräftig)

**Minimalumfang (Happy Path):**
1. App lädt, Startseite erreichbar.
2. Standort setzen → Stationen suchen → Station auswählen.
3. Charts rendern + **unter jedem Chart** ist eine Tabelle vorhanden.
4. Help-Modal erreichbar und schließbar.

**Accessibility-Scope in Smoke/E2E:**
- Tastaturbedienung: Fokus erreichbar, sichtbar, logische Tab-Reihenfolge.
- ARIA-Attribute für Charts/Controls (mindestens Label/Description).

## Systemtests & Abnahme (manuell dokumentiert)

Gemäß Aufgabenstellung werden Systemtests mit verifizierten Werten durchgeführt und protokolliert:
- **3 Standorte** mit geprüften Werten (verschiedene Kombinationen aus Radius, Zeitraum, Limit) :contentReference[oaicite:1]{index=1}  
- je Standort **1 Station** mit geprüften Werten für **Gesamtjahr + Jahreszeiten** :contentReference[oaicite:2]{index=2}  
- Durchführung protokollieren (Inputparameter, erwartete/observed Ergebnisse, Screenshots/Export).

## Quality Gates (CI)

CI soll mindestens:
- Lint/Typecheck (falls vorhanden)
- Unit/Integration Tests
- Coverage-Report (HTML) als Artifact
- Build (Web/API)
- Container-Images bauen und nach GHCR pushen (Tags: `latest` und `sha-...`)

## Coverage & Nachweis

- Coverage wird als HTML-Report erzeugt und in CI als Artifact abgelegt (z. B. `coverage-report`).
- Für den Termin: Artifact lokal herunterladen, `index.html` öffnen und bei Bedarf zeigen.