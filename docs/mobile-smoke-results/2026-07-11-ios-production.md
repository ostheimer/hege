# iOS-Geräte-Smoke 2026-07-10/11

## Rahmen

- Gerät: iPhone 16 Pro (`iPhone17,1`), iOS 26.5
- Installierte native Version: `1.0` (`Build 7`, Runtime `1.0.1`)
- Beginn: Preview-OTA `0.1.0 · 2026-06-13.16`
- Fix-Abnahme: lokal installierter Release-Build `0.1.0 · 2026-07-10.17`
- Preview-OTA-Abnahme: Gruppe `3632ac5e-6994-43c8-8e03-1d0bc385ba85`, Commit `2175003`
- Backend: Production unter `https://hege.app/api/v1`
- Rolle: Ausgeher

## Bestanden

- Gespeicherte Sitzung lässt sich per Face ID entsperren.
- Dashboard lädt Production-Daten und zeigt `Sync OK`.
- Telefonlisten laden 12 registrierte Mitglieder sowie drei freie Listen.
- Reviernachbarn, Weidkameraden und Notrufnummern sind sichtbar.
- Die Anrufen-Aktion öffnet den nativen iOS-Bestätigungsdialog mit der erwarteten Nummer.
- Für die Rolle Ausgeher sind keine Pflege-Aktionen sichtbar.
- Echtes Geräte-GPS wird mit etwa 4 m Genauigkeit übernommen.
- Google Reverse Geocoding ergänzt in Gänserndorf Adresse, Gemeinde und Straße.
- Für die geprüfte Koordinate wird kein GIP-Straßenkilometer gefunden; der manuelle Fallback wird verständlich angezeigt.
- Die native Kamera öffnet sich, ein Foto kann übernommen und direkt gespeichert werden.
- Der erzeugte Fallwild-Vorgang ist über die Production-API lesbar.
- Das Foto wird als `Fallwild-Foto 1` geführt und ist über `assets.hege.app` als `image/jpeg` mit HTTP 200 abrufbar.

## Finding und Korrektur

Kontaktkarten zeigten das Telefon-Symbol doppelt: einmal dekorativ und einmal als echte Anrufen-Aktion. Die dekorative Darstellung wurde in `apps/mobile/app/(tabs)/kontakte.tsx` durch den bestehenden tappbaren Anruf-Button ersetzt; der zweite Button entfällt.

Die Korrektur wurde als `0.1.0 · 2026-07-10.17` lokal im Release-Modus auf demselben iPhone installiert und visuell bestätigt. Anschließend wurde derselbe Commit als Preview-OTA veröffentlicht und über den registrierten Preview-Build geladen. Die lokale Expo-Updates-Datenbank weist die Update-ID `019f52ec-94a5-7f6f-a978-db4e1f7a25b0` mit einem erfolgreichen und keinem fehlgeschlagenen Start aus. Mobile-Typecheck sowie 178 Vitest-Tests laufen grün.

## Offene Punkte

- `.17` ist als Preview-OTA abgenommen, aber noch nicht nach Production übernommen.
- Der Offline-zu-Online-Queue-Sync wurde nicht erneut ausgeführt, da dafür ein weiterer Production-Testvorgang erzeugt würde.
- Pflege-Rechte für Schriftführung oder Admin wurden in dieser Session nicht nativ geprüft.
- Der beim Kamera-Smoke erzeugte Production-Datensatz `fallwild-fddbb7c0-f7a3-48c4-a238-d60cfa1e0593` bleibt bestehen; die API bietet derzeit keinen DELETE-Endpunkt zur Bereinigung.

## Bewertung

Der Production-API-Pfad für Login, Face ID, Dashboard, Kontakte, GPS, Google-Standortauflösung, Kamera und R2-Foto-Upload ist auf einem echten iPhone bestätigt. A1 bleibt offen, bis Queue-Sync und Rollenpflege geprüft sowie der abgenommene OTA-Stand nach Production übernommen wurden.

## Folgestand 2026-07-12

- Der geschützte Cleanup-Pfad wurde mit PR #197 ergänzt; `fallwild-fddbb7c0-f7a3-48c4-a238-d60cfa1e0593` und das zugehörige R2-Objekt sind gelöscht und per `404` gegengeprüft.
- Build-Tag `.18` wurde auf Preview und Production veröffentlicht.
- Die Rollen-Smokes für Ausgeher, Schriftführung und Revier-Admin liefen im iOS-Simulator grün.
- Der physische Offline-Test deckte einen fehlenden Wiederaufnahme-Sync auf. Korrektur und selbstständige Simulatorabnahme sind in [iOS-Queue-Smoke 2026-07-12](./2026-07-12-ios-queue.md) dokumentiert; der abschließende `.19`-Gegencheck auf dem iPhone bleibt offen.
