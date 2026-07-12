# iOS-Smoke-Runbook

## Ziel

Dieses Runbook beschreibt die reproduzierbare native Smoke-Abnahme der Expo-Mobile-App auf einem iPhone-Simulator oder einem angeschlossenen iPhone. iOS ist der primäre native Abnahmepfad für die Mobile-App; Android bleibt fachlich Zielplattform, wird aber separat standardisiert.

Der Smoke prüft keine vollständige Regression, sondern die wichtigsten nativen Pfade:

- Login mit vorhandenem internen Testkonto
- lokales Entsperren einer gespeicherten Sitzung per Face ID, Touch ID oder Geräteprüfung
- Dashboard laden und aktualisieren
- Ansitz-Screen laden und optional in einem abgestimmten Test-Revier starten
- Fallwild-Standort über iPhone-GPS erfassen und Adresse, Straße sowie Straßenkilometer-Felder prüfen
- Fallwild-Fotoauswahl prüfen und nur in einem abgestimmten Test-Revier speichern
- Offline-Queue v2, Retry-Hinweise und anschließenden Sync prüfen

## Voraussetzungen

- macOS mit installiertem Xcode und iOS-Simulator.
- Xcode Command Line Tools sind aktiv: `xcode-select -p`.
- Repository-Abhängigkeiten sind installiert, zum Beispiel mit `pnpm install`.
- Die Mobile-App kann aus `apps/mobile` mit Expo gestartet werden.
- Netzwerkzugriff auf `https://hege.app`.
- Ein vorhandenes internes Login-Testkonto aus den bestehenden Testdaten ist verfügbar.
- Keine Zugangsdaten, Tokens oder neuen Test-Secrets in dieses Runbook eintragen.

## Automatisierter Simulator-Vorlauf

Build-Tag, Login, Dashboard, Navigation und Kontaktrechte können vor dem physischen Geräte-Smoke mit Maestro geprüft werden. Einrichtung und Befehle stehen in [Mobile-E2E mit Maestro](./mobile-e2e-maestro.md). Der Vorlauf ersetzt Kamera, GPS, Face ID und Offline-Queue auf dem echten iPhone nicht.

## Simulator- oder Geräteauswahl

Ein physisches iPhone ist für die finale native Abnahme vorzuziehen, wenn Fotoauswahl, Standortfreigabe und Production-API gemeinsam geprüft werden sollen. Der Simulator bleibt der reproduzierbare Standardpfad für lokale Entwicklung.

### Angeschlossenes iPhone prüfen

```sh
xcrun devicectl list devices
xcrun xctrace list devices | grep -i iPhone
```

Wenn ein iPhone verbunden ist, kann die Release-App direkt auf das Gerät gespielt werden:

```sh
EXPO_PUBLIC_API_BASE_URL=https://hege.app/api/v1 pnpm --filter @hege/mobile exec expo run:ios --device "Andreas iPhone" --configuration Release --no-bundler
```

Nach erfolgreicher Installation die App auf dem iPhone öffnen und die untenstehenden Smoke-Schritte manuell durchführen.

### Gespeicherte Test-Sitzung ohne App-Face-ID starten

Für automatisierte Wiederanlauf- und Queue-Smokes kann ein gekoppeltes, entsperrtes Testgerät die App-eigene Face-ID-Sperre kontrolliert umgehen. Der Harness verändert keinen Production-Code und keine Sitzungstokens. Er sichert die lokale Einstellung, setzt sie nur während des Laufs auf deaktiviert und stellt den ursprünglichen Wert auch bei Fehlern wieder her:

```sh
HEGE_IOS_DEVICE_ID=<core-device-uuid> \
pnpm mobile:smoke:ios:session
```

Wenn bereits ein bewusst erzeugter Queue-Eintrag vorhanden ist, kann der Lauf zusätzlich dessen vollständige Verarbeitung verlangen:

```sh
HEGE_IOS_DEVICE_ID=<core-device-uuid> \
HEGE_EXPECT_QUEUE_SYNC=1 \
pnpm mobile:smoke:ios:session
```

