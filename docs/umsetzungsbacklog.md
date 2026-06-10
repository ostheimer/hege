# Umsetzungsbacklog

## Zweck

Dieses Dokument ergänzt die Roadmap um die operative Planung. Es zerlegt die nächsten Entwicklungsschritte in konkret umsetzbare Sprint-Backlogs.

Der historische Fokus lag auf:

- `Sprint 0`: technische Produktbasis
- `Sprint 1`: erste nutzbare Web-Version für Schriftführer

Der aktuelle Anschlussfokus nach Medien-/Queue-v2 liegt auf der Standort-Härtung für Fallwild: Google-Adressauflösung, GIP-Straßenkilometer und der erneute native iPhone-Smoke für Foto-Upload, Standort und leere Queue. Das lokale Face-ID-/Geräte-Entsperren gespeicherter Mobile-Sessions ist umgesetzt und auf dem angeschlossenen iPhone bestätigt.

## Planungsprinzipien

- zuerst Fundament, dann sichtbare Fachoberfläche
- ein Sprint liefert nur zusammenhängende, überprüfbare Ergebnisse
- API, Web und Datenmodell werden gemeinsam geplant, nicht isoliert
- jede Story enthält Akzeptanzkriterien und betroffene Repo-Bereiche

## Überblick

### Sprint 0

Ziel: Demo-Backend durch eine produktive Kernplattform ersetzen

Details:

- [Sprint 0 Backlog](./sprint-0-backlog.md)
- [Agent-Workstreams Sprint 0](./agent-workstreams-sprint-0.md)

### Sprint 1

Ziel: Schriftführer-Backend für Sitzungen und Protokolle bis zur Freigabe nutzbar machen

Details:

- [Sprint 1 Backlog](./sprint-1-backlog.md)
- [Agent-Workstreams Sprint 1](./agent-workstreams-sprint-1.md)

## Geplante Folge-Sprints

Die späteren Sprints bleiben vorerst auf Roadmap-Niveau und werden erst detailliert, wenn Sprint 0 und Sprint 1 stabil geschnitten sind.

- Sprint 2: Jäger-App Kern
- Sprint 3: Fallwild produktiv inkl. Offline-Sync und Medien-/Queue-v2
- Sprint 4: Reviermeldungen und Aufgaben v1, begonnen mit Backend-/Mobile-Slice und lokal bestandenem iPhone-Smoke für `Meldungen`
- ~~Sprint 5: Reviereinrichtungen, Karten und weitere Härtung~~ — aufgelöst: Karten sind in Web (Google Maps) und Mobile (react-native-maps) produktiv; der verbleibende Einrichtungs-Ausbau (Kontroll-Erfassung) wird separat getrackt

## Definition of Ready für neue Sprint-Backlogs

Ein Sprint wird erst weiter detailliert, wenn:

- die fachlichen Ziele des vorigen Sprints bestätigt sind
- die API-Verträge der vorigen Stufe stabil sind
- offene Architekturentscheidungen nicht mehr blockieren
- der Abnahmerahmen für den nächsten Sprint schriftlich feststeht

## Definition of Done für die hier beschriebenen Sprints

- Code liegt im Monorepo und baut lokal
- API, Web und Shared Package sind konsistent
- Dokumentation ist aktualisiert
- Akzeptanzkriterien sind mit Tests oder manuellen Checks abgedeckt
- der sichtbare Nutzerfluss ist im jeweiligen Sprint-Ende tatsächlich demonstrierbar
