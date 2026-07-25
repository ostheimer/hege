# Mobile-E2E mit Maestro

## Umfang

Maestro ergänzt den manuellen Geräte-Smoke um reproduzierbare iOS-Simulator-Flows. Automatisiert werden:

- sichtbarer Build-Tag,
- Login gegen die konfigurierte API,
- Dashboard-Start,
- Navigation über `Mehr` zu `Kontakte`,
- ausgeblendete Pflegefläche für Feldrollen,
- sichtbare Kontaktpflege für Schriftführung und Revier-Admin,
- sichtbare Offline-Vormerkungen und `Jetzt senden` im Fallwild-Erfassungsmodus,
- Reviereinrichtung per simuliertem GPS erfassen, speichern, als Karten-Pin und in der Suche finden,
- Winddaten und Sonnenzeiten einer Ansitzeinrichtung anzeigen,
- persistierte Offline-Reviereinrichtungen über eine sichere Simulator-Fixture prüfen.

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

Reviereinrichtungen werden mit einem lokalen API-Server, gesetztem Simulator-GPS und einem Testkonto geprüft:

```sh
HEGE_SMOKE_IDENTIFIER=<username> \
HEGE_SMOKE_PIN=<pin> \
pnpm mobile:e2e:ios:reviereinrichtungen

pnpm mobile:e2e:ios:reviereinrichtungen:queue
```

Beim ersten Lauf mit leerem Metro-Cache wählt der Flow den sichtbaren Development Server selbst aus und wartet bis zu 60 Sekunden auf den einmaligen Startdialog des Expo Development Clients. Ein manueller Tap im Simulator ist dafür nicht erforderlich.

Der Runner beendet die App, injiziert ausschließlich im Simulator einen konfliktbehafteten Fallwild-Eintrag, prüft `Offline-Vormerkungen` und `Jetzt senden` im Modus `Erfassen` und entfernt die Fixture anschließend wieder. Eine vorhandene Warteschlange wird niemals überschrieben.

Der Reviereinrichtungs-Queue-Runner verwendet denselben Schutzvertrag: Er bricht bei vorhandenen Vormerkungen ab, injiziert nur `Offline Testkanzel`, prüft die sichtbare Konfliktmeldung und räumt den Eintrag auch nach einem fehlgeschlagenen Testlauf wieder auf.

Optionale Variablen:

- `HEGE_APP_ID`, Standard `app.hege.revier`
- `HEGE_EXPECTED_BUILD_TAG`, standardmäßig aus `apps/mobile/lib/build-tag.ts`

Die Flows liegen unter `.maestro/`. Test-IDs sind nur stabile Automatisierungsanker und ändern keine sichtbare Produktsprache.

## Verifizierter Lauf

Am 2026-07-25 lief der kombinierte Reviereinrichtungs-Flow mit leerem Metro-Cache auf einem iPhone-17-Pro-Simulator mit iOS 26.4 gegen die Production-API grün. Login, simuliertes GPS, Speichern, Erfolgsmeldung ohne verbliebenes Formular, Karten-Pin, Suche, Wind und Sonnenzeiten waren sichtbar; der eindeutig zugeordnete Smoke-Datensatz wurde anschließend transaktional entfernt und die Abwesenheit erneut geprüft. Build-Tag `0.1.0 · 2026-07-21.23`.

Der frühere Lauf vom 2026-07-13 bestätigte zusätzlich den separaten Wetter- und Reviereinrichtungs-Queue-Flow mit Maestro `2.6.1`; die Queue-Fixture wurde dabei automatisch entfernt.
