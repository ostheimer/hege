# TODO

Der priorisierte, autonom ausführbare Arbeitsplan liegt in [docs/autonomer-umsetzungsplan-2026-05.md](docs/autonomer-umsetzungsplan-2026-05.md).

## Offen

- iPhone-/iOS-Geräte-Smoke auf Production erneut auf erfolgreichen Foto-Upload, automatische Standortauflösung und leere Queue prüfen.
- Kontaktlisten im nativen iPhone-Smoke prüfen: Mitgliederliste, freie Listen, Anrufen-Aktion und Pflege-Rechte für Schriftführung/Admin.
- Echten WebAuthn-/Passkey-Login serverseitig planen; Mobile kann zunächst nur eine bestehende Sitzung lokal per Face ID entsperren.
- GIP-Bounding-Box für Jagdgesellschaft Gänserndorf fachlich prüfen und bei Bedarf größeren Revier-Ausschnitt als `GIP_ROAD_KILOMETER_INDEX_PATH` deployen.
- Mobile-spezifische E2E-Strategie für Expo und native Oberflächen über den dokumentierten Geräte-Smoke hinaus festziehen.
- Android-Emulator-Smoke nach [Android-Smoke-Runbook](docs/mobile-smoke-android.md) als optionalen Zweitpfad vorbereiten, falls später Android-Abdeckung ohne physisches Gerät benötigt wird.
- Rollen- und Empfängergruppenmodell für zielgerichtete Sichtbarkeit von Nachrichten, Aufgaben und Veranstaltungen gegen [Rollen/Aufgaben/Nachrichten v1](docs/rollen-aufgaben-nachrichten-v1.md) festziehen.
- Veranstaltungsmodul mit Ankündigung, Treffpunkt, Erinnerungen und optionaler Teilnahmebestätigung planen.
- WhatsApp-Anstoß aus der App fachlich und technisch gegen interne Nachrichten und Aufgaben abgrenzen.

### UI-Audit 2026-05-07

Vollständiger Befund mit Code-Verweisen und Reproduktion: [docs/ui-audit-2026-05-07.md](docs/ui-audit-2026-05-07.md). Test-Accounts und Rollen-Übersicht: [docs/test-accounts.md](docs/test-accounts.md).

#### Kritisch

- ~~[krit] E2E-Test-Datenmüll aus Production löschen (alle Sitzungen/Protokolle/Fallwild mit Prefix `E2E `) und E2E-Suite auf separaten Neon-Branch umstellen — siehe Audit F-02.~~ Erledigt 2026-05-07: Cleanup-Skript via PR #33 verifiziert, Dry-Run gegen Production zeigte 0 verbleibende E2E-Datensätze; E2E-Trennung auf separaten Neon-Branch ist als Nachfolge-Pflege offen, aber Production ist sauber.
- [krit] Sidebar rollen-aware filtern und stillen Redirect auf `/app` durch sichtbaren Hinweis ersetzen — siehe Audit F-01.
- [krit] Backoffice-„Kartenlage" durch echte Google Maps JS API ersetzen — siehe Audit F-03.
- [krit] Mobile MapPreview durch `react-native-maps` ersetzen — siehe Audit F-14.

#### Hoch

