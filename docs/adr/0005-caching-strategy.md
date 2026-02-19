# ADR 0005: Mehrstufige Caching-Strategie (API + Web)

## Status
Accepted

## Entscheidung

Caching erfolgt zweistufig:

1. API: LRU-Cache (TTL 10 Minuten) für `/api/stations/nearby` und
   `/api/stations/:id/aggregates`.
2. Web: React Query Cache mit Query Keys für Stationssuche, Aggregationen und Importstatus.

## Begründung

- Reduziert wiederholte DB-Last bei häufig identischen Suchparametern.
- Verbessert UI-Reaktionszeit durch sofortige Wiederverwendung bereits geladener Daten.
- Unterstützt den Offline-Gedanken nach abgeschlossenem Initialimport.

## Konsequenzen

- Cache-Invalidierung erfolgt zeitbasiert (TTL/StaleTime) statt eventbasiert.
- Bei Importabschluss können Daten kurzzeitig veraltet sein, aktualisieren sich aber mit
  dem nächsten Query-Refresh.
