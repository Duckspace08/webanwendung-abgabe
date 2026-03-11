# Use‑Case 03: Stationsdaten anzeigen (grafisch + Tabelle) für Zeitraum

## Überblick
Der Nutzer lässt sich die Temperaturdaten einer ausgewählten Wetterstation für einen bestimmten Zeitraum anzeigen. Das System lädt die voraggregierten Stationsdaten und stellt sie grafisch sowie tabellarisch dar. Datenlücken werden dabei sichtbar dargestellt.


## Geltungsbereich

Webanwendung zur Auswertung und Darstellung von Temperaturdaten auf Basis von GHCN‑Daten.

Client‑Server Architektur (Browser + Docker‑Server).

## Anwendungsschicht

Benutzer

## Primärer Akteur

Nutzer (Student/Dozent)

## Weitere Akteure

* **A1 Interne Datenhaltung (Server/DB):** liefert Aggregatdaten (Jahr/Saison).
* **A2 Externe Datenquelle (GHCN/NOAA):** nur indirekt relevant über UC‑04 (Import).

## Stakeholder

### S1 Nutzer

* will Daten schnell sehen
* will Datenlücken erkennen
* will klare Fehlermeldungen

### S2 Auftraggeber

* korrekte Bedienung
* klare Dokumentation

### S3 Technischer Consultant

* stabile Client‑Server Umsetzung
* Browser/Docker Anforderungen

### S4 Projektteam

* Grundlage für GUI, Implementierung und Tests

## Vorbedingungen

1. Aktive Station existiert (UC‑02).
2. Zeitraum ist bekannt (Defaultwerte oder Nutzereingabe).
3. Datenbasis verfügbar (UC‑04).

## Nachbedingungen

### Erfolg

* Daten geladen
* Grafik und Tabelle angezeigt
* Datenlücken sichtbar

### Fehlschlag

* Anzeige nicht möglich
* Fehlermeldung
* Station und Zeitraum bleiben erhalten

## Hauptzweig

1. System zeigt Stationsansicht.
2. Nutzer wählt Zeitraum (Startjahr/Endjahr).
3. Nutzer startet Anzeige bzw. System lädt automatisch bei Filteränderung.
4. System validiert Zeitraum.
5. System lädt Daten für die Station (Jahr + Saison).
6. System zeigt Grafik und Tabelle.

Optional:

* Berechnung/Anzeige aggregierter Kennzahlen (z. B. min/max, Trend, Count).

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

Grafik zeigt Lücken (keine Interpolation über fehlende Werte).

### 5c Datenbasis fehlt

Verweis auf UC‑04.

### 5d Serverfehler

Retry möglich.

### 6a Renderfehler

Fallback Anzeige (Tabelle als Minimaldarstellung).

## Besondere Anforderungen

* verständliche Anzeige
* Ladeanzeige
* klare Fehlermeldungen
* keine „falschen Linien“ bei Datenlücken
* Werte konsistent runden (UI: typischerweise 1 Nachkommastelle)

## Architektur

Client: Browser

Server: Docker

Windows 11

Firefox / Chrome

## Technologievariationen

* Linienchart
* Balkendiagramm
* Heatmap

## Datenvariationen

* Tmin/Tmax
* Umgang mit fehlenden Werten (`null`/NaN)

## Häufigkeit

Sehr häufig.

## Sonstiges

* Vergleich von Saisonwerten möglich.

## Referenzen

* UC‑02: `Use-Case 02.md`
* UC‑04: `Use-Case 04.md`
* API: `GET /api/stations/:id/aggregates` (siehe README)
* ADR 0004 (Voraggregation): `../adr/0004-preaggregation-year-season.md`
