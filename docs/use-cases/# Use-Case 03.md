# Use-Case 03: „Stationsdaten anzeigen (grafisch + Tabelle) für Zeitraum“

## Überblick
Der Nutzer lässt für eine ausgewählte Wetterstation Temperaturdaten für einen Zeitraum anzeigen.

Das System lädt die Stationsdaten und stellt sie grafisch und tabellarisch dar.

Datenlücken werden sichtbar dargestellt.

## Geltungsbereich
Webanwendung zur Auswertung und Darstellung von Temperaturdaten auf Basis von GHCN-Daten.

Client-Server Architektur (Browser + Docker-Server)

## Anwendungsschicht
Benutzer

## Primärer Akteur
Nutzer (Student/Dozent)

## Weitere Akteure
A1 Externe Datenquelle (GHCN/NOAA)

A2 Interne Datenhaltung (Server)

## Stakeholder

### S1 Nutzer
- will Daten schnell sehen
- will Datenlücken erkennen
- will klare Fehlermeldungen

### S2 Auftraggeber
- korrekte Bedienung
- klare Dokumentation

### S3 Technischer Consultant
- stabile Client-Server Umsetzung
- Browser/Docker Anforderungen

### S4 Projektteam
- Grundlage für GUI, Implementierung und Tests

## Vorbedingungen
1. Aktive Station existiert (UC-02)
2. Zeitraum ist bekannt
3. Datenbasis verfügbar

## Nachbedingungen

### Erfolg
- Daten geladen
- Grafik und Tabelle angezeigt
- Datenlücken sichtbar

### Fehlschlag
- Anzeige nicht möglich
- Fehlermeldung
- Station und Zeitraum bleiben erhalten

## Hauptzweig
1. System zeigt Datenansicht
2. Nutzer wählt Zeitraum
3. Nutzer startet Anzeige
4. System validiert Zeitraum
5. System lädt Daten
6. System zeigt Grafik und Tabelle

Optional:
Berechnung aggregierter Kennzahlen.

## Erweiterungen

### *a Abbruch
Ladevorgang wird beendet.

### 4a Zeitraum ungültig
Fehlermeldung.

### 4b Endjahr zu groß
System begrenzt oder meldet Fehler.

### 4c Startjahr zu klein
System begrenzt oder meldet Hinweis.

### 5a Keine Daten
System zeigt Hinweis.

### 5b Datenlücken
Grafik zeigt Lücken.

### 5c Datenbasis fehlt
Verweis auf UC-04.

### 5d Serverfehler
Retry möglich.

### 6a Renderfehler
Fallback Anzeige.

## Besondere Anforderungen
- verständliche Anzeige
- Ladeanzeige
- klare Fehlermeldungen
- keine falschen Linien bei Datenlücken

## Architektur
Client Browser  
Server Docker  
Windows 11  
Firefox / Chrome

## Technologievariationen
- Linienchart
- Balkendiagramm
- Heatmap

## Datenvariationen
- Tmin/Tmax
- Umgang mit fehlenden Werten (null/NaN)

## Häufigkeit
Sehr häufig

## Sonstiges
- Vergleich von Saisonwerten möglich
- keine Interpolation fehlender Werte
- Farbschema:
  - Tmin blau
  - Tmax rot
- Werte auf eine Nachkommastelle runden