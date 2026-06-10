# UX-Roadmap v2

Drei aufeinander aufbauende Pfade nach dem [UI-Audit 2026-05-07](./ui-audit-2026-05-07.md). Der Audit hat 22 von 23 Hygiene-Findings geschlossen — diese Roadmap geht über Hygiene hinaus zu **markantem, premiumtauglichem Erscheinungsbild**.

**Stand 2026-05-13:** Pfad 1 (Visual Polish, PR #45-#51) und Pfad 2 (Workflow-Re-Imagination, PR #58-#76) abgeschlossen. Pfad 3 bleibt zurueckgestellt, bis das Produkt fachlich abgesichert ist (Steuermodell, Bilanzierung, Mehr-Revier-Skalierung).

## Pfad-2-Status

| Item | Titel | Status | PR(s) |
|------|-------|--------|-------|
| P2.1 | Mobile Map-First | ✅ als Toggle in Locations-Tabs (Map-First-Heute-Tab rückgaengig nach User-Feedback) | #58 (Skelett), #59 (Hotfix), #60-#63 (M1-M3), #76 (Compact Hero) |
| P2.2 | Rollen-spezifische Dashboards | ✅ | #70 |
| P2.3 | Notification-Center | ✅ Mobile + Web *(Doppel-Header-Bug bei Benachrichtigungen-Screen seit PR #122 gefixt)* | #71, #73 |
| P2.4 | Filter, Suche, Sortieren | ✅ Mobile (M1-M3) + Web (#75) | #60, #62, #63, #75 |
| P2.5 | Onboarding-Flow | ✅ Web 4-Step-Wizard | #74 |
| P2.6 | Smart Defaults | ✅ Fallwild-Form Mobile | #66 (Teil M4) |

Plus zehn autonom-gelieferte Features (M1-M5 + W1-W5) gemäß
[Pfad-2-Iteration](./path-2-autonomous-features.md).

## Pfad-1-Status

| Item | Titel | Status | PR |
|------|-------|--------|-----|
| P1.0 | EAS-Preview-Build | ✅ (EAS-Build e6667820 vom 2026-06-05, Internal Distribution/USB statt TestFlight, OTA-Kanal `preview` aktiv) | – |
| P1.1 | Demo-Daten-Volumina | ✅ | #46 |
| P1.2 | Wortmarken-Logo (`@hege/icons`) | ✅ | #47 |
| P1.3 | Quick-Win-Layout (4 Tabs + Mehr) | ✅ | #44, Verfeinerungen #76/#122 |
| P1.4 | StateView (Empty/Loading/Error) | ✅ | #45 |
| P1.5 | Domain-Icon-Set | ⏳ (packages/icons vorhanden, Mobile-Integration noch ausstehend — Commit #147) | #47 |
| P1.6 | Mikrointeraktionen (Web View Transitions, Mobile Haptics + Pull-to-Refresh) | ✅ (Web komplett; Mobile-Haptik in Save-Handlern seit PR #172; Reanimated-Skalierung bewusst verworfen — native Dependency lohnt keinen EAS-Build) | #47, #48, #172 |
| P1.7 | Hero-Visuals (Live-CSS-Mockups) | ✅ | #50 |
| P1.8 | Dark Mode Mobile (Token-Migration) | ✅ | #159, #165, #166, #169 |
| P1.9 | Lighthouse-Baseline (SEO + Performance) | ✅ | #51 |

Verwandte Dokumente:
- [Design-System v1](./design-system-v1.md) — Brand, Tokens, Component-Patterns
- [UI-Audit 2026-05-07](./ui-audit-2026-05-07.md) — Hygiene-Befunde
- [Roadmap v1](./roadmap-v1.md) — fachliche Ausbau-Stufen

---

## Pfad 1 — Visual Polish (3–5 Tage)

Sichtbare Aufwertung, kein Architektur-Risiko. Jede Iteration ist ein eigener PR.

### P1.0 — Vorbedingung: EAS-Preview-Build aufstellen

> **Erledigt:** EAS-Build e6667820 vom 2026-06-05, Verteilung via Internal Distribution/USB statt TestFlight, OTA-Kanal `preview` aktiv.

Der iPhone-Build, der aktuell auf dem Test-Gerät installiert ist, läuft auf einem Code-Stand vor PR #36 — sechs Tabs, alter Logout-Button, „Queue synchronisieren". Damit der bisherige Audit-Polish überhaupt sichtbar wird, muss ein neuer Build über EAS auf TestFlight gepusht werden.

- `pnpm --filter @hege/mobile eas:build:preview:ios`
- TestFlight verteilen.
- Alle weiteren Pfad-1-Items werden gegen den **frischen** Build verifiziert.

Aufwand: 30 min.

### P1.1 — Demo-Daten erweitern

Aktueller Demo-Bestand: 2 Sitzungen, 9 Fallwild-Einträge, 3 Reviereinrichtungen, 4 Mitglieder. Dadurch wirken Listen leer, Karten haben drei Punkte, das Backoffice-Dashboard zeigt zweistellige Werte nirgends.

Ziel: realistische Volumina pro Bereich, damit visuelle Inkonsistenzen erst sichtbar werden:

- ~20 Sitzungen mit realistischen Titeln (Jahresabschluss, Hegeschau, Saison-Auftakt …) plus Versionen, Beschlüsse, Teilnehmer.
- ~30 Fallwild-Einträge über das letzte Jahr verteilt — Wildart-Mix, Gemeinden im Gänserndorf-Umkreis, ein paar mit Fotos.
- ~12 Reviereinrichtungen unterschiedlicher Typen (Hochstand, Fütterung, Kanzel, Salzleck), Status-Mix.
- ~8 zusätzliche Mitglieder unterschiedlicher Rollen mit deutschen Namen.
- Reviermeldungen + Aufgaben in realistischer Verteilung (offene, in Arbeit, erledigt).

Files:
- `packages/domain/src/mock-data.ts` erweitern.
- Seed-Skript bleibt unverändert.

Aufwand: 0,5 Tag.

### P1.2 — Wortmarken-Logo

Aktueller Stand: nur das „h"-Mark als PNG, Schriftzug wird im Login als Text neben dem Bild gerendert. Konsequenz: keine konsistente Marke in Header, Footer, Favicon, OG-Image, Mobile-Splash.

Ziel: ein dedizierter SVG-Asset-Satz mit Mark + Wortmarke kombiniert, plus Mark-only und Wortmarke-only und monochrome Varianten. Plattformen:

- Web-Header (Backoffice + Public-Landing)
- Web-Favicon (`apps/web/src/app/icon.png` ersetzen)
- Web-OG-Image (`apps/web/public/brand/og-image.png` neu)
- Mobile-Login (statt Bildmontage Mark+Text)
- Mobile-Splash (`apps/mobile/app.json` `splash`)

Designentscheidung: ich nutze den `frontend-design`-Skill, um drei Varianten vorzuschlagen, dann Wahl durch User. Falls der User schon ein Logo-File hat, bevorzugt das.

Aufwand: 0,5 Tag.

### P1.3 — Mobile Heute-Tab Layout-Fix (Quick-Win)

Akute Probleme aus User-Screenshot vom 2026-05-07 (gilt nach EAS-Build von P1.0):

- **Metric-Tiles unten abgeschnitten**: `<ScreenShell>` ScrollView hat kein bottom-padding für die Tab-Bar. Die letzten zwei Tiles (`AUFGABEN`, `FALLWILD`) liegen halb unter dem Tab-Bar-Schatten.
  - Fix: `useBottomTabBarHeight()` aus `@react-navigation/bottom-tabs` und das + 24 px als `paddingBottom` auf `scrollContent`.
- **„OFFLINE-WARTESCHLANGE 0"-Aside ist zu prominent**: Bei Wert 0 belegt der dunkle Kasten ~30 % des Screens für Null-Information.
  - Fix: Aside zeigt bei `queueCount === 0` einen kompakten „Alles synchronisiert"-Status mit kleinem Häkchen-Icon (Höhe ~60 px statt 200 px). Bei `> 0` bleibt das volle Layout.
- **Personenzeile mit Slashes**: „Andreas Ostheimer / AO-01 / Gänserndorf" liest sich wie URL-Pfad.
  - Fix: Punkt-Trennung mit eingerücktem Whitespace: `Andreas Ostheimer · Ausgeher · AO-01`. Bei Bedarf zwei Zeilen.
- **Hero-Schrift bricht prominent**: 34pt Title für lange Compound-Wörter wie „Jagdgesellschaft Gänserndorf" füllt zwei Zeilen.
  - Fix: Hero-Title bekommt `numberOfLines={2}` mit `adjustsFontSizeToFit`. Alternativ Schrift auf clamp 28–34pt.
- **Toolbar-Buttons über Metric-Grid**: Aktualisieren + Warteschlange senden sind oberhalb des Inhalts platziert.
  - Fix: Pull-to-Refresh als Standard für „Aktualisieren". „Warteschlange senden" wird in den Header-Aside (oben rechts) verschoben, sichtbar nur wenn `queueCount > 0`.

Files:
- `apps/mobile/components/screen-shell.tsx` — bottom-padding + Tab-Bar-Höhe
- `apps/mobile/app/(tabs)/index.tsx` — Aside-Kollaps, Toolbar-Refactor, Slash-Trennung, Hero-Tuning

Aufwand: 0,5 Tag.

### P1.4 — Empty/Loading/Error-States vereinheitlichen

Aktuell macht jede Screen ihren eigenen ad-hoc-State („Wird geladen", „API nicht erreichbar"). Inkonsistenz beim ersten Eindruck.

Ziel: eine geteilte `<StateView>`-Komponente in beiden Apps mit drei Modi (`loading`, `empty`, `error`), die je Use-Case mit Icon + Headline + Beschreibung + optionalem CTA aufgerufen wird.

Files (Mobile):
- `apps/mobile/components/state-view.tsx` (neu)
- alle existierenden state-cards in `apps/mobile/app/(tabs)/*.tsx` migrieren

Files (Web):
- `apps/web/src/components/state-view.tsx` (neu)
- alle existierenden „Wird geladen"-/„Keine X"-Stellen migrieren

Aufwand: 1 Tag.

### P1.5 — Custom Domain-Iconographie

Lucide ist generisch — Hochstand, Fütterung, Ansitz, Fallwild, Reviereinrichtung verdienen eigene SVG-Icons in der Brand-Linie.

Vorgehen:
- 8 SVG-Icons via `frontend-design`-Skill erzeugen (oder vom User holen).
- Ablage: `packages/icons/` (neues Workspace-Package, exportiert als React-Components für Web und als RN-Components für Mobile via `react-native-svg`).
- Anwendungsstellen: Sidebar (Web), Tab-Bar (Mobile), Map-Pins, Reviereinrichtungs-Karten, Filter-Chips.

Aufwand: 1 Tag.

### P1.6 — Mikrointeraktionen

- **Web**: Page-Transitions zwischen Backoffice-Routen (View Transitions API ist seit Next 15 stabil), Hover-States mit subtiler Tiefe (`translateY(-1px) + shadow`), Press-Feedback auf Karten.
- **Mobile**: Sheet-Slide-Transitionen für Detail-Routen, `react-native-reanimated` für Pressable-Skalierung beim Tap, Haptik-Feedback bei „Speichern", „Senden", „Verwerfen".

Files:
- `apps/web/src/app/globals.css` — Hover/Press
- `apps/web/src/app/layout.tsx` — View Transitions
- `apps/mobile/components/*` — Pressable mit Reanimated

Aufwand: 1 Tag.

### P1.7 — Hero-Visuals Public-Landing

Aktuell: Public-Landing ist text-only. Zielgruppe wird visuell nicht abgeholt.

- Hero bekommt einen **Backoffice-Mockup** (Screenshot des echten Dashboards mit der neuen Karte) als Hintergrund.
- Daneben ein **iPhone-Mock** mit Fallwild-Erfassung.
- Beide statisch als PNG/WebP, kein Live-Embed.

Files:
- `apps/web/public/landing/dashboard-hero.png` (neu)
- `apps/web/public/landing/iphone-fallwild.png` (neu)
- `apps/web/src/components/public-landing.tsx` — Hero erweitern

Aufwand: 0,5 Tag.

### P1.8 — Dark Mode Mobile durchziehen

> **Erledigt** (PRs #159/#165/#166/#169).

~~Tokens sind bereit (`darkColors` in `@hege/tokens`), `userInterfaceStyle: automatic` ist gesetzt — aber die Components nutzen statisch `colors.x` statt `useThemeColors()`. Dadurch bleibt die App in Light, egal was iOS-Setting sagt.~~ *(Überholt — Migration abgeschlossen.)*

Migration in Schritten:
- Komponenten-Inventur: welche `apps/mobile/components/*.tsx` und `apps/mobile/app/**/*.tsx` nutzen `colors`?
- Pro Datei: Hook `useThemeColors()` einziehen, `StyleSheet.create` durch dynamische Funktion ersetzen oder mit Memoization.
- Visual-Test: drei Screens (Heute, Fallwild, Mehr) in System-Dark — kein Flickern, lesbarer Kontrast.

Files: alle `apps/mobile/components/` und `apps/mobile/app/(tabs)/`.

Aufwand: 1 Tag.

### P1.9 — Lighthouse 95+

Zielmessung auf:
- `https://hege.app/` (Public-Landing)
- `https://hege.app/login`
- `https://hege.app/app` als revier-admin

Erwartete Pain-Points:
- Layout-Shift durch Logo-Image (LCP).
- Render-blocking Web-Fonts.
- Karten-Tile-Loading auf Dashboard.

Maßnahmen je nach Befund — `next/font` korrekt setzen, Hero-Image preloaden, Map als „lazy below the fold" laden.

Aufwand: 0,5 Tag.

### Pfad-1-Summe

~5 Arbeits-Tage + 0,5 für EAS-Vorbedingung. 9 PRs.

**Reihenfolge:** P1.0 → P1.3 (Quick-Win Layout) → P1.1 Demo-Daten → P1.2 Logo + P1.5 Icons + P1.7 Hero-Visuals (parallelisierbar via Subagent) → P1.4 States → P1.6 Mikrointeraktionen → P1.8 Dark Mode → P1.9 Lighthouse.

---

## Pfad 2 — Workflow-Re-Imagination (2–3 Wochen)

Tieferer Schnitt. Re-Design der Hauptflüsse pro Rolle.

### P2.1 — Mobile Map-First

Heute-Tab wird zu **Karte mit Ereignis-Layer**: aktive Ansitze, neueste Fallwild-Vorgänge und Reviereinrichtungen als Map-Marker, oben Filter-Chips für Layer-Toggle. Karten-Karte (Card im aktuellen Layout) verschwindet — die Karte **ist** der Tab.

Aufwand: 3–4 Tage.

### P2.2 — Rollen-spezifische Dashboards

Jede Rolle bekommt einen anderen Heute-Schwerpunkt:
- **Schriftführung**: Sitzungs-Pipeline (offene Entwürfe, freigabebereite Versionen, vergangene Beschlüsse mit Erinnerung an Fristen).
- **Revier-Admin**: Mitglieder, Audit-Log, neue Einladungen, ausstehende Wartungen.
- **Jäger**: Mein heutiger Beitrag (Ansitz aktiv, kürzlich erfasst, eigene offene Aufgaben).
- **Ausgeher**: Karte mit aktuellen Ereignissen + Schnellerfassung.

Aufwand: 4 Tage.

### P2.3 — Notification-Center

Aus „Letzte Benachrichtigungen"-Card auf dem Dashboard wird ein **eigener Bereich** in Sidebar / Mehr-Tab mit Read/Unread, Filtern (Push, In-App, Erwähnungen), Push-Setup pro Mitglied.

Aufwand: 2 Tage.

### P2.4 — Filter, Suche, Sortieren

Einheitlicher `<FilterBar>`-Component (Web + Mobile) für:
- Fallwild: Wildart, Status, Zeitraum, Gemeinde, Foto vorhanden ja/nein.
- Sitzungen: Status, Termin-Range, Teilnehmer.
- Reviereinrichtungen: Typ, Status, letzte-Kontrolle-Range.
- Mitglieder: Rolle, Einladungs-Status.

Aufwand: 2 Tage.

### P2.5 — Onboarding-Flow

Nach Public-Registration heute: leerer Setup-Screen. Geplant: Step-by-Step:
1. Revier benennen + Bundesland/Bezirk
2. Fläche eintragen (mit Karten-Zeichnung der Grenze als Optional)
3. Erste Reviereinrichtung anlegen oder „später"
4. Ersten Jäger einladen oder „später"
5. Optional: Push-Notifications aktivieren

Mit Skip-Optionen und Resume-Punkt im Backoffice.

Aufwand: 2 Tage.

### P2.6 — Smart Defaults

- Fallwild-Erfassung: Wildart-Vorschlag basierend auf Wochenzeit + Saison + Gemeinde-History.
- Standort-Vorschlag: zuletzt benutzte Position bei wiederholtem Eintrag.
- Sitzungs-Termin: nächster Standard-Termin aus Vereinsrhythmus.

Aufwand: 1 Tag.

### Pfad-2-Summe

14–15 Arbeits-Tage. Etwa 6–8 PRs, größere Code-Schnitte. Visual identity bleibt stabil — nur Information-Architecture ändert sich.

---

## Pfad 3 — Komplette Premium-Reimagination (6–10 Wochen)

Eigenes Designsystem-Package, Marketing-Site, Conversion-Pfade. **Nicht jetzt** — wartet auf fachliche Stabilisierung.

### P3.1 — `@hege/ui`-Package

Eigenständiges Workspace-Package mit Button, Input, Card, Modal, Sheet, Toast, etc. Web + Native parallel (Tamagui oder eigene minimale Lösung).

### P3.2 — Storybook + Visual Regression

Components werden eigenständig dokumentiert, Pixel-Tests pro Variante.

### P3.3 — Marketing-Site getrennt

Dedicated Pages für Features, Pricing, Customer Stories, Blog, Help. Separate Deployment-Domain (z. B. `hege.app/start` oder `info.hege.app`).

### P3.4 — Demo-Modus

Public klickt sich durch das Produkt **ohne Registrierung**. Riesiger Conversion-Hebel.

### P3.5 — Premium-Animationen

Framer Motion für Web, scroll-getriebene Reveals, Easing-Choreography.

### P3.6 — WCAG AA durchgängig

Tastatur-Nav, Screen-Reader, Kontrast in CI getestet, automatische Audit-Reports.

### P3.7 — Onboarding-Email-Sequence

Resend live, 3-Mail-Welcome-Sequence über die ersten zwei Wochen, optional weiterführende Tipps.

### Pfad-3-Summe

40–50 Arbeits-Tage. Eigene Roadmap-Doku, sobald Pfad 1+2 stabil sind.

---

## Was nach jeder Pfad-Iteration passiert

1. **Audit-Refresh**: das nächste UI-Audit-Dokument (z. B. `docs/ui-audit-YYYY-MM-DD.md`) hält fest, wo wir nach Pfad-Abschluss stehen.
2. **Design-System-Update**: jedes neue Pattern landet in [`design-system-v1.md`](./design-system-v1.md).
3. **TODO-Cleanup**: erledigte Pfad-Items werden in `TODO.md` durchgestrichen.

Die Pfade sind nicht in Stein gemeißelt — wenn aus User-Tests neue Findings kommen, fließen sie in den nächsten offenen Pfad ein, ohne dass wir die anderen Pfade pausieren müssen.