- [hoch] Sitzung-Detail bei Status `freigegeben` sperren und „Neue Version öffnen"-Pfad bauen — siehe Audit F-04.
- [hoch] Detail-Link in Sitzungen-Liste auf `/sitzungen/[id]` (ohne `/app`-Prefix) auf Auth-Guard prüfen oder Route nach `/app/sitzungen/[id]` umziehen — siehe Audit F-05.
- [hoch] Mobile-Tabs von 6 auf 4 + „Mehr"-Sheet reduzieren, Logout in Profil verlegen — siehe Audit F-12 und F-15.
- ~~[hoch] Mobile-Login-Wortmarke „hege" durch ein einzelnes Logo-Asset ersetzen — siehe Audit F-13.~~ Erledigt: Neues `hege`-Logo für iOS-App und Website eingebaut; auf `https://hege.app` produktiv verfügbar.
- ~~[hoch] Member-Invite-Flow planen, damit andere Rollen ohne Seed-/SQL-Eingriff angelegt werden können — siehe Audit F-20.~~ Erledigt 2026-05-07 als Hybrid mit Code als sichtbarem Default und optionaler Mail-Versand.
- ~~[hoch] Geteilte Design-Tokens (`@hege/tokens`) für Web und Mobile einführen — siehe Audit F-21.~~ Erledigt: `packages/tokens` mit semantischen Farbtoken, Spacing-, Radius- und Typographie-Tokens implementiert; in Web und Mobile adoptiert (PRs #134–#154).

#### Mittel

- [mittel] Rollen-Labels überall durch `formatRoleLabel` schicken (CAPS und Umlaut-lose Identifier eliminieren) — siehe Audit F-06.
- [mittel] Reviereinrichtungen-Status-Pill `wartung-faellig` lesbar mappen — siehe Audit F-07.
- [mittel] Hero-Größen begrenzen und Hero-Copy auf Login/Dashboard/Reviereinrichtungen entwickler-frei umschreiben — siehe Audit F-08.
- [mittel] Public Landing mit Backoffice- und iPhone-Mock anreichern (sobald F-03/F-14 fertig) — siehe Audit F-10.
- [mittel] Fallwild-Foto-Auswahl auf kamera-first umbauen — siehe Audit F-16.
- [mittel] Lokale iOS-Build-Hygiene reparieren (CocoaPods/Ruby/Encoding); EAS-Preview als primären Smoke-Pfad dokumentieren — siehe Audit F-23.

#### Niedrig

- [niedrig] Demo-Account `user-revierleitung` mit echtem Personennamen befüllen — siehe Audit F-09.
- [niedrig] Fallwild-Liste im Web mit Eyebrow „Erfassung läuft über die hege-App" — siehe Audit F-11.
- [niedrig] Mobile Choice-Chips für Wildart/Geschlecht/Altersklasse/Bergungsstatus durch Picker oder Action Sheet ersetzen — siehe Audit F-17.
- [niedrig] Mobile Mikrocopy-Pass: „Queue" → „Warteschlange", „1 gespeicherte Stände" → „1 Version gespeichert" — siehe Audit F-18.
- ~~[niedrig] Mobile `userInterfaceStyle` auf `automatic` und Dark-Mode-Tokens vorbereiten — siehe Audit F-19.~~ Erledigt: `UIUserInterfaceStyle` auf `Automatic` umgestellt (PR #159); Design-System §10-Token (`@hege/tokens`) mit `onAccent`, `onWarning`, `surfaceMuted` vollständig eingeführt.
- [niedrig] Icon-Set für Web einführen (Sidebar, Buttons, Status) — siehe Audit F-22.
- [niedrig] Visuelle Evidenz unter `docs/assets/ui-audit-2026-05-07/` nachreichen, sobald das Screenshot-Tooling stabil ist.

### UX-Roadmap v2 — Pfad 1 (Visual Polish)

Pfad 1 aus [docs/ux-roadmap-v2.md](docs/ux-roadmap-v2.md). Reihenfolge: P1.0 zuerst, dann P1.3 als Layout-Quick-Win, danach parallelisierbar.

- [ ] P1.0 — EAS-Preview-iOS-Build mit allen bisherigen Audit-Fixes auf TestFlight pushen, damit der Mobile-Stand auf dem iPhone aktuell ist.
- [ ] P1.1 — Demo-Daten erweitern auf realistische Volumina (~20 Sitzungen, ~30 Fallwild, ~12 Reviereinrichtungen, ~8 Mitglieder, dazu passende Reviermeldungen/Aufgaben).
- [ ] P1.2 — Wortmarken-Logo als SVG-Asset-Satz (Mark+Wortmarke kombiniert + monochrome Varianten) für Header, Favicon, OG-Image, Mobile-Login, Mobile-Splash.
- [ ] P1.3 — Mobile Heute-Tab Layout-Fixes: Bottom-Padding für Tab-Bar (Tiles werden nicht mehr abgeschnitten), Aside-Card kollabiert auf 0-Wert, Slash-Trennung der Personenzeile durch Punkt-Trennung ersetzt, Hero-Title mit Auto-Shrink, Toolbar-Buttons in Header-Aside oder Pull-to-Refresh.
- [ ] P1.4 — Vereinheitlichte `<StateView>`-Komponente für Empty/Loading/Error in Web und Mobile, ad-hoc-Cards migrieren. *`StateView` bereits als `apps/mobile/components/state-view.tsx` vorhanden (PR #134); in `packages/tokens` liegen nur die semantischen Farb-Tokens, die `StateView` nutzt. Ausstehend: Migration der ad-hoc-Cards in Web und Mobile.*
- [ ] P1.5 — Custom Domain-Iconographie: `packages/icons` (`@hege/icons`) als Workspace-Package erstellt und im Repo vorhanden. *`apps/mobile` hat noch keine `@hege/icons`-Abhängigkeit — Mobile-Integration ausstehend.*
- [ ] P1.6 — Mikrointeraktionen: Web View Transitions, Hover/Press-Feedback; Mobile Sheet-Slides + Reanimated Pressable-Skalierung + Haptik bei Save/Send/Discard.
- [ ] P1.7 — Hero-Visuals auf Public-Landing: Backoffice-Mockup mit echter Karte und iPhone-Mock mit Fallwild-Form als statische Assets in `apps/web/public/landing/`.
- [x] P1.8 — Dark Mode Mobile vollständig umgesetzt (PR #165): In-App-Umschalter (System/Hell/Dunkel) unter Mehr → Erscheinungsbild, persistiert via `lib/theme-mode.ts`; `useThemeColors()` respektiert Override; app-weite `colors.x → useThemeColors()`-Migration abgeschlossen; iOS-Simulator-verifiziert (OTA BUILD_TAG 0.1.0 · 2026-06-08).
- [ ] P1.9 — Lighthouse 95+ auf Public-Landing, Login und Backoffice-Dashboard, Audit + Maßnahmen.

## Vollständige Änderungsgeschichte

Alle erledigten Aufgaben sind in [CHANGELOG.md](CHANGELOG.md) vollständig dokumentiert.
