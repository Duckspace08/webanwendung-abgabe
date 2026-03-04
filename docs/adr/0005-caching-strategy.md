# ADR 0005: Mehrstufige Caching‑Strategie (API + Web)

## Status

Accepted

## Kontext

Die Kernendpunkte werden mit wiederkehrenden Parametern aufgerufen (z. B. gleiche Koordinate/Radius/Zeitraum). Ohne Caching entsteht unnötige DB‑Last und die UI reagiert bei Navigation/Refetches weniger flüssig.

Caching unterstützt insbesondere:

* **UC‑01** (Stationssuche im Umkreis)
* **UC‑03** (Stationsdaten anzeigen)

## Entscheidung

Caching erfolgt zweistufig:

1. **API:** LRU‑Cache (TTL 10 Minuten) für

   * `GET /api/stations/nearby`
   * `GET /api/stations/:id/aggregates`

2. **Web:** React Query Cache mit Query Keys für

   * Stationssuche
   * Aggregationen
   * Importstatus

## Begründung

* Reduziert wiederholte DB‑Last bei häufig identischen Suchparametern.
* Verbessert UI‑Reaktionszeit durch sofortige Wiederverwendung bereits geladener Daten.
* Unterstützt den Offline‑Gedanken nach abgeschlossenem Initialimport.

## Konsequenzen

* Cache‑Invalidierung erfolgt zeitbasiert (TTL/StaleTime) statt eventbasiert.
* Nach Importabschluss können Daten kurzzeitig veraltet sein, aktualisieren sich aber automatisch nach TTL/StaleTime.
* Cache‑Keys verwenden stabile Serialisierung (alphabetisch sortierte Keys) zur Vermeidung von Cache‑Misses.

## Referenzen

* UC‑01: `docs/use-cases/Use-Case 01.md`
* UC‑03: `docs/use-cases/Use-Case 03.md`
