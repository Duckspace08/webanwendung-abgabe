# Use-Case 02: „Station auswählen“

## Überblick
Der Nutzer wählt aus einer zuvor ermittelten Ergebnisliste eine Wetterstation aus.  
Das System setzt die ausgewählte Station als „aktive Station“ für die weitere Anzeige/Auswertung der Stationsdaten.

## Geltungsbereich
Webanwendung zur Auswertung und Darstellung von Temperaturdaten auf Basis von GHCN-Daten, ausgeführt in Client-Server-Architektur (Browser-Client, Server im Docker-Container)

## Anwendungsschicht
Benutzer

## Primärer Akteur
Nutzer (z. B. Student/Dozent), der eine gefundene Station für die weitere Analyse auswählen will

## Weitere Akteure
A1 Datenbasis (interne Datenhaltung):  
Stellt die gespeicherten Stationsinformationen bereit, aus denen der Nutzer eine Station auswählt.

## Stakeholder und ihre Belange

### S1 Nutzer
- will eine passende Station schnell auswählen
- will eindeutig erkennen, welche Station ausgewählt ist (Name/ID/Distanz/Ort)
- will bei ungültiger Auswahl oder technischen Problemen verständliche Rückmeldung

### S2 Auftraggeber (Prof. Funk)
- will korrekte Umsetzung der grundlegenden Bedienung  
- will klar formulierte Use-Case-Dokumentation im vorgegebenen Stil

### S3 Technischer Consultant
- will robuste Umsetzung (saubere Zustände, Fehlerbehandlung, stabile Navigation)
- will Einhaltung der technischen Randbedingungen (Browser/Docker/Client-Server)

### S4 Projektteam
- will klare Basis für GUI-Entwurf, Implementierung und Tests (Zustandswechsel „aktive Station“)

## Vorbedingungen
1. Eine Stationsliste ist bereits ermittelt und wird angezeigt.
2. Jede Station in der Liste ist eindeutig identifizierbar und auswählbar.

## Nachbedingungen

### Erfolg
- Eine Station ist als „aktive Station“ im System gesetzt.
- System wechselt in Zustand zur Anzeige der Stationsdaten (UC-03).

### Fehlschlag
- Keine Station wird aktiv gesetzt.
- Nutzer erhält verständliche Rückmeldung.
- Ergebnisliste bleibt erhalten.

## Hauptzweig
1. System zeigt Ergebnisliste.
2. Nutzer wählt Station.
3. System prüft Existenz und Identifizierbarkeit.
4. System setzt aktive Station.
5. System startet UC-03 „Stationsdaten anzeigen“.

## Erweiterungen

### *a) Nutzer bricht ab
Keine Änderung am Zustand.

### 1a Ergebnisliste fehlt
System zeigt Hinweis und verweist auf UC-01.

### 2a Station nicht mehr verfügbar
Fehlermeldung und Verbleib in Stationsliste.

### 2b Station nicht eindeutig
System verhindert Auswahl und fordert eindeutige Identifikation.

### 3a Technischer Fehler
Fehlermeldung und Retry.

### 5a Navigation fehlgeschlagen
Fehlermeldung und Retry.

## Besondere Anforderungen
- Usability: Auswahl per Klick/Tap
- Robustheit: eindeutige Stations-ID
- Architektur: Browser + Docker-Server
- Plattform: Windows 11, Firefox/Chrome

## Technologievariationen
- Tabellenliste oder Kartenmarker
- Speicherung clientseitig oder serverseitig

## Datenvariationen
- Mindestattribute: Stations-ID, Name, Distanz
- Optional: Region, Koordinaten, Höhe

## Häufigkeit
Sehr häufig (direkt nach UC-01)

## Sonstiges
- Auswahl startet automatisch UC-03
- Anzeige enthält Name, Distanz, Anfangsjahr, Endjahr
- Kartenmarker hebt aktive Station hervor