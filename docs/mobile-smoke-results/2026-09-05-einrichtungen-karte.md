# Einrichtungen: Kartenfläche und Testbestand

Die Erfassung zeigt eine größere Standortkarte ohne zusätzliche innere Kartenumrandung. Leere Koordinaten erzeugen keinen Punkt bei 0,0 mehr; ohne Auswahl wird das aktive Revier verwendet. In Karte & Bestand sind Suche und Filter zunächst eingeklappt. Karten lassen sich bildschirmfüllend öffnen, verschieben und über Gesten oder Plus/Minus zoomen.

Acht dauerhaft für den aktuellen lokalen Test angelegte Einrichtungen tragen das Präfix „Test“. Das wiederholbare SQL-Skript `apps/web/scripts/seed-facility-ui-local.sql` erzeugt Positionen innerhalb der importierten Grenze abzüglich Ausschlussflächen. Es wurde ausschließlich gegen den lokalen Container hege-postgres ausgeführt.

Prüfung: Mobile-Typecheck, 202 Unit-Tests und Maestro `ios-facility-map-review.yaml` bestanden (Bestand, Vollbild, zweimal vergrößern, verkleinern, schließen, Liste). Vollbild visuell geprüft, einschließlich Abstand zur Statusleiste.

iPhone 16 Pro erkannt, Hege installiert. Start über den lokalen Entwicklungsserver wurde von iOS wegen gesperrtem Gerät abgelehnt; Handy-Abnahme steht noch aus. Kein EAS-Build und kein OTA-Update veröffentlicht. Lokale API und Metro laufen für den Gerätetest auf dem Mac; beide Geräte müssen sich im gleichen Netzwerk erreichen.

## Nachprüfung: GPS-Ausfall (17:37 Uhr)

Die vorherige Prüfung deckte den GPS-Fehlerzustand nicht ab. Der vom Nutzer gezeigte Fehler war real: Ein gemeinsamer Fehlerzustand zeigte den nativen GPS-Fehler auch im Bestand als angeblich nicht verfügbare Einrichtungen an.

GPS-, Lade-, Formular- und Übertragungsfehler sind jetzt getrennt. GPS-Ausfälle zeigen einen verständlichen Hinweis direkt am Standort mit manueller Alternative; beim Setzen eines Kartenpunkts verschwindet der Hinweis. Bestand und Liste bleiben unabhängig davon nutzbar.

Regressionstest `.maestro/ios-facility-location-failure.yaml` zuerst rot, nach Korrektur grün. Vorbedingung: `xcrun simctl location booted clear`. Geprüft: GPS-Ausfall, Wechsel in Bestand, Vollbild und Zoom, Liste, Rückkehr zur Erfassung und manuelle Position. Screenshots aller fünf Zustände tatsächlich geöffnet und visuell geprüft. Letzter Lauf: `/Users/andreas/.maestro/tests/2026-09-05_173635/`. Mobile-Typecheck und 202 Unit-Tests grün. Keine Einrichtung durch diesen Test gespeichert, kein EAS-Build/OTA-Update. Dies ersetzt keine physische GPS-/Kamera-Abnahme am iPhone.
