# Use-Case 01: „Stationen im Umkreis finden“

## Überblick
Der Nutzer gibt geographische Koordinaten (Breite/Länge) sowie Filter (Suchradius, maximale Anzahl, Start-/End Jahr) an.  
Das System ermittelt und zeigt die nächstgelegenen Wetterstationen innerhalb des Suchradius, die den Zeitraumfilter erfüllen, inklusive Distanz und Stationsidentifikation.

## Geltungsbereich
Webanwendung zur Auswertung und Darstellung von Temperaturdaten auf Basis von GHCN-Daten, ausgeführt in Client-Server-Architektur (Browser-Client, Server im Docker-Container)

## Anwendungsschicht
Benutzer

## Primärer Akteur
Nutzer (z. B. Student/Dozent), der Stationen in der Umgebung eines Standpunkts finden will.

## Weitere Akteure
A1 Externe Datenquelle (GHCN/NOAA): stellt Rohdaten bereit (Download/Quelle).

A2 Interne Datenhaltung (Dateisystem/DB im Server-Container): nimmt importierte Daten und Metadaten auf.

## Stakeholder und ihre Belange

### S1 Nutzer
- will Stationen in der Nähe schnell finden
- will Filter (Radius, Anzahl, Zeitraum) nutzen können
- will verständliche Rückmeldungen bei ungültigen Eingaben oder 0 Treffern

### S2 Auftraggeber (Prof. Funk)
- will korrekte Umsetzung der Anforderungen
- will klar formulierte Use-Case-Dokumentation

### S3 Technischer Consultant
- will Einhaltung technischer Randbedingungen (Architektur, Docker, Browser/OS)
- will robuste Umsetzung

### S4 Projektteam
- will klare Grundlage für Implementierung, Tests und GUI-Entwurf

## Vorbedingungen
1. Ein Stationskatalog ist im System verfügbar (mind. Stations-ID/Name, Koordinaten).
2. Für jede Station ist eine Information zur Datenverfügbarkeit ableitbar (z. B. erstes/letztes Jahr mit Daten).

## Nachbedingungen

### Erfolg
- Stationsliste wird angezeigt
- Stationen innerhalb des Radius
- nach Distanz sortiert
- auf maximale Anzahl begrenzt
- Zeitraumfilter erfüllt
- Eingaben bleiben sichtbar

### Fehlschlag
- keine Suche oder keine Trefferliste
- klare Rückmeldung (Validierungsfehler, 0 Treffer, Systemfehler)
- Eingaben bleiben erhalten

## Hauptzweig
1. Nutzer öffnet Stationssuche.
2. Nutzer gibt Breitengrad und Längengrad ein.
3. Nutzer setzt Suchradius (km).
4. Nutzer setzt maximale Anzahl.
5. Nutzer setzt Anfangsjahr und End Jahr.
6. Nutzer startet Suche.
7. System validiert Eingaben.
8. System ermittelt Stationen im Radius, prüft Zeitraumfilter, sortiert nach Distanz und begrenzt auf max. Anzahl.
9. System zeigt Stationsliste mit Name und Distanz.

## Erweiterungen

### *a) Nutzer bricht ab
System bricht Verarbeitung ab; Eingaben bleiben erhalten.

### 7a Koordinaten fehlen oder ungültig
System markiert Felder und zeigt Fehlermeldung.

### 7b Koordinaten außerhalb gültiger Bereiche
Breite ∉ [-90; 90] oder Länge ∉ [-180; 180].  
System zeigt Hinweis.

### 7c Suchradius ungültig
Radius fehlt, ≤0 oder zu groß.  
System fordert gültigen Radius an.

### 7d Maximale Anzahl ungültig
Maximale Anzahl fehlt oder ≤0.  
System fordert gültigen Wert an oder setzt Default.

### 7e Anfangsjahr > End Jahr
System meldet Inkonsistenz.

### 7f End Jahr zu groß
End Jahr > aktuelles Vorjahr.  
System begrenzt automatisch oder meldet Fehler.

### 7g Anfangsjahr zu klein
Startjahr < erstes mögliches Jahr.  
System begrenzt automatisch oder zeigt Hinweis.

### 8a Keine Stationen im Radius
System zeigt Hinweis.

### 8b Stationen vorhanden aber Zeitraumfilter nicht erfüllt
System zeigt Hinweis zur Anpassung des Filters.

### 8c Stationskatalog nicht verfügbar
System zeigt Fehlermeldung und verweist auf UC-04 „Datenbasis bereitstellen/aktualisieren“.

### 8d Serverfehler oder Timeout
System zeigt Fehlermeldung und Retry-Option.

## Besondere Anforderungen
- Usability: intuitive Bedienung
- klare Fehlermeldungen
- sinnvolle Defaultwerte
- Ladezustand anzeigen

## Architektur / Plattform
Client-Server Architektur  
Client im Browser  
Server im Docker-Container  

Plattform: Windows 11  
Browser: aktuelle Firefox und Chrome Version

## Performance
Suche soll zügig Ergebnisse liefern.

## Technologievariationen
- Distanzberechnung: Haversine oder Geo-Index
- Validierung clientseitig + serverseitig
- Darstellung als Liste oder zusätzlich Karte

## Datenvariationen
- Datenverfügbarkeit aus Metadaten oder Messdaten
- Endjahr maximal aktuelles Vorjahr
- erstes mögliches Anfangsjahr aus Daten ableitbar

## Häufigkeit des Auftretens
Sehr häufig (typischer Einstiegspunkt)

## Sonstiges
1. Ergebnisliste standardmäßig nach Distanz sortiert.
2. Anzeige auf 1–10 Treffer begrenzt.
3. Standardwert für maximale Anzahl: 5.
4. In der Ergebnisliste werden nur Stationsname und Distanz angezeigt.