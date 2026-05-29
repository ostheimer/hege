# Reviermanagement-Plattform fuer Jaeger in Oesterreich

## Zweck dieses Dokuments

Dieses Dokument ist der zentrale Gesamtueberblick fuer `hege`. Es beschreibt Produktziel, fachliche Module, sichtbare v1-Oberflaechen und verweist auf die Detaildokumente.

## Produktziel

`hege` ist als mandantenfaehige SaaS pro Revier geplant. Ein Revier oder eine Jagdgesellschaft arbeitet in einem klar getrennten Datenraum.

Es gibt zwei Hauptoberflaechen:

- ein Web-Backoffice fuer Schriftfuehrer und Revier-Admins
- eine mobile App fuer Jaeger im Feld

Die Plattform soll den taeglichen Revierbetrieb, die Dokumentation und die interne Abstimmung in einer gemeinsamen Loesung zusammenfuehren.

## Kernfunktionen

### Ansitz bekanntgeben

- Jaeger melden, dass sie auf einem Hochstand oder an einer Position ansitzen
- andere Mitglieder sehen aktive Ansitze im Revier
- Doppelbelegungen erzeugen eine Warnung

### Reviereinrichtungen verwalten

- Hochstaende, Fuetterungen und weitere Einrichtungen werden mit Standort und Zustand gefuehrt
- Kontrollen und Wartungen bleiben nachvollziehbar

### Reviermeldungen aus dem Feld

- Mitglieder sollen bei Fuetterungen, Wasserungen und anderen Einrichtungen direkt im Feld ein kurzes Update erfassen koennen
- zu einer Meldung gehoeren Fotos, Freitext, Zeitpunkt, Standort und der Bezug zu einer Einrichtung, Aufgabe oder Veranstaltung
- solche Meldungen sollen zuerst in `hege` dokumentiert werden und von dort aus bei Bedarf in externe Kanaele weitergegeben werden

### Fallwild bergen

- KFZ-Wild wird mit Zeitpunkt, Ort, Fotos, Wildart, Geschlecht und Status dokumentiert
- die Erfassung muss mobil und offlinefaehig sein

### Sitzungsprotokolle

- Sitzungen werden vorbereitet, protokolliert, versioniert und freigegeben
- freigegebene Protokolle stehen im Web und mobil zur Verfuegung

### Veranstaltungen und interne Kommunikation

- Veranstaltungen wie Revierarbeiten, Hegeschauen, gemeinsame Ansitze oder Versammlungen sollen angekuendigt werden koennen
- Nachrichten, Aufgaben und Veranstaltungsinfos muessen zielgerichtet nach Rollen und Empfaengergruppen ausgespielt werden
- bestimmte Inhalte sind nur fuer Gesellschafter oder andere berechtigte Gruppen sichtbar, andere duerfen auch an Ausgeher oder Gaeste gehen

## Erste sichtbare Versionen

### Backend v1 fuer Schriftfuehrer

Fokus:

- Dashboard
- Sitzungen
- Protokoll-Editor
- Freigabe
- veroeffentlichte Protokolle

Details:

- [Backend v1 fuer Schriftfuehrer](./backend-schriftfuehrer-v1.md)

### Mobile App v1 fuer Jaeger

Fokus:

- Heute-im-Revier
- Ansitz starten und beenden
- Fallwild erfassen
- Reviereinrichtungen lesen
- Protokolle lesen

Details:

- [Mobile App v1 fuer Jaeger](./mobile-jaeger-v1.md)

## Technische Leitlinien

- Monorepo mit `apps/web`, `apps/mobile`, `packages/domain` und einer bestehenden Uebergangs-API unter `apps/api`
- zentrale API als fachliche Quelle fuer Web und Mobile
- Production-Domain `https://hege.app`
- Vercel als Zielhost fuer Web und API-v1
- PostgreSQL/PostGIS auf Neon und Cloudflare R2 als produktive Zielbasis
- manuelle Aktualisierung oder leichtes Polling statt verpflichtender WebSockets in v1
- Offline-Pufferung in der mobilen App fuer Ansitz und Fallwild

Details:

- [Architektur](./architektur.md)
- [API v1](./api-v1.md)

