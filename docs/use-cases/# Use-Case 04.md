# Use‑Case 04: Datenbasis bereitstellen / aktualisieren

(Systemfunktion)

## Überblick

Das System stellt eine nutzbare Datenbasis bereit, indem es entweder

* einen **NOAA‑Initialimport** (voller Datensatz bis inkl. 2025) ausführt oder
* ein **Minimal‑Seed** (synthetische Testdatenbasis für CI/Dev) einspielt.

Die Daten stehen danach für die Benutzer‑Use‑Cases (UC‑01..UC‑03) zur Verfügung.

## Geltungsbereich

Webanwendung für Temperaturauswertung.

Client‑Server Architektur (Browser + Docker Server).

## Anwendungsschicht

Systemfunktion

## Primärer Akteur

Administrator / Projektteam

## Weitere Akteure

* **A1 GHCN / NOAA Datenquelle:** Rohdatenquelle für den Initialimport.
* **A2 Interne Datenhaltung (DB):** persistiert Stationen und Voraggregationen.

## Stakeholder

### S1 Nutzer

* Anwendung muss Daten besitzen
* konsistente Ergebnisse

### S2 Auftraggeber

* lauffähige Anwendung

### S3 Technischer Consultant

* reproduzierbarer Import
* Logging

### S4 Projektteam

* klar definierter Datenimport
* deterministische Testdaten für CI

## Vorbedingungen

1. Importquelle definiert (NOAA Base URL oder Seed).
2. Server hat Zugriff (Netzwerk für NOAA, DB für Seed).
3. Speicherplatz vorhanden (DB + optional Download‑Cache).

## Nachbedingungen

### Erfolg

* Stationsdaten vorhanden
* Voraggregationen (Year/Season) vorhanden
* Import/Seed ist protokolliert (Logs + Importstatus)

### Fehlschlag

* Datenbasis bleibt in konsistentem Zustand (kein „halb‑aktiver“ Wechsel)
* Fehler ist im Log sichtbar

## Hauptzweig (NOAA‑Initialimport)

1. Administrator startet System mit aktiviertem Import (z. B. `NOAA_IMPORT_ENABLED=1`).
2. System prüft bestehende Datenbasis (`SeedMeta`).
3. System lädt Rohdaten (Stationsmetadaten, Inventory, Daily‑Archive).
4. System validiert/normalisiert Daten.
5. System extrahiert Stationsmetadaten und Verfügbarkeit (`firstYear/lastYear`).
6. System berechnet Voraggregationen (YearlyAggregate/SeasonalAggregate).
7. System markiert Import als abgeschlossen (`SeedMeta=COMPLETED`).
8. System stellt Daten für UC‑01..UC‑03 bereit.

## Hauptzweig (Minimal‑Seed für CI/Dev)

1. Administrator/CI startet DB.
2. System führt Migrationen aus.
3. System spielt Minimal‑Seed ein (`pnpm prisma db seed`).
4. System stellt Daten für UC‑01..UC‑03 bereit.

## Erweiterungen

### *a Abbruch

Import wird beendet; System verbleibt in konsistentem Zustand.

### 3a Download fehlgeschlagen

Fehler und Abbruch.

### 3b Dateien fehlen

Fehler und Abbruch.

### 4a Validierung fehlgeschlagen

Import beendet.

### 5a Teilweise fehlerhafte Daten

Warnung, Import läuft weiter (sofern robust möglich).

### 6a Metadaten fehlen

Warnung.

### 7a Persistenzfehler

Rollback/Abbruch.

## Besondere Anforderungen

* reproduzierbar (SeedMeta/Locking)
* Logging (Importschritte, Fehler)
* robust gegen fehlerhafte Datensätze
* akzeptable Performance
* Importstatus abrufbar (API‑Endpoint)

## Technologievariationen

* manueller Start (CI/Dev)
* automatischer Start (Importer‑Container beim Compose)
* Datenquelle: Remote‑Download oder lokale Files (optional)

## Datenvariationen

* Downloadquelle oder lokale Dateien
* Normalisierung von Rohwerten

## Häufigkeit

Selten (Initialimport) bzw. pro CI‑Run (Minimal‑Seed).

## Sonstiges

* Die Datenbank wird in Docker üblicherweise über ein Volume persistiert.
* Für einen vollständigen Reset kann der Admin die Volumes entfernen (`docker compose down -v`).

## Referenzen

* UC‑01: `Use-Case 01.md`
* UC‑02: `Use-Case 02.md`
* UC‑03: `Use-Case 03.md`
* Importstatus: `GET /api/import/status` (siehe README)
* ADR 0002 (Offline‑Import): `../adr/0002-offline-demo-dataset.md`
* Seed‑Dokument: `../seed.md`
