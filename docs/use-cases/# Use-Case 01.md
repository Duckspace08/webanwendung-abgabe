# Use‑Case 01: Stationen im Umkreis finden

## Überblick
Der Nutzer gibt geografische Koordinaten (Breite/Länge) sowie Filterkriterien wie Suchradius, maximale Anzahl und Start-/Endjahr an. Das System ermittelt die nächstgelegenen Wetterstationen innerhalb des Suchradius, die den Zeitraumfilter erfüllen, und zeigt sie inklusive Distanz und Stationsidentifikation an.

## Geltungsbereich

Es handelt sich um eine Webanwendung zur Auswertung und Darstellung von Temperaturdaten auf Basis von GHCN-Daten. Sie ist in einer Client-Server-Architektur ausgeführt (Browser-Client, Server im Docker-Container).

## Anwendungsschicht

Benutzer

## Primärer Akteur

Nutzer (z. B. Student/Dozent), der Stationen in der Umgebung eines Standpunkts finden will.

## Weitere Akteure

* **A1 Externe Datenquelle (GHCN/NOAA):** stellt Rohdaten bereit (nur für Import, siehe UC‑04).
* **A2 Interne Datenhaltung (DB im Server‑Container):** enthält Stationsmetadaten inkl. Geo‑Index.

## Stakeholder und ihre Belange

### S1 Nutzer

* will Stationen in der Nähe schnell finden
* will Filter (Radius, Anzahl, Zeitraum) nutzen können
* will verständliche Rückmeldungen bei ungültigen Eingaben oder 0 Treffern

### S2 Auftraggeber

* will korrekte Umsetzung der Anforderungen
* will klar formulierte Use‑Case‑Dokumentation

### S3 Technischer Consultant

* will Einhaltung technischer Randbedingungen (Architektur, Docker, Browser/OS)
* will robuste Umsetzung (Validierung, Fehlerbehandlung)

### S4 Projektteam

* will klare Grundlage für Implementierung, Tests und GUI‑Entwurf

## Vorbedingungen

1. Stationskatalog ist im System verfügbar (mind. Stations‑ID/Name, Koordinaten).
2. Für jede Station ist Datenverfügbarkeit vorhanden (`firstYear`/`lastYear`).
3. DB‑Service ist erreichbar.

## Nachbedingungen

### Erfolg

* Stationsliste wird angezeigt
* Stationen liegen innerhalb des Radius
* Ergebnisse sind nach Distanz sortiert
* Anzahl ist auf `limit` begrenzt
* Zeitraumfilter wird erfüllt
* Eingaben bleiben sichtbar

### Fehlschlag

* keine Trefferliste
* klare Rückmeldung (Validierungsfehler, 0 Treffer, Systemfehler)
* Eingaben bleiben erhalten

## Hauptzweig

1. Nutzer öffnet Stationssuche (Explore‑Seite).
2. Nutzer gibt Breitengrad und Längengrad ein.
3. Nutzer setzt Suchradius (km).
4. Nutzer setzt maximale Anzahl.
5. Nutzer setzt Startjahr und Endjahr.
6. Nutzer startet Suche.
7. System validiert Eingaben (client‑ und serverseitig).
8. System ermittelt Stationen im Radius, prüft Zeitraumfilter, sortiert nach Distanz und begrenzt auf max. Anzahl.
9. System zeigt Stationsliste (Name, ID, Distanz sowie Zeitraum‑Metadaten).

## Erweiterungen

### *a) Nutzer bricht ab

System bricht Verarbeitung ab; Eingaben bleiben erhalten.

### 7a Koordinaten fehlen oder ungültig

System markiert Felder und zeigt Fehlermeldung.

### 7b Koordinaten außerhalb gültiger Bereiche

Breite ∉ [-90; 90] oder Länge ∉ [-180; 180]. System zeigt Hinweis.

### 7c Suchradius ungültig

Radius fehlt, ≤ 0 oder > maximaler UI/API‑Grenze. System fordert gültigen Radius an.

### 7d Maximale Anzahl ungültig

Maximale Anzahl fehlt oder ≤ 0 oder > maximaler UI/API‑Grenze. System fordert gültigen Wert an.

### 7e Startjahr > Endjahr

System meldet Inkonsistenz.

### 7f Endjahr zu groß

Endjahr > letztes im Datensatz verfügbares Jahr. System meldet Fehler oder begrenzt automatisch.

### 7g Startjahr zu klein

Startjahr < erstes im Datensatz verfügbares Jahr. System meldet Fehler oder begrenzt automatisch.

### 8a Keine Stationen im Radius

System zeigt Hinweis.

### 8b Stationen vorhanden, aber Zeitraumfilter nicht erfüllt

System zeigt Hinweis zur Anpassung des Filters.

### 8c Stationskatalog nicht verfügbar

System zeigt Fehlermeldung und verweist auf UC‑04.

### 8d Serverfehler oder Timeout

System zeigt Fehlermeldung und Retry‑Option.

## Besondere Anforderungen

* Usability: intuitive Bedienung
* klare Fehlermeldungen
* sinnvolle Defaultwerte
* Ladezustand anzeigen

## Architektur / Plattform

Client‑Server Architektur

* Client: Browser
* Server: Docker‑Container

Plattform: Windows 11

Browser: aktuelle Firefox und Chrome Version

## Performance

Suche soll zügig Ergebnisse liefern (< 3s Ziel für Kernfunktion).

## Technologievariationen

* Distanzberechnung: PostGIS Geo‑Index (implementiert) vs. Haversine (nicht genutzt)
* Validierung clientseitig + serverseitig
* Darstellung: Liste + Karte (Marker)

## Häufigkeit des Auftretens

Sehr häufig (typischer Einstiegspunkt).

## Referenzen

* UC‑02: `Use-Case 02.md`
* UC‑03: `Use-Case 03.md`
* UC‑04: `Use-Case 04.md`
* API: `GET /api/stations/nearby` (siehe README)
* ADR 0003 (PostGIS): `../adr/0003-postgis-over-elasticsearch.md`
