# TODO

Der priorisierte, autonom ausführbare Arbeitsplan liegt in [docs/autonomer-umsetzungsplan-2026-05.md](docs/autonomer-umsetzungsplan-2026-05.md).

## Offen

- iPhone-/iOS-Geräte-Smoke auf Production erneut auf erfolgreichen Foto-Upload, automatische Standortauflösung und leere Queue prüfen.
- Kontaktlisten im nativen iPhone-Smoke prüfen: Mitgliederliste, freie Listen, Anrufen-Aktion und Pflege-Rechte für Schriftführung/Admin.
- Echten WebAuthn-/Passkey-Login serverseitig planen; Mobile kann zunächst nur eine bestehende Sitzung lokal per Face ID entsperren.
- GIP-Bounding-Box für Jagdgesellschaft Gänserndorf fachlich prüfen und bei Bedarf größeren Revier-Ausschnitt als `GIP_ROAD_KILOMETER_INDEX_PATH` deployen.
- Android-Emulator-Smoke nach [Android-Smoke-Runbook](docs/mobile-smoke-android.md) als optionalen Zweitpfad vorbereiten, falls später Android-Abdeckung ohne physisches Gerät benötigt wird.
- Rollen- und Empfängergruppenmodell für zielgerichtete Sichtbarkeit von Nachrichten, Aufgaben und Veranstaltungen gegen [Rollen/Aufgaben/Nachrichten v1](docs/rollen-aufgaben-nachrichten-v1.md) festziehen.
- Veranstaltungsmodul mit Ankündigung, Treffpunkt, Erinnerungen und optionaler Teilnahmebestätigung planen.
- WhatsApp-Anstoß aus der App fachlich und technisch gegen interne Nachrichten und Aufgaben abgrenzen.

### UI-Audit 2026-05-07

Vollständiger Befund mit Code-Verweisen und Reproduktion: [docs/ui-audit-2026-05-07.md](docs/ui-audit-2026-05-07.md). Test-Accounts und Rollen-Übersicht: [docs/test-accounts.md](docs/test-accounts.md).

#### Kritisch

- ~~[krit] E2E-Test-Datenmüll aus Production löschen (alle Sitzungen/Protokolle/Fallwild mit Prefix `E2E `) und E2E-Suite auf separaten Neon-Branch umstellen — siehe Audit F-02.~~ Erledigt 2026-05-07: Cleanup-Skript via PR #33 verifiziert, Dry-Run gegen Production zeigte 0 verbleibende E2E-Datensätze; Die Neon-Branch-Trennung ist obsolet: Die E2E-Suite läuft gegen eine ephemere lokale Docker-Postgres-DB pro Lauf, CI macht gegen Preview/Production nur read-only Smokes, und die Architektur-Doku lehnt Neon-Branching bewusst ab.
- ~~[krit] Sidebar rollen-aware filtern und stillen Redirect auf `/app` durch sichtbaren Hinweis ersetzen — siehe Audit F-01.~~ Erledigt: Rollen-Guard leitet sichtbar auf `/app?error=keine-berechtigung` mit Forbidden-Banner um; die zentrale Rollen-/Feature-Matrix in `packages/domain` hält API, Navigation und Plattform-Admin konsistent.
- ~~[krit] Backoffice-„Kartenlage" durch echte Google Maps JS API ersetzen — siehe Audit F-03.~~ Erledigt seit 2026-05-17: echte Google-Karte via `@vis.gl/react-google-maps` mit klickbaren Markern (Einrichtungen, Ansitze, Fallwild, Reviermeldungen).
- ~~[krit] Mobile MapPreview durch `react-native-maps` ersetzen — siehe Audit F-14.~~ Im Kern erledigt: `react-native-maps` 1.20.1 mit tappbaren Pins in allen Locations-Tabs. Offener Rest (klein): Mein-Standort-Button + explizite Standortfreigabe-Zustände in `EntityMap`; tote `map-preview.tsx`/`map-stage.tsx` entfernen.

#### Hoch

