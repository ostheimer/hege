# Roadmap

Diese Datei ist der schlanke Einstiegspunkt im Repo-Root. Die vollstaendige Roadmap liegt in [docs/roadmap-v1.md](./docs/roadmap-v1.md).

## Aktueller Status

- `Sprint 0` ist technisch abgeschlossen: Auth, Revier-Scope, Rollenpruefung, Drizzle-Schema, Seeds und produktive Route Handler laufen in `apps/web`.
- `Sprint 1` ist technisch abgeschlossen und in Stabilisierung: Dashboard, Reviereinrichtungen, Protokolle, Sitzungen, Freigabe/PDF-Basis, Preview-Smoke und blockierender Release-Check für Production sind umgesetzt.
- `Sprint 1.5` ist produktiv sichtbar: Public Landing, Pricing-CTAs, Login, Registrierung, Setup-Redirects, neues Logo und Auth-UI sind auf `https://hege.app` deployed und per Playwright auf Desktop und Mobile geprüft.
- `Sprint 2` und `Sprint 3` sind weit fortgeschritten: Mobile Login, lokales Face-ID-/Touch-ID-Entsperren gespeicherter Sitzungen, Dashboard, Ansitz- und Fallwild-Formulare, Read-Slices, Offline-Queue v2, R2-Foto-Upload und Fallwild-Standort v1 stehen. Der iPhone-/iOS-Smoke vom 2026-04-26 bestätigt den Queue-v2-Fehlerpfad; ein direkter Production-Foto-Upload gegen `hege.app` ist verifiziert. Der Face-ID-Flow wurde am 2026-05-06 auf dem angeschlossenen iPhone bestätigt.
- Karten/Standort sind aktiv: Fallwild nutzt serverseitige Standortauflösung und GIP-Straßenkilometer. Reviereinrichtungen können mobil per GPS oder Kartenposition mit Ausrichtung, Fotos und Fachdaten erfasst werden und erscheinen in Karte/Liste; Ansitzeinrichtungen zeigen aktuelle GeoSphere-Winddaten und lokale Sonnenzeiten. Der kombinierte iOS-Simulator-Smoke ist grün.
- `Sprint 4` ist begonnen und nativ lokal abgenommen: Reviermeldungen, Aufgaben und Kontaktlisten haben erste Backend-/Web-/Mobile-Slices mit Tabellen, Seeds, Rollenprüfung, Aufgaben-Sichtbarkeit, Dashboard-Zähler, Mobile-Tab `Meldungen` und Kontakte-Bereich; der iPhone-Smoke vom 2026-05-05 bestätigt Laden, Statusänderung und Meldungserfassung gegen den lokalen API-Stand.

## Aktueller Fokus

1. Reviereinrichtungen v2 nach Migration und Mobile-Update auf Production mit einem kontrollierten Revierdatensatz abnehmen
2. Maestro-Vorlauf für Login, Rollen und Offline-Warteschlangen beibehalten und bei neuen mobilen Fehlerpfaden zuerst erweitern
3. Android-Emulator-Smoke als optionalen Zweitpfad bei Bedarf praktisch durchlaufen
4. Mobile Design-System §10: **abgeschlossen** (PRs #134–#172) — Token-Konsolidierung, `<Badge>`, semantische Farbtoken, `<FeedbackBanner>`, `cardSurface()`, Eyebrow/Spacing/Radius, `rnShadow.card`, Dark Mode end-to-end (Aktivierung #159, Adaption + In-App-Umschalter #165/#166, Logo-Chip #169) sowie Labels/Mikrocopy/Haptik/Pull-to-Refresh (#172). Verbleibende §10-Folge-Items (Button-Primitiv `<PrimaryButton>/<SecondaryButton>`, `<FilterSection>` mit Reset, Badge-Restkonsolidierung) sind kleine Refactors — siehe [Mobile-UI-Audit](./docs/mobile-ui-audit.md).

## Detaildokumente

- [Gesamtplan](./docs/reviermanagement-plan.md)
- [Autonomer Umsetzungsplan ab 2026-05-17](./docs/autonomer-umsetzungsplan-2026-05.md)
- [Architektur](./docs/architektur.md)
- [API v1](./docs/api-v1.md)
- [Roadmap v1](./docs/roadmap-v1.md)
- [Umsetzungsbacklog](./docs/umsetzungsbacklog.md)
- [Sprint 0 Backlog](./docs/sprint-0-backlog.md)
- [Sprint 1 Backlog](./docs/sprint-1-backlog.md)
- [Agent-Workstreams Sprint 0](./docs/agent-workstreams-sprint-0.md)
- [Agent-Workstreams Sprint 1](./docs/agent-workstreams-sprint-1.md)
- [iOS-Smoke-Runbook](./docs/mobile-smoke-ios.md)
- [Mobile-E2E mit Maestro](./docs/mobile-e2e-maestro.md)
- [Android-Smoke-Runbook](./docs/mobile-smoke-android.md)
- [Google-Maps-Ausrichtung](./docs/maps-google-v1.md)
- [GIP-Straßenkilometer v1](./docs/gip-strassenkilometer-v1.md)
- [Passkeys und Face ID v1](./docs/passkeys-faceid-v1.md)
- [Rollen, Aufgaben und Nachrichten v1](./docs/rollen-aufgaben-nachrichten-v1.md)
- [Reviermeldungen und Aufgaben v1](./docs/reviermeldungen-aufgaben-v1-plan.md)
- [UI-Audit 2026-05-07](./docs/ui-audit-2026-05-07.md)
- [Design-System v1](./docs/design-system-v1.md)
- [UX-Roadmap v2](./docs/ux-roadmap-v2.md)
- [Test-Accounts und Rollen-Übersicht](./docs/test-accounts.md)
- [Vercel-native Slice 1 Plan](./docs/vercel-native-slice-1-plan.md)
