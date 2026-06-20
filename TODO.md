# TODO

Der priorisierte, autonom ausfuehrbare Arbeitsplan liegt in [docs/autonomer-umsetzungsplan-2026-05.md](docs/autonomer-umsetzungsplan-2026-05.md).

## Offen

- iPhone-/iOS-Geraete-Smoke auf Production erneut auf erfolgreichen Foto-Upload, automatische Standortaufloesung und leere Queue pruefen.
- Kontaktlisten im nativen iPhone-Smoke pruefen: Mitgliederliste, freie Listen, Anrufen-Aktion und Pflege-Rechte fuer Schriftfuehrung/Admin.
- Echten WebAuthn-/Passkey-Login serverseitig planen; Mobile kann zunaechst nur eine bestehende Sitzung lokal per Face ID entsperren.
- GIP-Bounding-Box fuer Jagdgesellschaft Gaenserndorf fachlich pruefen und bei Bedarf groesseren Revier-Ausschnitt als `GIP_ROAD_KILOMETER_INDEX_PATH` deployen.
- Mobile-spezifische E2E-Strategie fuer Expo und native Oberflaechen ueber den dokumentierten Geraete-Smoke hinaus festziehen.
- Android-Emulator-Smoke nach [Android-Smoke-Runbook](docs/mobile-smoke-android.md) als optionalen Zweitpfad vorbereiten, falls spaeter Android-Abdeckung ohne physisches Geraet benoetigt wird.
- Rollen- und Empfaengergruppenmodell fuer zielgerichtete Sichtbarkeit von Nachrichten, Aufgaben und Veranstaltungen gegen [Rollen/Aufgaben/Nachrichten v1](docs/rollen-aufgaben-nachrichten-v1.md) festziehen.
- Veranstaltungsmodul mit Ankuendigung, Treffpunkt, Erinnerungen und optionaler Teilnahmebestaetigung planen.
- WhatsApp-Anstoss aus der App fachlich und technisch gegen interne Nachrichten und Aufgaben abgrenzen.

### UI-Audit 2026-05-07

Vollstaendiger Befund mit Code-Verweisen und Reproduktion: [docs/ui-audit-2026-05-07.md](docs/ui-audit-2026-05-07.md). Test-Accounts und Rollen-Uebersicht: [docs/test-accounts.md](docs/test-accounts.md).

#### Kritisch

