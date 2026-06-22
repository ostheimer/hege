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

### UX-Roadmap v2 — Pfad 1 (Visual Polish)

Pfad 1 aus [docs/ux-roadmap-v2.md](docs/ux-roadmap-v2.md). Reihenfolge: P1.0 zuerst, dann P1.3 als Layout-Quick-Win, danach parallelisierbar.

- [x] P1.0 — EAS-Preview-iOS-Build: erledigt via Build `e6667820` (2026-06-05, Runtime 1.0.1, Channel `preview`) per Internal Distribution/USB statt TestFlight; JS-Stände kommen seither per OTA (zuletzt `0.1.0 · 2026-06-10.14`). TestFlight erst nötig, wenn Tester ohne USB-Zugang dazukommen.
- [x] P1.1 — Demo-Daten auf realistische Volumina erweitert (Seeds decken Sitzungen, Fallwild, Reviereinrichtungen, Mitglieder, Reviermeldungen/Aufgaben, Kontakte und Notifications ab).
- [x] P1.2 — Wortmarken-Logo als SVG-Asset-Satz (Mark+Wortmarke kombiniert + monochrome Varianten) für Header, Favicon, OG-Image, Mobile-Login, Mobile-Splash.
- [x] P1.3 — Mobile Heute-Tab Layout-Fixes: alle fünf Punkte umgesetzt (PR #44, Verfeinerungen #76/#122).
- [x] P1.4 — `<StateView>` für Empty/Loading/Error: Mobile vollständig migriert, Web-Pendant existiert seit PR #45 und ist breit adoptiert. Optionaler Hygiene-Rest (klein, niedrig): 3 Web-Empty-States (Benachrichtigungen `.empty-card`, Protokolle-Page, Ansitze-Tabellen-Rows) migrieren.
- [ ] P1.5 — Custom Domain-Iconographie: `packages/icons` (`@hege/icons`) als Workspace-Package erstellt und im Repo vorhanden. *`apps/mobile` hat noch keine `@hege/icons`-Abhängigkeit — Mobile-Integration ausstehend.*
- [x] P1.6 — Mikrointeraktionen: Web komplett; Mobile-Haptik breit verankert und seit PR #172 auch in den Save-Handlern von Ansitz/Fallwild/Reviermeldung/Aufgabenstatus. Reanimated-Pressable-Skalierung bewusst verworfen (native Dependency lohnt keinen EAS-Build, pressed-Styles geben bereits Feedback).
- [x] P1.7 — Hero-Visuals auf Public-Landing: erledigt (PR #50) als Live-CSS-Mockups statt statischer Assets (änderungstreu, besseres LCP).
- [x] P1.8 — Dark Mode Mobile vollständig umgesetzt (PR #165): In-App-Umschalter (System/Hell/Dunkel) unter Mehr → Erscheinungsbild, persistiert via `lib/theme-mode.ts`; `useThemeColors()` respektiert Override; app-weite `colors.x → useThemeColors()`-Migration abgeschlossen; iOS-Simulator-verifiziert (OTA BUILD_TAG 0.1.0 · 2026-06-08).
- [ ] P1.9 — Lighthouse 95+ auf Public-Landing, Login und Backoffice-Dashboard: Code-Maßnahmen umgesetzt; es fehlt nur die Messung gegen Production (hege.app) + ggf. Nachbesserung (~1–2h, `/app` braucht Auth-Scripting).
