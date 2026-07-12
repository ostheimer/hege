# Mobile-E2E mit Maestro

## Umfang

Maestro ergänzt den manuellen Geräte-Smoke um reproduzierbare iOS-Simulator-Flows. Automatisiert werden:

- sichtbarer Build-Tag,
- Login gegen die konfigurierte API,
- Dashboard-Start,
- Navigation über `Mehr` zu `Kontakte`,
- ausgeblendete Pflegefläche für Feldrollen,
- sichtbare Kontaktpflege für Schriftführung und Revier-Admin,
- sichtbare Offline-Vormerkungen und `Jetzt senden` im Fallwild-Erfassungsmodus.

Kamera, echtes GPS, Face ID und der echte Offline-Netzwechsel bleiben im physischen [iOS-Smoke-Runbook](./mobile-smoke-ios.md). Die Queue-Oberfläche und der App-Lebenszyklus werden vorher kontrolliert im Simulator geprüft. Maestro unterstützt lokale iOS-Läufe offiziell auf Simulatoren, nicht auf physischen iPhones.

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

Für die Warteschlangen-Oberfläche muss der Simulator bereits angemeldet und die echte Warteschlange leer sein:

```sh
pnpm mobile:e2e:ios:queue
```

Der Runner beendet die App, injiziert ausschließlich im Simulator einen konfliktbehafteten Fallwild-Eintrag, prüft `Offline-Vormerkungen` und `Jetzt senden` im Modus `Erfassen` und entfernt die Fixture anschließend wieder. Eine vorhandene Warteschlange wird niemals überschrieben.

Optionale Variablen:

- `HEGE_APP_ID`, Standard `app.hege.revier`
- `HEGE_EXPECTED_BUILD_TAG`, standardmäßig aus `apps/mobile/lib/build-tag.ts`

Die Flows liegen unter `.maestro/`. Test-IDs sind nur stabile Automatisierungsanker und ändern keine sichtbare Produktsprache.

## Verifizierter Lauf

Am 2026-07-12 liefen die Flows mit Maestro `2.6.1` auf einem iPhone-16e-Simulator mit iOS 26.2 erfolgreich für Ausgeher, Schriftführung und Revier-Admin. Der Queue-Flow lief mit Build-Tag `0.1.0 · 2026-07-12.19` grün; die Fixture war danach wieder entfernt.