Der Harness funktioniert ausschließlich über die Entwicklerdienste eines bereits gekoppelten Testgeräts. Die iOS-Gerätesperre selbst wird nicht und darf nicht umgangen werden; das iPhone muss für einen physischen Lauf entsperrt sein. Für vollständig unbeaufsichtigte Abnahmen bleibt der iOS-Simulator der Standard.

### Simulator-Auswahl

1. Verfügbare iPhone-Simulatoren prüfen:

   ```sh
   xcrun simctl list devices available | grep -E "iPhone 17|iPhone"
   ```

2. Wenn lokal vorhanden, bevorzugt einen `iPhone 17`-Simulator verwenden.

3. Falls kein `iPhone 17` verfügbar ist, den neuesten verfügbaren iPhone-Simulator verwenden.

4. Simulator vor dem Start öffnen oder booten:

   ```sh
   open -a Simulator
   ```

   Optional kann ein konkretes Gerät über Xcode > Window > Devices and Simulators oder über die Simulator-App ausgewählt werden.

## Testbild vorbereiten und importieren

Das Fallwild-Foto wird über die iOS-Fotoauswahl getestet. Dafür ein reproduzierbares Testbild erzeugen und in den gebooteten Simulator importieren:

```sh
node apps/mobile/scripts/create-test-image.mjs
xcrun simctl addmedia booted apps/mobile/tmp/hege-test-image.png
```

Wenn der Simulator nicht gebootet ist, zuerst den gewünschten iPhone-Simulator starten und den Import danach erneut ausführen.

## App starten

Für den Simulator aus dem Mobile-Verzeichnis starten, damit Expo die App-Konfiguration eindeutig findet:

```sh
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=https://hege.app/api/v1 npx expo start --ios --clear
```

Wichtig: Die API-Basis für diesen Smoke ist `EXPO_PUBLIC_API_BASE_URL=https://hege.app/api/v1`. Nicht auf lokale API-URLs oder Demo-Fallbacks ausweichen, außer die Abnahme wird ausdrücklich als lokale Entwicklervariante dokumentiert.

## Login

1. App im iPhone-Simulator öffnen.
2. Mit dem vorhandenen internen Login-Testkonto anmelden.
3. Das Testkonto muss aus bestehenden internen Testdaten, einem freigegebenen Passwortmanager oder dem vereinbarten Seed-Datensatz stammen.
4. Keine neuen Zugangsdaten erfinden und keine Secrets in Git, Tickets oder Screenshots dokumentieren.

Erwartung:

- Login ist erfolgreich.
- Die App wechselt auf die geschützte Hauptnavigation.
- Das aktive Test-Revier ist sichtbar oder fachlich eindeutig erkennbar.

## Face-ID-/Geräte-Entsperren-Smoke

Dieser Schritt gilt für ein physisches iPhone oder einen Simulator mit eingerichteter Geräteprüfung. Er prüft bewusst nicht echten WebAuthn-Passkey-Login, sondern das lokale Entsperren einer bereits gespeicherten Session.

1. Einmal mit Benutzername oder E-Mail und vierstelliger PIN anmelden.
2. App vollständig schließen oder neu starten.
3. App erneut öffnen.
4. Wenn die gespeicherte Sitzung gesperrt ist, `Mit Face ID entsperren` beziehungsweise die angezeigte Geräteprüfung antippen.
5. Den nativen iOS-Dialog erfolgreich bestätigen.

Erwartung:

- Die gespeicherte Sitzung wird als gesperrt behandelt und nicht ungefragt geöffnet.
- Der native iOS-Dialog erscheint mit `hege entsperren`.
- Nach erfolgreicher Geräteprüfung wechselt die App auf Dashboard und Tabs.
- PIN-Login bleibt als Fallback sichtbar.

Abnahmestand: Der Face-ID-Flow wurde am 2026-05-06 auf dem angeschlossenen iPhone mit der Production-App bestätigt.

## Dashboard-Smoke

1. Den Dashboard-Tab öffnen.
2. Sichtbare Kennzahlen, Meldungen oder Revier-Informationen prüfen.
3. Manuell aktualisieren, zum Beispiel per Pull-to-Refresh.

Erwartung:

- Dashboard-Daten werden aus der API geladen.
- Kein dauerhafter Ladezustand bleibt stehen.
- Fehlerzustände sind verständlich und blockieren die Navigation nicht.

