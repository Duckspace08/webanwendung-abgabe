# Use‑Case 02: Station auswählen

## Überblick
Der Nutzer wählt eine Wetterstation aus einer zuvor ermittelten Ergebnisliste (oder über die Karte) aus. Das System setzt die ausgewählte Station als „aktive Station“ und zeigt bzw. wertet die entsprechenden Stationsdaten aus.


## Geltungsbereich

Es handelt sich um eine Webanwendung zur Auswertung und Darstellung von Temperaturdaten auf Basis von GHCN-Daten. Sie ist in einer Client-Server-Architektur ausgeführt (Browser-Client, Server im Docker-Container).

## Anwendungsschicht

Benutzer

## Primärer Akteur

Nutzer (z. B. Student/Dozent), der eine gefundene Station für die weitere Analyse auswählen will.

## Weitere Akteure

* **A1 Datenbasis (interne Datenhaltung):** stellt Stationsinformationen bereit.

## Stakeholder und ihre Belange

### S1 Nutzer

* will eine passende Station schnell auswählen
* will eindeutig erkennen, welche Station ausgewählt ist (Name/ID/Distanz)
* will bei ungültiger Auswahl oder technischen Problemen verständliche Rückmeldung

### S2 Auftraggeber

* will korrekte Umsetzung der grundlegenden Bedienung
* will klar formulierte Use‑Case‑Dokumentation

### S3 Technischer Consultant

* will robuste Umsetzung (saubere Zustände, stabile Navigation)
* will Einhaltung der technischen Randbedingungen (Browser/Docker/Client‑Server)

### S4 Projektteam

* will klare Basis für GUI‑Entwurf, Implementierung und Tests

## Vorbedingungen

1. Eine Stationsliste ist bereits ermittelt und wird angezeigt (UC‑01).
2. Jede Station ist eindeutig identifizierbar (Stations‑ID).

## Nachbedingungen

### Erfolg

* Eine Station ist als „aktive Station“ gesetzt.
* System wechselt in Zustand zur Anzeige der Stationsdaten (UC‑03), typischerweise über Navigation zur Detailseite.

### Fehlschlag

* Keine Station wird aktiv gesetzt.
* Nutzer erhält verständliche Rückmeldung.
* Ergebnisliste bleibt erhalten.

## Hauptzweig

1. System zeigt Ergebnisliste und/oder Kartenmarker (aus UC‑01).
2. Nutzer wählt eine Station (Klick auf Listeneintrag oder Marker‑Popup).
3. System prüft Existenz und Identifizierbarkeit der Station.
4. System setzt Station als Kontext (Station‑ID).
5. System navigiert zur Stationsdetailansicht und startet UC‑03.

## Erweiterungen

### *a) Nutzer bricht ab

Keine Änderung am Zustand.

### 1a Ergebnisliste fehlt

System zeigt Hinweis und verweist auf UC‑01.

### 2a Station nicht mehr verfügbar

Fehlermeldung und Verbleib in Stationsliste.

### 2b Station nicht eindeutig

System verhindert Auswahl und fordert eindeutige Identifikation.

### 3a Technischer Fehler

Fehlermeldung und Retry.

### 5a Navigation fehlgeschlagen

Fehlermeldung und Retry.

## Besondere Anforderungen

* Usability: Auswahl per Klick/Tap
* Robustheit: eindeutige Stations‑ID
* UI: Hervorhebung der aktiven Station (Listenselektion/Marker)

## Architektur / Plattform

Client‑Server Architektur

* Client: Browser
* Server: Docker‑Container

Plattform: Windows 11

Browser: aktuelle Firefox und Chrome Version

## Technologievariationen

* Auswahl über Tabellenliste oder Kartenmarker
* Kontextspeicherung clientseitig (URL/State) oder serverseitig (nicht nötig)

## Häufigkeit

Sehr häufig (direkt nach UC‑01).

## Referenzen

* UC‑01: `Use-Case 01.md`
* UC‑03: `Use-Case 03.md`
* Frontend: Stationsdetailseite (Route `/station/<id>`) – siehe README
