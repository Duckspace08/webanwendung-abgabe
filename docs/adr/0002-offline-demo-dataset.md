# ADR 0002: Offline Demo Dataset

## Status
Accepted

## Entscheidung

Die Anwendung nutzt ein synthetisches GHCN-Daily-Dataset, das beim Seed erzeugt wird.
Keine Runtime-Abhängigkeit zu NOAA oder externen APIs.

## Begründung

- Offline-Demo stabil und schnell (<3s)
- Deterministische Datenbasis für Tests und CI
- Klare Dokumentation der Erweiterbarkeit
