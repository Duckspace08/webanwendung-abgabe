# ADR 0004: Voraggregation für Jahres- und Saisonwerte

## Status

Accepted

## Kontext

Das NOAA GHCN‑Daily Dataset umfasst sehr viele Tageszeilen. On‑the‑fly‑Aggregationen für jede Stationsanfrage (UC‑03) wären für eine Demo‑Webanwendung zu langsam und schwer reproduzierbar.

## Entscheidung

Während Import/Seed werden Tageswerte direkt in folgende Tabellen voraggregiert:

* `YearlyAggregate`
* `SeasonalAggregate`

Die API liest zur Laufzeit ausschließlich diese voraggregierten Tabellen.

## Saisondefinition

Meteorologische Jahreszeiten:

* `SPRING` = Monate 3–5
* `SUMMER` = Monate 6–8
* `AUTUMN` = Monate 9–11
* `WINTER` = Monate 12, 1, 2

## Saisonjahr (seasonYear) bei WINTER

Für `WINTER` existieren zwei verbreitete Konventionen:

1. **Kalenderjahr‑Konvention:** `seasonYear = Jahr des Messwerts` (Dezember bleibt im selben Jahr)
2. **Jahr‑von‑Jan/Feb‑Konvention:** `seasonYear = Jahr von Januar/Februar` (Dezember zählt zum Folgejahr)

In dieser Codebasis gelten zwei Datenpfade:

* **NOAA‑Initialimport (UC‑04):** Winter bleibt im gleichen Jahres‑Bucket des Messwerts.

  * Motivation: Ein harter Cutoff (`NOAA_END_YEAR=2025`) soll nicht durch „Dezember → Folgejahr“ künstlich Daten in 2026 erzeugen.

* **Minimal‑Seed (CI/Dev):** Saisonjahr‑Mapping erfolgt über die Shared‑Utility und kann „Dezember → Folgejahr“ verwenden.

  * Motivation: deterministisches Mapping aus einer zentralen Utility.
  * Auswirkungen und Einordnung sind in `docs/seed.md` dokumentiert.

## Begründung

* Vermeidet teure On‑the‑fly‑Aggregation über Daily‑Mengen.
* Hält Query‑Latenz für Explore/Station Endpoints stabil niedrig.
* Ermöglicht reproduzierbare Performance‑/Load‑Tests auf einer festen Datenbasis.

## Konsequenzen

* Höhere Import/Seed‑Zeit, aber deutlich bessere Runtime‑Performance.
* API und Frontend erhalten bereits fertige Zeitreihen.
* Die Saisonjahr‑Konvention muss in Dokumentation/Tests transparent sein.

## Referenzen

* UC‑03: `docs/use-cases/Use-Case 03.md`
* UC‑04: `docs/use-cases/Use-Case 04.md`
* Seed: `docs/seed.md`
