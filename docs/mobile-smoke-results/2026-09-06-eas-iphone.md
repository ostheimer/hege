# EAS-Preview und iPhone-Installation

Andreas hat EAS-Build und iPhone-Übertragung ausdrücklich beauftragt.

- Erster Build `6cfbd451-7acf-407f-9d33-069823520b1f`: bei der Installation abgebrochen. EAS nutzte pnpm 9.15.9, das Projekt pnpm 10.29.2 (`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`).
- Korrektur: Preview-Profil in `apps/mobile/eas.json` auf pnpm 10.29.2 festgelegt.
- Lokal geprüft: tatsächliches EAS-Archiv mit eingefrorener Lockdatei installiert, Domain/Tokens gebaut und iOS-Release-Bundle exportiert. Keine Lockfile-Aufweichung.
- Korrigierter Build: `27d8c6d6-4d0e-48cd-8b6c-a0392fe1152b`, Preview/Ad Hoc, Bundle-ID `app.hege.revier`, Runtime 1.0.1, API `https://hege.app/api/v1`.
- Zielgerät: angeschlossenes „Andreas iPhone“, iPhone 16 Pro, im Provisionierungsprofil enthalten.

## Ergebnis

- Korrigierter EAS-Build erfolgreich (`FINISHED`), IPA exportiert und signiert.
- Am 06.09.2026 um 13:33 Uhr mit `devicectl device install app` auf Andreas' iPhone installiert; Bundle-ID `app.hege.revier` bestätigt. Keine Deinstallation oder Datenlöschung vorgenommen.
- Automatischer App-Start danach von iOS mit `Locked` abgelehnt. Installation ist abgeschlossen; Start- und Sichtprüfung auf dem echten Gerät stehen bis zum Entsperren aus.
- Installationsdatei lokal: `/tmp/hege-iphone-20260906.xUcFyl/hege.ipa`.
- Build: https://expo.dev/accounts/aostheimer/projects/hege-revier/builds/27d8c6d6-4d0e-48cd-8b6c-a0392fe1152b

Die acht lokalen Testeinrichtungen werden durch den App-Build nicht auf den produktiven Server übertragen. Kein App-Store-Release oder zusätzliches OTA-Update veröffentlicht.