## Sprache und Lokalisierung

- v1 ist auf Deutsch fuer Oesterreich (`de-AT`) ausgelegt
- sichtbare Produkttexte sollen fachlich oesterreichische Jagdbegriffe und echte Umlaute verwenden
- v1 liefert keine verpflichtende englische Oberflaeche aus
- die technische Struktur soll spaetere zusaetzliche Sprachen ermoeglichen
- falls nach v1 eine erste Zweitsprache eingefuehrt wird, ist Englisch (`en`) die bevorzugte erste Erweiterung

### Mitglieder, Rollen und Aufgaben

- Mitglieder koennen mehrere Rollen gleichzeitig haben
- Rollen sind flexibel erweiterbar, zum Beispiel Gaeste, Ausgeher, Gesellschafter, Paechter, Jagdaufseher, Jagdleiter, Schriftfuehrer oder Kassier
- Rollen steuern, wer Informationen sieht, Aufgaben erhaelt und Aufgaben weitergeben darf
- Rollen steuern zusaetzlich, welche Nachrichten, Veranstaltungen und Reviermeldungen sichtbar sind
- Sichtbarkeit soll nicht nur pro Einzelrolle, sondern auch ueber Empfaengergruppen wie `alle`, `Gesellschafter`, `Ausgeher`, `Feldteam` oder frei definierte Gruppen steuerbar sein
- bestimmte Rollen koennen anderen Mitgliedern Aufgaben zuteilen
- Aufgaben koennen einmalig, wiederkehrend oder als Projekt mit Start und Ende angelegt werden
- Aufgaben koennen aus Protokollen oder Beschluessen entstehen
- typische Aufgaben sind zum Beispiel Wasserungen und Fuetterungen betreuen, Hochstaende reparieren, Hochstaende bauen, Hochstaende versetzen oder Dienste fuer Veranstaltungen
- Aufgaben sollen mobil pro Benutzer in einer Listen- und Kalenderansicht sichtbar sein
- Aufgaben sollen Status, Faelligkeit, Verantwortliche, Fotos, Notizen und Rueckmeldungen aus dem Feld tragen koennen
- Reviermeldungen aus dem Feld koennen einer Aufgabe, einer Einrichtung oder einem Veranstaltungspunkt zugeordnet werden

### Nachrichten und Abstimmung

- Rollen mit Berechtigung koennen Nachrichten an alle oder an gezielte Empfaenger senden
- Nachrichten sollen Aufgaben und Protokollbeschluesse ergaenzen, nicht ersetzen
- spaetere Integrationen mit WhatsApp oder Telegram werden als Kanal-Erweiterung mitgedacht
- die fachliche Kernlogik bleibt dabei im System von `hege`, damit Nachrichten, Aufgaben und Rollen konsistent bleiben
- aus der App heraus soll eine WhatsApp-Nachricht an den passenden Empfaengerkreis vorbereitet oder direkt angestossen werden koennen
- externe Messenger-Nachrichten sollen nach Moeglichkeit auf eine interne Nachricht, Aufgabe oder Reviermeldung in `hege` zurueckfuehren
- Veranstaltungen sollen Einladungen, Erinnerungen, Treffpunkte, Aufgaben und zielgerichtete Empfaengerlisten unterstuetzen

## Aktueller Repository-Stand

Bereits vorhanden:

- Shared Domain Package mit Typen, Demo-Daten und Fachregeln
- sichtbares Web-Grundgeruest fuer Dashboard und Fachseiten
- sichtbare Mobile-App mit Kernscreens
- Demo-API mit REST-Ressourcen als Uebergangspfad
- lokale Infrastrukturdefinition fuer PostGIS und MinIO

Noch offen:

- echte Kartenintegration (Google Maps/react-native-maps)
- WebAuthn/Passkeys
- Messaging-Kanaele (WhatsApp, Telegram)
- Veranstaltungsmodul
- produktionsreife Offline-Synchronisierung

## Umsetzung

Die konkrete Umsetzungsreihenfolge ist hier beschrieben:

- [Root-Roadmap](../ROADMAP.md)
- [Roadmap und Sprints](./roadmap-v1.md)
- [Dokumentationsuebersicht](./README.md)
