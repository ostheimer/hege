# iOS-Geräte-Smoke 2026-07-10/11

## Rahmen

- Gerät: iPhone 16 Pro (`iPhone17,1`), iOS 26.5
- Installierte native Version: `1.0` (`Build 7`, Runtime `1.0.1`)
- Beginn: Preview-OTA `0.1.0 · 2026-06-13.16`
- Fix-Abnahme: lokal installierter Release-Build `0.1.0 · 2026-07-10.17`
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

Die Korrektur wurde als `0.1.0 · 2026-07-10.17` lokal im Release-Modus auf demselben iPhone installiert und visuell bestätigt. Mobile-Typecheck sowie 178 Vitest-Tests laufen grün.

## Offene Punkte

- `.17` ist noch nicht als Preview-OTA veröffentlicht und noch nicht nach Production übernommen.
- Der Offline-zu-Online-Queue-Sync wurde nicht erneut ausgeführt, da dafür ein weiterer Production-Testvorgang erzeugt würde.
- Pflege-Rechte für Schriftführung oder Admin wurden in dieser Session nicht nativ geprüft.
- Der beim Kamera-Smoke erzeugte Production-Datensatz `fallwild-fddbb7c0-f7a3-48c4-a238-d60cfa1e0593` bleibt bestehen; die API bietet derzeit keinen DELETE-Endpunkt zur Bereinigung.

## Bewertung

Der Production-API-Pfad für Login, Face ID, Dashboard, Kontakte, GPS, Google-Standortauflösung, Kamera und R2-Foto-Upload ist auf einem echten iPhone bestätigt. A1 bleibt offen, bis Queue-Sync und Rollenpflege geprüft sowie der abgenommene OTA-Stand nach Production übernommen wurden.