- ~~[hoch] Sitzung-Detail bei Status `freigegeben` sperren und „Neue Version öffnen"-Pfad bauen — siehe Audit F-04.~~ Erledigt (PR #34): UI-Sperre, Backend-409, Reopen-als-Entwurf inkl. Tests.
- ~~[hoch] Detail-Link in Sitzungen-Liste auf `/sitzungen/[id]` (ohne `/app`-Prefix) auf Auth-Guard prüfen oder Route nach `/app/sitzungen/[id]` umziehen — siehe Audit F-05.~~ Erledigt: Route umgezogen, Guard aktiv, Legacy-Redirect vorhanden.
- ~~[hoch] Mobile-Tabs von 6 auf 4 + „Mehr"-Sheet reduzieren, Logout in Profil verlegen — siehe Audit F-12 und F-15.~~ Erledigt: 4-Tab-Navigation + Mehr, Abmelden im Profil-Screen (PR #168).
- ~~[hoch] Mobile-Login-Wortmarke „hege" durch ein einzelnes Logo-Asset ersetzen — siehe Audit F-13.~~ Erledigt: neues Logo produktiv; Dark-Mode-Logo-Chip (PR #169). Der weitergehende SVG-Asset-Satz läuft separat als P1.2.
- ~~[hoch] Member-Invite-Flow planen, damit andere Rollen ohne Seed-/SQL-Eingriff angelegt werden können — siehe Audit F-20.~~ Erledigt 2026-05-07 als Hybrid mit Code als sichtbarem Default und optionaler Mail-Versand.
- ~~[hoch] Geteilte Design-Tokens (`@hege/tokens`) für Web und Mobile einführen — siehe Audit F-21.~~ Mobile vollständig (PRs #134–#156); offener Web-Rest (klein): semantische Tokens in `webCssVariables` mappen und duplizierte Palette-Hexes in `globals.css` auf `var()` umstellen — ideal als Vorarbeit für einen Web-Dark-Mode.

#### Mittel

- ~~[mittel] Rollen-Labels überall durch `formatRoleLabel` schicken (CAPS und Umlaut-lose Identifier eliminieren) — siehe Audit F-06.~~ Erledigt (PR #172): geteiltes `apps/web/src/lib/labels.ts`, 3 Duplikate entfernt, 5 Roh-Ausgaben ersetzt.
- ~~[mittel] Reviereinrichtungen-Status-Pill `wartung-faellig` lesbar mappen — siehe Audit F-07.~~ Erledigt (PR #172): `formatEinrichtungZustand` geteilt (Web + Mobile), Pill/Listenkarte/Pin-Subtitle zeigen „Wartung fällig".
- ~~[mittel] Hero-Größen begrenzen und Hero-Copy auf Login/Dashboard/Reviereinrichtungen entwickler-frei umschreiben — siehe Audit F-08.~~ Erledigt (PR #39).
- ~~[mittel] Public Landing mit Backoffice- und iPhone-Mock anreichern (sobald F-03/F-14 fertig) — siehe Audit F-10.~~ Erledigt (PR #50): Live-CSS-Mockups (bewusste Designentscheidung statt statischer Screenshots).
- ~~[mittel] Fallwild-Foto-Auswahl auf kamera-first umbauen — siehe Audit F-16.~~ Erledigt (PR #37).
- ~~[mittel] Lokale iOS-Build-Hygiene reparieren (CocoaPods/Ruby/Encoding); EAS-Preview als primären Smoke-Pfad dokumentieren — siehe Audit F-23.~~ Erledigt: `pod install` läuft seit 2026-05-27 mit Homebrew-CocoaPods 1.16.2; EAS-Preview + OTA-Kanal `preview` sind der gelebte Smoke-/Release-Pfad.

#### Niedrig

- ~~[niedrig] Demo-Account `user-revierleitung` mit echtem Personennamen befüllen — siehe Audit F-09.~~ Erledigt (PR #38): „Anna Müller".
- ~~[niedrig] Fallwild-Liste im Web mit Eyebrow „Erfassung läuft über die hege-App" — siehe Audit F-11.~~ Erledigt (PR #38).
- ~~[niedrig] Mobile Choice-Chips für Wildart/Geschlecht/Altersklasse/Bergungsstatus durch Picker oder Action Sheet ersetzen — siehe Audit F-17.~~ Erledigt: nativer ActionSheet via `SelectField` (inkl. Theme-Override-Fix PR #166).
- ~~[niedrig] Mobile Mikrocopy-Pass: „Queue" → „Warteschlange", „1 gespeicherte Stände" → „1 Version gespeichert" — siehe Audit F-18.~~ Erledigt (PR #172): letzte „Queue"-Strings (inkl. VoiceOver-Labels) und der Singular/Plural-Fix im Protokoll-Detail.
- ~~[niedrig] Mobile `userInterfaceStyle` auf `automatic` und Dark-Mode-Tokens vorbereiten — siehe Audit F-19.~~ Erledigt: `UIUserInterfaceStyle` auf `Automatic` umgestellt (PR #159); Design-System §10-Token (`@hege/tokens`) mit `onAccent`, `onWarning`, `surfaceMuted` vollständig eingeführt.
- [niedrig] ~~Icon-Set für Web einführen (Sidebar, Buttons, Status)~~ Kern erledigt (lucide-react + `@hege/icons` in der Sidebar). Offener Polish-Rest: geteilte `StatusPill`-Komponente mit optionalem Icon je Status-Variante — siehe Audit F-22.
- ~~[niedrig] Visuelle Evidenz unter `docs/assets/ui-audit-2026-05-07/` nachreichen, sobald das Screenshot-Tooling stabil ist.~~ Obsolet: Die meisten Findings sind gefixt und nicht mehr reproduzierbar; neuere Screenshot-Evidenz liegt in `docs/mobile-ui-audit/`.

### UX-Roadmap v2 — Pfad 1 (Visual Polish)

Pfad 1 aus [docs/ux-roadmap-v2.md](docs/ux-roadmap-v2.md). Reihenfolge: P1.0 zuerst, dann P1.3 als Layout-Quick-Win, danach parallelisierbar.

- [x] P1.0 — EAS-Preview-iOS-Build: erledigt via Build `e6667820` (2026-06-05, Runtime 1.0.1, Channel `preview`) per Internal Distribution/USB statt TestFlight; JS-Stände kommen seither per OTA (zuletzt `0.1.0 · 2026-06-10.14`). TestFlight erst nötig, wenn Tester ohne USB-Zugang dazukommen.
- [x] P1.1 — Demo-Daten auf realistische Volumina erweitert (Seeds decken Sitzungen, Fallwild, Reviereinrichtungen, Mitglieder, Reviermeldungen/Aufgaben, Kontakte und Notifications ab).
- [ ] P1.2 — Wortmarken-Logo als SVG-Asset-Satz (Mark+Wortmarke kombiniert + monochrome Varianten) für Header, Favicon, OG-Image, Mobile-Login, Mobile-Splash. *Hinweis: `HegeWordmark.tsx` und `HegeWordmarkLight.tsx` existieren bereits als React-TSX-Komponenten in `packages/icons/src/wordmark/`. Ausstehend: standalone SVG-Dateien (.svg) für Favicon, OG-Image und Splash-Screen, die ohne React-Kontext einsetzbar sind.*
- [x] P1.3 — Mobile Heute-Tab Layout-Fixes: alle fünf Punkte umgesetzt (PR #44, Verfeinerungen #76/#122).
- [x] P1.4 — `<StateView>` für Empty/Loading/Error: Mobile vollständig migriert, Web-Pendant existiert seit PR #45 und ist breit adoptiert. Optionaler Hygiene-Rest (klein, niedrig): 3 Web-Empty-States (Benachrichtigungen `.empty-card`, Protokolle-Page, Ansitze-Tabellen-Rows) migrieren.
- [ ] P1.5 — Custom Domain-Iconographie: `packages/icons` (`@hege/icons`) als Workspace-Package erstellt und im Repo vorhanden. *`apps/mobile` hat noch keine `@hege/icons`-Abhängigkeit — Mobile-Integration ausstehend.*
- [x] P1.6 — Mikrointeraktionen: Web komplett; Mobile-Haptik breit verankert und seit PR #172 auch in den Save-Handlern von Ansitz/Fallwild/Reviermeldung/Aufgabenstatus. Reanimated-Pressable-Skalierung bewusst verworfen (native Dependency lohnt keinen EAS-Build, pressed-Styles geben bereits Feedback).
- [x] P1.7 — Hero-Visuals auf Public-Landing: erledigt (PR #50) als Live-CSS-Mockups statt statischer Assets (änderungstreu, besseres LCP).
- [x] P1.8 — Dark Mode Mobile vollständig umgesetzt (PR #165): In-App-Umschalter (System/Hell/Dunkel) unter Mehr → Profil → Erscheinungsbild, persistiert via `lib/theme-mode.ts`; `useThemeColors()` respektiert Override; app-weite `colors.x → useThemeColors()`-Migration abgeschlossen; iOS-Simulator-verifiziert (OTA BUILD_TAG 0.1.0 · 2026-06-08).
- [ ] P1.9 — Lighthouse 95+ auf Public-Landing, Login und Backoffice-Dashboard: Code-Maßnahmen umgesetzt; es fehlt nur die Messung gegen Production (hege.app) + ggf. Nachbesserung (~1–2h, `/app` braucht Auth-Scripting).
