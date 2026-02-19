# ADR 0004: Voraggregation für Jahres- und Saisonwerte

## Status
Accepted

## Entscheidung

NOAA-Daily-Zeilen werden während des Imports direkt in `YearlyAggregate` und
`SeasonalAggregate` überführt. Die API liest nur diese voraggregierten Tabellen.

Saisonkonvention: meteorologische Jahreszeiten innerhalb desselben Kalenderjahres
(`WINTER` = Monate 12,1,2 mit `seasonYear = YEAR`). Dadurch bleibt die komplette Datenbasis
streng bei `<= 2025`.

## Begründung

- Vermeidet teure On-the-fly-Aggregation über Milliarden Daily-Werte.
- Hält Query-Latenz für Explore/Station Endpoints stabil niedrig.
- Erlaubt klaren Year-Cutoff ohne Sonderfälle wie „Winter 2026 aus Dezember 2025“.

## Konsequenzen

- Höhere Importzeit, aber deutlich bessere Runtime-Performance.
- API und Frontend erhalten bereits fertige Zeitreihen.