## Ansitz-Smoke

1. Den Tab `Ansitz` öffnen.
2. Liste aktiver Ansitze laden oder manuell aktualisieren.
3. Wenn ein abgestimmtes Test-Revier oder ein explizit freigegebener Testdatensatz verfügbar ist, einen neuen Ansitz starten.
4. Wenn Standortauswahl erforderlich ist, einen vorhandenen Test-Hochstand oder die aktuelle Simulator-Position verwenden.
5. Optional eine kurze Testnotiz eintragen, zum Beispiel `iOS Smoke`.
6. Den erstellten Ansitz in der aktiven Liste prüfen.
7. Falls die mobile Oberfläche das Beenden unterstützt, den eigenen Test-Ansitz wieder beenden; andernfalls die offene Bereinigung separat notieren.

Erwartung:

- Der Ansitz-Screen lädt ohne App-Neustart.
- Optional erstellte Test-Ansitze sind nach dem Start sichtbar.
- Nicht bereinigte Testdaten werden mit Zeitpunkt und Testkonto-Bezug dokumentiert.

## Fallwild-Fotoauswahl-Smoke

1. Den Tab `Fallwild` öffnen.
2. `Standort automatisch erfassen` antippen und die iOS-Standortberechtigung erlauben.
3. Prüfen, dass Breitengrad, Längengrad und GPS-Genauigkeit übernommen werden.
4. Falls Google/GIP in der Zielumgebung nicht konfiguriert sind, Gemeinde, Straße und Straßenkilometer manuell ergänzen.
5. Foto hinzufügen und die iOS-Fotoauswahl öffnen.
6. Das zuvor importierte Testbild auswählen.
7. Prüfen, dass maximal drei Fotos auswählbar bleiben.
8. Nur wenn Testdaten in diesem Revier ausdrücklich erlaubt sind, den Fallwild-Vorgang speichern.

Erwartung:

- Die native iOS-Standortabfrage erscheint beim ersten Zugriff.
- GPS wird auch dann übernommen, wenn Adresse oder GIP-Straßenkilometer nicht automatisch verfügbar sind.
- Adresse und Straße werden übernommen, wenn `GOOGLE_MAPS_SERVER_API_KEY` in der Zielumgebung konfiguriert ist.
- Straßenkilometer bleiben manuell editierbar, solange kein produktiver GIP-Resolver aktiv ist.
- Mit `HEGE_GEO_PROVIDER=mock` kann der UI-Fluss ohne externe Keys gegen lokale Gänserndorf-Testdaten geprüft werden; sichtbare Hinweise müssen klar als Mock-/Testdaten erkennbar bleiben.
- Die native iOS-Fotoauswahl öffnet sich.
- Das importierte Testbild ist auswählbar.
- Die Vorschau zeigt Dateiname und Anhang nachvollziehbar an.
- Beim Speichern im Test-Revier wird der Foto-Upload abgeschlossen oder landet nachvollziehbar in der Offline-Queue.

## Queue-Sync-Smoke

Der Queue-Sync soll zeigen, dass Kernaktionen bei kurzzeitig fehlendem Netz vorgemerkt und später synchronisiert werden. Der aktuelle Pfad nutzt Queue v2 mit separaten Foto-Upload-Einträgen, Retry-Backoff und manuellen Aktionen für problematische Einträge.

1. App und Dashboard einmal online vollständig laden.
2. Netzwerkverbindung des Macs kurz trennen oder mit Network Link Conditioner eine Offline-Situation simulieren.
3. Einen kleinen Testvorgang in einem abgestimmten Test-Revier erzeugen, bevorzugt Fallwild mit dem importierten Testbild.
4. Prüfen, dass die App den Vorgang als ausstehend, offline oder in der Warteschlange erkennbar macht.
5. Netzwerk wiederherstellen.
6. App aus dem Kontrollzentrum oder den Einstellungen wieder in den Vordergrund holen.
7. Warten, bis die Queue abgearbeitet ist.
8. Falls die automatische Verarbeitung nicht sofort erfolgt, im Fallwild-Screen Pull-to-Refresh oder `Jetzt senden` ausführen.
9. Für einen fehlgeschlagenen oder konfliktbehafteten Testeintrag die sichtbaren Aktionen `Erneut versuchen` und `Verwerfen` prüfen, aber nur im abgestimmten Test-Revier verwerfen.

