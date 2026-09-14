# Design-QA: Reviereinrichtungen

Datum: 5. September 2026
Gerät: iPhone 17 Pro, iOS 26.5 Simulator
Ergebnis: `passed`

## Geprüfte Referenzen

- Erfassung: `/Users/andreas/.codex/generated_images/01a034d3-9e19-7a80-b548-ff33b3501dc7/exec-f261f0c0-bff0-4c74-b5e4-b74bf351185a.png`
- Detail: `/Users/andreas/.codex/generated_images/01a034d3-9e19-7a80-b548-ff33b3501dc7/exec-cce7c911-45b6-49b3-9563-43fb066e5ed8.png`

## Ergebnis

- Die Erfassung und die gespeicherte Detailansicht sind klar getrennte Zustände.
- Das erste Foto sitzt jeweils als großes Titelbild oben; mehrere Fotos sind horizontal seitenweise durchwischbar und zeigen Zähler sowie Positionspunkte.
- Die Erfassung bietet Kamera, Mediathek, Entfernen, Pflichtauswahl des Zustands, GPS und manuelles Setzen auf der Karte.
- Die Detailansicht zeigt Zustand und Stammdaten nur lesbar, eine auf den Standort zentrierte Karte und den Link zu Google Maps.
- Fehlende Fotos erhalten einen gestalteten Leerzustand; fehlgeschlagene Bildabrufe einen verständlichen Fehlerzustand.
- Fotos werden nicht öffentlich freigegeben, sondern mit kurzlebigen signierten Lese-URLs geladen.
- Touchflächen, Kontrast, sichtbare Umlaute und Bildbeschreibungen wurden im Simulator geprüft.

## Lokale Funktionsprüfung

- `.maestro/ios-reviereinrichtung-capture-layout.yaml`: bestanden.
- `.maestro/ios-reviereinrichtung-detail-gallery.yaml`: `1 / 3` auf `2 / 3` gewischt, Karte und Google-Maps-Link sichtbar; bestanden.
- `.maestro/ios-reviereinrichtung-create-photo-detail.yaml`: Foto aus Mediathek gewählt, Pflichtfelder und GPS gesetzt, online gespeichert, anschließend aus der Liste in die Detailansicht geöffnet; bestanden.
- Der ausschließlich dafür angelegte Testdatensatz samt Testfoto wurde danach aus lokaler PostgreSQL-Datenbank und lokalem MinIO entfernt.

## Bewusste Abweichungen

- Die bestehende Hege-Navigation und das vorhandene Kartenmodul bleiben erhalten, damit kein paralleles Designsystem entsteht.
- Die App verwendet ausschließlich vom Benutzer ausgewählte Fotos; das Referenzfoto ist nicht Bestandteil der App.
- Bearbeiten ist weiterhin ein eigener zukünftiger Modus und wurde nicht als scheinbar funktionsfähige Aktion in die reine Detailansicht aufgenommen.
