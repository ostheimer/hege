# Mobile-E2E mit Maestro

## Umfang

Maestro ergänzt den manuellen Geräte-Smoke um reproduzierbare iOS-Simulator-Flows. Automatisiert werden:

- sichtbarer Build-Tag,
- Login gegen die konfigurierte API,
- Dashboard-Start,
- Navigation über `Mehr` zu `Kontakte`,
- ausgeblendete Pflegefläche für Feldrollen,
- sichtbare Kontaktpflege für Schriftführung und Revier-Admin.

Kamera, echtes GPS, Face ID und Offline-Netzwechsel bleiben im physischen [iOS-Smoke-Runbook](./mobile-smoke-ios.md). Maestro unterstützt lokale iOS-Läufe offiziell auf Simulatoren, nicht auf physischen iPhones.

## Installation

Auf macOS:

```sh
brew tap mobile-dev-inc/tap
brew install openjdk@17 mobile-dev-inc/tap/maestro
```

Das Repo-Skript setzt `JAVA_HOME` für die Homebrew-Installation automatisch. Referenz: [Maestro CLI installieren](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).

## Ausführen

Voraussetzung ist eine installierte App mit Bundle-ID `app.hege.revier` auf einem gebooteten iOS-Simulator. Zugangsdaten werden ausschließlich zur Laufzeit übergeben:

```sh
HEGE_SMOKE_IDENTIFIER=<username> \
HEGE_SMOKE_PIN=<pin> \
pnpm mobile:e2e:ios:core
```

Für Schriftführung und Revier-Admin denselben Rollen-Flow jeweils mit dem passenden Testkonto ausführen:

```sh
HEGE_SMOKE_IDENTIFIER=<username> \
HEGE_SMOKE_PIN=<pin> \
pnpm mobile:e2e:ios:roles
```

Optionale Variablen:

- `HEGE_APP_ID`, Standard `app.hege.revier`
- `HEGE_EXPECTED_BUILD_TAG`, standardmäßig aus `apps/mobile/lib/build-tag.ts`

Die Flows liegen unter `.maestro/`. Test-IDs sind nur stabile Automatisierungsanker und ändern keine sichtbare Produktsprache.

## Verifizierter Lauf

Am 2026-07-12 liefen die Flows mit Maestro `2.6.1` auf einem iPhone-16e-Simulator mit iOS 26.2 erfolgreich für Ausgeher, Schriftführung und Revier-Admin.