- ~~[krit] E2E-Test-Datenmuell aus Production loeschen (alle Sitzungen/Protokolle/Fallwild mit Prefix `E2E `) und E2E-Suite auf separaten Neon-Branch umstellen — siehe Audit F-02.~~ Erledigt 2026-05-07: Cleanup-Skript via PR #33 verifiziert, Dry-Run gegen Production zeigte 0 verbleibende E2E-Datensaetze; Die Neon-Branch-Trennung ist obsolet: Die E2E-Suite laeuft gegen eine ephemere lokale Docker-Postgres-DB pro Lauf, CI macht gegen Preview/Production nur read-only Smokes, und die Architektur-Doku lehnt Neon-Branching bewusst ab.
- ~~[krit] Sidebar rollen-aware filtern und stillen Redirect auf `/app` durch sichtbaren Hinweis ersetzen — siehe Audit F-01.~~ Im Kern erledigt: Rollen-Guard leitet sichtbar auf `/app?error=keine-berechtigung` mit Forbidden-Banner um (e2e-abgesichert seit PR #171). Offener Rest: zentrale Rollen-Matrix in `packages/domain` extrahieren (loest auch die platform-admin-Inkonsistenz bei Aufgaben/Reviermeldungen).
- ~~[krit] Backoffice-Kartenlage durch echte Google Maps JS API ersetzen — siehe Audit F-03.~~ Erledigt seit 2026-05-17: echte Google-Karte via `@vis.gl/react-google-maps` mit klickbaren Markern (Einrichtungen, Ansitze, Fallwild, Reviermeldungen).
- ~~[krit] Mobile MapPreview durch `react-native-maps` ersetzen — siehe Audit F-14.~~ Im Kern erledigt: `react-native-maps` 1.20.1 mit tappbaren Pins in allen Locations-Tabs. Offener Rest (klein): Mein-Standort-Button + explizite Standortfreigabe-Zustaende in `EntityMap`; tote `map-preview.tsx`/`map-stage.tsx` entfernen.

#### Hoch

- ~~[hoch] Sitzung-Detail bei Status `freigegeben` sperren und Neue-Version-oeffnen-Pfad bauen — siehe Audit F-04.~~ Erledigt (PR #34): UI-Sperre, Backend-409, Reopen-als-Entwurf inkl. Tests.
- ~~[hoch] Detail-Link in Sitzungen-Liste auf `/sitzungen/[id]` (ohne `/app`-Prefix) auf Auth-Guard pruefen oder Route nach `/app/sitzungen/[id]` umziehen — siehe Audit F-05.~~ Erledigt: Route umgezogen, Guard aktiv, Legacy-Redirect vorhanden.
- ~~[hoch] Mobile-Tabs von 6 auf 4 + Mehr-Sheet reduzieren, Logout in Profil verlegen — siehe Audit F-12 und F-15.~~ Erledigt: 4-Tab-Navigation + Mehr, Abmelden im Profil-Screen (PR #168).
- ~~[hoch] Mobile-Login-Wortmarke hege durch ein einzelnes Logo-Asset ersetzen — siehe Audit F-13.~~ Erledigt: neues Logo produktiv; Dark-Mode-Logo-Chip (PR #169). Der weitergehende SVG-Asset-Satz laeuft separat als P1.2.
- ~~[hoch] Member-Invite-Flow planen, damit andere Rollen ohne Seed-/SQL-Eingriff angelegt werden koennen — siehe Audit F-20.~~ Erledigt 2026-05-07 als Hybrid mit Code als sichtbarem Default und optionaler Mail-Versand.
- ~~[hoch] Geteilte Design-Tokens (`@hege/tokens`) fuer Web und Mobile einfuehren — siehe Audit F-21.~~ Mobile vollstaendig (PRs #134-#156); offener Web-Rest (klein): semantische Tokens in `webCssVariables` mappen und duplizierte Palette-Hexes in `globals.css` auf `var()` umstellen — ideal als Vorarbeit fuer einen Web-Dark-Mode.

#### Mittel

- ~~[mittel] Rollen-Labels ueberall durch `formatRoleLabel` schicken (CAPS und Umlaut-lose Identifier eliminieren) — siehe Audit F-06.~~ Erledigt (PR #172): geteiltes `apps/web/src/lib/labels.ts`, 3 Duplikate entfernt, 5 Roh-Ausgaben ersetzt.
- ~~[mittel] Reviereinrichtungen-Status-Pill `wartung-faellig` lesbar mappen — siehe Audit F-07.~~ Erledigt (PR #172): `formatEinrichtungZustand` geteilt (Web + Mobile), Pill/Listenkarte/Pin-Subtitle zeigen Wartung faellig.
- ~~[mittel] Hero-Groessen begrenzen und Hero-Copy auf Login/Dashboard/Reviereinrichtungen entwickler-frei umschreiben — siehe Audit F-08.~~ Erledigt (PR #39).
- ~~[mittel] Public Landing mit Backoffice- und iPhone-Mock anreichern (sobald F-03/F-14 fertig) — siehe Audit F-10.~~ Erledigt (PR #50): Live-CSS-Mockups (bewusste Designentscheidung statt statischer Screenshots).
- ~~[mittel] Fallwild-Foto-Auswahl auf kamera-first umbauen — siehe Audit F-16.~~ Erledigt (PR #37).
- ~~[mittel] Lokale iOS-Build-Hygiene reparieren (CocoaPods/Ruby/Encoding); EAS-Preview als primaeren Smoke-Pfad dokumentieren — siehe Audit F-23.~~ Erledigt: `pod install` laeuft seit 2026-05-27 mit Homebrew-CocoaPods 1.16.2; EAS-Preview + OTA-Kanal `preview` sind der gelebte Smoke-/Release-Pfad.

#### Niedrig

- ~~[niedrig] Demo-Account `user-revierleitung` mit echtem Personennamen befuellen — siehe Audit F-09.~~ Erledigt (PR #38): Anna Mueller.
- ~~[niedrig] Fallwild-Liste im Web mit Eyebrow Erfassung laeuft ueber die hege-App — siehe Audit F-11.~~ Erledigt (PR #38).
- ~~[niedrig] Mobile Choice-Chips fuer Wildart/Geschlecht/Altersklasse/Bergungsstatus durch Picker oder Action Sheet ersetzen — siehe Audit F-17.~~ Erledigt: nativer ActionSheet via `SelectField` (inkl. Theme-Override-Fix PR #166).
- ~~[niedrig] Mobile Mikrocopy-Pass: Queue Warteschlange, 1 gespeicherte Staende 1 Version gespeichert — siehe Audit F-18.~~ Erledigt (PR #172): letzte Queue-Strings (inkl. VoiceOver-Labels) und der Singular/Plural-Fix im Protokoll-Detail.
- ~~[niedrig] Mobile `userInterfaceStyle` auf `automatic` und Dark-Mode-Tokens vorbereiten — siehe Audit F-19.~~ Erledigt: `UIUserInterfaceStyle` auf `Automatic` umgestellt (PR #159); Design-System 10-Token (`@hege/tokens`) mit `onAccent`, `onWarning`, `surfaceMuted` vollstaendig eingefuehrt.
- [niedrig] ~~Icon-Set fuer Web einfuehren (Sidebar, Buttons, Status)~~ Kern erledigt (lucide-react + `@hege/icons` in der Sidebar). Offener Polish-Rest: geteilte `StatusPill`-Komponente mit optionalem Icon je Status-Variante — siehe Audit F-22.
- ~~[niedrig] Visuelle Evidenz unter `docs/assets/ui-audit-2026-05-07/` nachreichen, sobald das Screenshot-Tooling stabil ist.~~ Obsolet: Die meisten Findings sind gefixt und nicht mehr reproduzierbar; neuere Screenshot-Evidenz liegt in `docs/mobile-ui-audit/`.

### UX-Roadmap v2 — Pfad 1 (Visual Polish)

Pfad 1 aus [docs/ux-roadmap-v2.md](docs/ux-roadmap-v2.md). Reihenfolge: P1.0 zuerst, dann P1.3 als Layout-Quick-Win, danach parallelisierbar.

- [x] P1.0 — EAS-Preview-iOS-Build: erledigt via Build `e6667820` (2026-06-05, Runtime 1.0.1, Channel `preview`) per Internal Distribution/USB statt TestFlight; JS-Staende kommen seither per OTA (zuletzt `0.1.0 · 2026-06-10.14`). TestFlight erst noetig, wenn Tester ohne USB-Zugang dazukommen.
- [x] P1.1 — Demo-Daten auf realistische Volumina erweitert (Seeds decken Sitzungen, Fallwild, Reviereinrichtungen, Mitglieder, Reviermeldungen/Aufgaben, Kontakte und Notifications ab).
- [ ] P1.2 — Wortmarken-Logo als SVG-Asset-Satz (Mark+Wortmarke kombiniert + monochrome Varianten) fuer Header, Favicon, OG-Image, Mobile-Login, Mobile-Splash.
- [x] P1.3 — Mobile Heute-Tab Layout-Fixes: alle fuenf Punkte umgesetzt (PR #44, Verfeinerungen #76/#122).
- [x] P1.4 — `<StateView>` fuer Empty/Loading/Error: Mobile vollstaendig migriert, Web-Pendant existiert seit PR #45 und ist breit adoptiert. Optionaler Hygiene-Rest (klein, niedrig): 3 Web-Empty-States (Benachrichtigungen `.empty-card`, Protokolle-Page, Ansitze-Tabellen-Rows) migrieren.
- [ ] P1.5 — Custom Domain-Iconographie: `packages/icons` (`@hege/icons`) als Workspace-Package erstellt und im Repo vorhanden. *`apps/mobile` hat noch keine `@hege/icons`-Abhaengigkeit — Mobile-Integration ausstehend.*
- [x] P1.6 — Mikrointeraktionen: Web komplett; Mobile-Haptik breit verankert und seit PR #172 auch in den Save-Handlern von Ansitz/Fallwild/Reviermeldung/Aufgabenstatus. Reanimated-Pressable-Skalierung bewusst verworfen (native Dependency lohnt keinen EAS-Build, pressed-Styles geben bereits Feedback).
- [x] P1.7 — Hero-Visuals auf Public-Landing: erledigt (PR #50) als Live-CSS-Mockups statt statischer Assets (aenderungstreu, besseres LCP).
- [x] P1.8 — Dark Mode Mobile vollstaendig umgesetzt (PR #165): In-App-Umschalter (System/Hell/Dunkel) unter Mehr -> Erscheinungsbild, persistiert via `lib/theme-mode.ts`; `useThemeColors()` respektiert Override; app-weite `colors.x -> useThemeColors()`-Migration abgeschlossen; iOS-Simulator-verifiziert (OTA BUILD_TAG 0.1.0 2026-06-08).
- [ ] P1.9 — Lighthouse 95+ auf Public-Landing, Login und Backoffice-Dashboard: Code-Massnahmen abgeschlossen (#51); `/login` und `/app` (Backoffice-Dashboard) noch nicht gegen Production (hege.app) gemessen — Baseline-Dok nennt diese Seiten explizit als ausstehend.
