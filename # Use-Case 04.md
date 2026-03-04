# Use-Case 04: „Datenbasis bereitstellen / aktualisieren“

(Systemfunktion)

## Überblick
System importiert oder aktualisiert GHCN Rohdaten (Stationsmetadaten + Messwerte).

Daten stehen danach für andere Use-Cases zur Verfügung.

## Geltungsbereich
Webanwendung für Temperaturauswertung.

Client-Server Architektur (Browser + Docker Server)

## Anwendungsschicht
Systemfunktion

## Primärer Akteur
Administrator / Projektteam

## Weitere Akteure
A1 GHCN / NOAA Datenquelle

A2 Interne Datenhaltung

## Stakeholder

### S1 Nutzer
- Anwendung muss Daten besitzen
- konsistente Ergebnisse

### S2 Auftraggeber
- lauffähige Anwendung

### S3 Technischer Consultant
- reproduzierbarer Import
- Logging

### S4 Projektteam
- klar definierter Datenimport

## Vorbedingungen
1. Importquelle definiert
2. Server hat Zugriff
3. Speicherplatz vorhanden

## Nachbedingungen

### Erfolg
- Stationsdaten importiert
- Metadaten berechnet
- Import protokolliert

### Fehlschlag
- alte Daten bleiben aktiv
- Fehler im Log

## Hauptzweig
1. Administrator startet Import
2. System prüft bestehende Datenbasis
3. System lädt Rohdaten
4. System validiert Daten
5. System extrahiert Metadaten
6. System berechnet Metadaten
7. System aktiviert neue Datenbasis
8. System protokolliert Ergebnis

## Erweiterungen

### *a Abbruch
Import wird beendet.

### 3a Download fehlgeschlagen
Fehler und Abbruch.

### 3b Dateien fehlen
Fehler und Abbruch.

### 4a Validierung fehlgeschlagen
Import beendet.

### 5a Teilweise fehlerhafte Daten
Warnung, Import läuft weiter.

### 6a Metadaten fehlen
Warnung.

### 7a Persistenzfehler
Rollback.

## Besondere Anforderungen
- atomare Aktivierung
- Logging
- robust gegen fehlerhafte Datensätze
- akzeptable Performance

## Technologievariationen
- manueller Start
- automatischer Start
- Dateisystem oder Datenbank

## Datenvariationen
- Downloadquelle oder lokale Dateien
- Normalisierung von Rohwerten

## Häufigkeit
Selten

## Sonstiges
- initiales Parsing beim Systemstart
- Abnahmetest mit vollständigem Datensatz
- Daten bleiben im Container (keine persistente DB)