Erwartung:

- Die App bleibt bedienbar.
- Der Vorgang geht nicht verloren.
- Ausstehende Queue-Einträge werden beim erneuten Aktivieren der App nach wiederhergestelltem Netz automatisch synchronisiert.
- Pull-to-Refresh und `Jetzt senden` starten einen sofortigen Retry auch dann, wenn vorher bereits ein Retry-Backoff gesetzt war.
- Offline-Vormerkungen bleiben im Modus `Erfassen` sichtbar, bis sie tatsächlich verarbeitet oder bewusst verworfen wurden.
- Erfolgreich synchronisierte Einträge verschwinden aus dem Pending-Zustand oder werden als synchronisiert angezeigt.
- Fehlgeschlagene Einträge zeigen den nächsten Retry-Zeitpunkt und lassen sich manuell erneut versuchen oder verwerfen.
- Konflikte werden nicht automatisch endlos wiederholt.

## Bekannte Stolperstellen

### Expo-Go-Developer-Menü

- Im iOS-Simulator öffnet `Cmd+D` das Expo-Go-Developer-Menü.
- Wenn das Menü versehentlich offen bleibt, kann es Eingaben blockieren oder den Eindruck erwecken, die App reagiere nicht.
- Bei Hängern zuerst das Menü schließen und die App über `Reload` oder `R` neu laden.
- Sicherstellen, dass Expo Go mit dem aktuellen Metro-Prozess verbunden ist und nicht mit einem alten Projekt.

### Babel-/Metro-Cache

- Änderungen an `EXPO_PUBLIC_*`-Variablen, Babel-Konfiguration oder Metro-Konfiguration werden nicht zuverlässig durch reines Reload übernommen.
- Expo mit `Ctrl+C` beenden und mit Cache-Clear neu starten:

  ```sh
  EXPO_PUBLIC_API_BASE_URL=https://hege.app/api/v1 npx expo start --ios --clear
  ```

- Wenn der Simulator weiter alten Code zeigt, Expo Go vollständig beenden, den Simulator neu öffnen und den Startbefehl erneut ausführen.

### Storage-Konfiguration

- Wenn Foto-Queue-Einträge mit `Storage ist nicht konfiguriert.` fehlschlagen, ist der Mobile-Queue-Pfad erwartungsgemäß aktiv, aber die Zielumgebung hat noch keine S3/R2-Storage-Konfiguration.
- In diesem Fall Retry-Zeitpunkt, Fehlertext, `Erneut versuchen`, `Verwerfen` und Dashboard-Zähler dokumentieren.
- Nach korrigierter Storage-Konfiguration denselben Smoke erneut ausführen und prüfen, dass die Foto-Queue nach dem Sync leer ist.
- Production-Stand vom 2026-04-27: R2-Storage ist aktiv, `https://hege.app/api/v1` akzeptiert Fallwild-Foto-Uploads und die erzeugten Dateien sind unter `https://assets.hege.app` öffentlich abrufbar.

## Abschlusskriterien

Der iOS-Smoke gilt als bestanden, wenn:

- Login mit internem Testkonto funktioniert.
- Face-ID-/Geräte-Entsperren einer gespeicherten Sitzung funktioniert oder ist auf dem Testgerät nachvollziehbar nicht verfügbar.
- Dashboard online lädt und aktualisiert.
- Ansitz geladen und optional im Test-Revier gestartet werden kann.
- Fallwild inklusive nativer Fotoauswahl mit importiertem Testbild geprüft und optional im Test-Revier gespeichert werden kann.
- Offline erzeugte Aktionen in der Queue sichtbar sind und nach Netzrückkehr synchronisieren.
- Fehlerhafte Queue-Einträge Retry-Zeitpunkt, Fehlertext sowie die Aktionen `Erneut versuchen` und `Verwerfen` nachvollziehbar anzeigen.

Alle Abweichungen mit Simulator-Modell, iOS-Version, Zeitpunkt, Testkonto-Bezug ohne Secret und beobachtetem Screen dokumentieren.
