# Minimal‑Seed (Testdatenbasis)

Die Anwendung nutzt für **CI** und lokale Entwicklung eine **reproduzierbare Minimal‑Seed** (`prisma/seed.ts`).

Diese Minimal‑Seed ist bewusst unabhängig vom NOAA‑Initialimport und stellt genau die Daten bereit, die für Kernfunktionen, Tests und Performance‑Messungen benötigt werden.

Der Seed‑Prozess ist Teil des System‑Use‑Cases **UC‑04** („Datenbasis bereitstellen/aktualisieren“) und ermöglicht die Ausführung der Benutzer‑Use‑Cases **UC‑01** bis **UC‑03** ohne NOAA‑Download.

---

## Offline‑Demo‑Dataset (Voraggregierte Daten als Archiv)

Zur Reduktion der Import‑/Startzeit kann optional ein **vorkonfiguriertes Daten‑Archiv** (Schema + Daten + Voraggregationen) im Repository abgelegt werden. Beim Start mit Docker Compose stellt der Service `seed_restore` diese Daten automatisiert wieder her.

* **Ablageort (konventionell):** `seed/offline-demo-db.sql.gz`
* **Ziel:** schneller Start, keine Abhängigkeit von Internet/NOAA‑Downloads, konsistente Demo‑Daten für Abnahme/Präsentation.

### Aktivierung

* `OFFLINE_SEED_ENABLED=1` (Default)
* Optional erzwingen: `OFFLINE_SEED_FORCE=1`
* Datei im Container: `OFFLINE_SEED_FILE=/repo/seed/offline-demo-db.sql.gz`

### Verhalten beim Start

* Ist das Archiv vorhanden und `OFFLINE_SEED_ENABLED=1`, wird die DB wiederhergestellt.
* Enthält die DB bereits Daten, wird der Restore standardmäßig übersprungen.
* Mit `OFFLINE_SEED_FORCE=1` wird die DB (Schema `public`) vor dem Restore zurückgesetzt.

### Erzeugung des Archives (Beispiel)

1. System einmalig mit vollem Import laufen lassen (NOAA Import aktiv).
2. Dump aus dem DB‑Container erstellen und komprimieren:

```bash
mkdir -p seed
# System starten und Import durchführen (Beispiel)
NOAA_IMPORT_ENABLED=1 docker compose up -d

# Danach: Dump erzeugen
docker compose exec -T db sh -c 'pg_dump -U postgres -d ghcn --no-owner --no-privileges' | gzip > seed/offline-demo-db.sql.gz
```

Hinweis: Das Dump sollte **Schema + Daten** enthalten (inkl. `_prisma_migrations`), damit `pnpm prisma migrate deploy` danach idempotent bleibt.

---

## Enthaltene Daten (Minimal‑Seed)

### Stationen

* **30 Stationen** mit festen IDs (z. B. `DE-001`, `FR-001`, `US-001` …)
* Pro Station:

  * Koordinaten (Latitude/Longitude)
  * `geom` als PostGIS‑Geography (für `ST_DWithin`/`ST_Distance`)
  * `firstYear`/`lastYear` (typisch 2015–2026)

### Synthetische Tageswerte

* Zeitraum: **2015 bis 2026**
* Werte:

  * `tminC` / `tmaxC` werden aus einer saisonalen Funktion (Latitude + Sinus) + Rauschen erzeugt.
  * Es werden bewusst **Datenlücken** simuliert (ein kleiner Anteil `null`).

Hinweis: Die API‑Kernendpunkte lesen im Runtime‑Betrieb primär die **Aggregat‑Tabellen**. Die synthetischen Tageswerte dienen im Seed dazu, Aggregationen deterministisch zu erzeugen.

---

## Meteorologische Aggregation (wie im NOAA‑Import)

Die Voraggregation folgt dem meteorologischen Vorgehen:

1. **Monatsmittel**: Mittelwert der Tageswerte je Monat (für `TMIN` und `TMAX` getrennt).
2. **Jahresmittel**: Mittelwert der **12 Monatsmittel** eines Jahres.
3. **Saisonmittel**: Mittelwert der **3 Monatsmittel** einer meteorologischen Saison.

Teiljahre/Teilsaisons werden nicht persistiert (z. B. nur Dez ohne Jan/Feb).

---

## Voraggregationen

* `YearlyAggregate` (Jahr)

  * `avgTminC`, `avgTmaxC`
  * `daysCountTmin`, `daysCountTmax` (Summe der verwendeten Tageswerte)

* `SeasonalAggregate` (meteorologische Jahreszeiten)

  * `SPRING`, `SUMMER`, `AUTUMN`, `WINTER`
  * `avgTminC`, `avgTmaxC`
  * `daysCountTmin`, `daysCountTmax`

Die Voraggregation ist durch ADR **0004** begründet.

---

## Saison‑Konvention (meteorologisch, inkl. Südhalbkugel)

### Nordhalbkugel

* `SPRING` = Monate 3–5
* `SUMMER` = Monate 6–8
* `AUTUMN` = Monate 9–11
* `WINTER` = Monate 12, 1, 2

**seasonYear‑Regel (WINTER):** Saison wird nach dem **Dezember‑Jahr** benannt.

* Beispiel: **Winter 2025 = Dezember 2025 + Januar 2026 + Februar 2026**
* Ableitung: `seasonYear = year` für Dezember, `seasonYear = year - 1` für Januar/Februar.

### Südhalbkugel

Die Jahreszeiten sind umgedreht (invertiert):

* Wenn auf der Nordhalbkugel `WINTER` ist, ist auf der Südhalbkugel `SUMMER`.
* Entsprechend gilt: `SPRING` ↔ `AUTUMN` und `SUMMER` ↔ `WINTER`.

Das Mapping erfolgt über das Vorzeichen der Stations‑Latitude:

* `latitude < 0` → Südhalbkugel
* sonst → Nordhalbkugel

---

## Hinweis zum NOAA‑Initialimport und „letztem Winter“

Wenn die Datenbasis hart bei `NOAA_END_YEAR` endet, ist der letzte **vollständig berechenbare** Winter typischerweise `NOAA_END_YEAR - 1` (weil Januar/Februar des Folgejahres fehlen können).

Beispiel:

* `NOAA_END_YEAR=2025` enthält Dezember 2025, aber **nicht** Januar/Februar 2026 → **Winter 2025** wäre unvollständig und wird nicht persistiert.
* Für **Winter 2025** (Dez 2025 + Jan/Feb 2026) muss die Datenbasis mindestens bis **2026** reichen.

---

## Warum genügt das für CI/Tests?

* **UC‑01** benötigt: `Station` + PostGIS Geo‑Queries
* **UC‑03** benötigt: `YearlyAggregate` / `SeasonalAggregate`
* Diese Tabellen sind im Seed vollständig abgedeckt.
* Der NOAA‑Import ist für CI nicht notwendig und wäre zu langsam bzw. netzwerkabhängig.

---

## Bezug zu Performance-/Load‑Tests

Der Performance‑Test (`pnpm perf`) nutzt typische Parameter gegen diese Seed:

* `GET /api/stations/nearby` – Suche um Berlin, Radius 500 km, Limit 10, Zeitraum 2018–2025
* `GET /api/stations/:id/aggregates` – Aggregationen für eine Seed‑Station (Standard: `DE-001`)

---

## Referenzen

* UC‑01..UC‑04: `docs/use-cases/`
* ADR 0004: `docs/adr/0004-preaggregation-year-season.md`
