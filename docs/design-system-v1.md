# Design-System v1

Gemeinsame Brand-, Token- und Component-Direction für Web (`apps/web`) und Mobile (`apps/mobile`). Die einzige technische Quelle der Token-Werte ist [`packages/tokens/src/index.ts`](../packages/tokens/src/index.ts) — dieses Dokument beschreibt **Bedeutung**, **Anwendungs-Patterns** und **Designentscheidungen**, die nicht direkt im Code stehen.

## Brand-Direction

### Was hege sein soll

> Werkzeug für die Reviergesellschaft, das aussieht wie ein Werkzeug für die Reviergesellschaft.

Das heißt:

- **Warm, geerdet, distinkt** — keine generische SaaS-Optik (Blau/Grau/Stripe-Klon).
- **Reduziert in der Geste**, nicht in der Farbe — die Farbwelt ist sehr eigen, das Layout aber so ruhig, dass die Inhalte (Karte, Listen, Formulare) im Vordergrund stehen.
- **Wirkt nach Forst, nicht nach Tech** — Tannengrün, Birkenholz-Beige, dezentes Gold für Warnungen, gedämpftes Rot für Gefahr.
- **Deutsch, sachlich, nicht behördlich** — kein „Klicken Sie hier", kein „Bitte beachten Sie". Eher „Heute im Revier", „Ansitz aktiv", „Warteschlange leer".

### Was hege nicht sein soll

- Nicht „Alpine Premium": kein Schwarz-Gold, keine Glaskanten, keine 3D-Hero-Renderings.
- Nicht „Konsumer-Bunt": keine Pastelle, keine Emojis, keine Gradient-Buttons.
- Nicht „Behörden-Form": keine groben Tabellen, keine ungestylten `<select>`, keine ALL-CAPS-Header.

### Logo

Aktueller Stand:

- **Logo-Mark** (das „h" mit Reh-Silhouette): vorhanden in `apps/web/public/brand/hege-logo-mark.png`, `apps/web/public/brand/hege-logo-clean.png` (höhere Auflösung), `apps/web/public/brand/hege-logo-source.png` (Original) und `apps/mobile/assets/logo-mark.png`.
- **Wortmarke „hege"**: aktuell **nicht** als Asset vorhanden. Wird im Login-Screen als Text neben dem Mark gerendert (in Mobile mit Georgia 48pt, Web als CSS-Heading). Das ist Workaround, kein dediziertes Asset.

Offene Aufgabe: ein gerendertes Wortmarken-Asset (SVG mit dem Mark links und „hege" als Schriftzug rechts in der Brand-Schrift, plus monochrome Varianten für dunkle/helle Hintergründe). Wird in Pfad 1 der UX-Roadmap behandelt.

### Voice / Mikrocopy

| Bereich | Stil |
|---|---|
| Section-Eyebrows | All-Caps, sehr kurz: „Heute im Revier", „Reviereinrichtungen", „Mitglieder" |
| Headlines | Aussagesatz, nicht „Willkommen": z. B. „Was jetzt deine Aufmerksamkeit braucht", nicht „Dashboard" |
| Buttons | Verb + Objekt: „Einladung erstellen", „Warteschlange senden", nicht „OK" oder „Submit" |
| Empty-States | Was als Nächstes passiert, nicht der reine Status: „Noch keine Reviermeldung — die erste kommt aus der App" |
| Fehler | Konkret + Handlung: „API nicht erreichbar. Tippe auf Aktualisieren, sobald die Verbindung wieder steht." |
| Push/Notifications | Wer hat was getan, nicht das System: „Lukas hat einen neuen Hochstand-Eintrag dokumentiert" |
| Anrede | Du, nicht Sie. „Waidmannsheil" als Closing in Mails OK. |

## Tokens — Übersicht

Alle Werte: [`packages/tokens/src/index.ts`](../packages/tokens/src/index.ts). Die Datei selbst dokumentiert die Wert-Entscheidungen bei Drift zwischen Web und Mobile.

### Farben

| Token | Bedeutung | Verwendung |
|---|---|---|
| `background` | Body-/App-Hintergrund | Aller Hauptcontent liegt darauf. |
| `surface` | Dunkelste Surface | Sidebar im Web, Hero-Highlights, dunkle Karten-Akzente. |
| `surfaceSoft` | Helle Glas-Surface mit Transparenz | Login-Card, Public-Hero-Card. |
| `surfaceCard` | Standard-Karten-Surface | Listen, Detail-Karten, Metric-Tiles. |
| `border` | Trennlinien | Card-Borders, Tabellen-Trennlinien, Form-Field-Outlines. |
| `ink` | Primärtext | Headlines, Body. |
| `muted` | Sekundärtext | Eyebrows, Captions, Helper-Text. |
| `accent` | Markenfarbe (Tannengrün) | Buttons, Active-Tab, Pin-Color für Reviereinrichtungen. |
| `accentStrong` | Sattes Tannengrün (dunkler) | Primärbuttons, Sidebar-Active-Background, Pin-Color für Ansitze. |
| `accentSoft` | Heller Akzent | Chips, Badges, Hinweis-Hintergründe. |
| `warning` | Gold / Olive | Wartung-fällig, Hinweise, „Achtung". |
| `danger` | Gedämpftes Rot | Fehler, Verwerfen, Pin-Color für Fallwild. |

**Farb-Etikette:** Kein Element nutzt mehr als zwei Farben aus dieser Liste plus Schwarz/Weiß/Transparent. Kein hartcodiertes Hex außerhalb von `packages/tokens/`. Wenn ein neuer Wert nötig ist → erst in Tokens, dann nutzen.

### Spacing, Radius, Shadow, Typo

Alle aus [`packages/tokens/src/index.ts`](../packages/tokens/src/index.ts) als TS-Konstanten. Web zieht sie über `apps/web/scripts/generate-tokens-css.mjs` als CSS-Custom-Properties.

Kurz-Faustregeln:

- **Spacing**: 4 → 8 → 12 → 16 → 24 → 32. Außerhalb dieser Skala nichts.
- **Radius**: 8 → 14 → 18 → 22 → 28 → 999 (Pill). Pillen für Buttons, große Radien für Karten, mittlere für Inputs.
- **Shadow**: Nur drei Stufen — keine, `card`, `elevated`. Modal/Sheet darf höher.
- **Typo**: Heading-Font (Serif, Brand) für h1–h3 + Hero-Werte. Body-Font (Sans) für alles andere. Kein dritter Font-Stack.

## Component-Patterns

### Layout-Container

| Web | Mobile |
|---|---|
| `.app-shell` (Sidebar 290 px + Content) | `<Tabs>` mit max. 4 Bottom-Items + „Mehr" |
| `.public-landing` (1240 px max-width) | `<ScreenShell>` mit Hero + Aside + Children |
| `.auth-layout` (zentrierte Login-Card) | Login als eigener `<Stack.Screen>` |

**Faustregel Mobile:** jede Screen-Datei in `apps/mobile/app/(tabs)/*.tsx` nutzt `<ScreenShell>` als Top-Level. Niemals direkt `<View>` als Outer.

### Buttons

Drei Varianten, alle als CSS-Klassen / RN-Styles definiert:

- **Primary** (`button-control`): voll gefüllt mit `accentStrong`, weiß-cremefarbener Text, Pillen-Form, min. 44 px Höhe (Touch-Target).
- **Secondary** (`button-control-secondary`): nur Outline / dezenter Hintergrund, `accentStrong`-Text.
- **Danger** (`button-control-danger`): leichter `danger`-Hintergrund, `danger`-Text.

**Keine Quiet/Ghost/Link/Icon-only-Buttons.** Wenn nötig → erst hier ergänzen, dann nutzen.

### Cards

- **Section-Card**: Border-Radius 26, Padding 24, Border 1px `border`, Hintergrund `surfaceCard`. Default für Listen-Container und Detail-Sektionen.
- **Detail-Card**: Border-Radius 18, Padding 18, Hintergrund leicht heller. Für einzelne Listen-Einträge.
- **Hero-Card**: Border-Radius 30, Linear-Gradient `surfaceSoft → accentSoft`. Top-of-Page-Block.
- **Map-Card**: ohne sichtbaren Border; die Karte selbst ist die Surface.

### Empty / Loading / Error-States

Aktuell uneinheitlich. Soll-Pattern:

- **Empty**: Icon (Lucide für Web, Ionicons für Mobile) + 1 Headline + 1 Beschreibung + ggf. CTA.
- **Loading**: dasselbe Layout, Icon ist ein Spinner mit `accent`-Farbe, Headline „Wird geladen…", Beschreibung was geladen wird.
- **Error**: dasselbe Layout, Icon ist ein Achtung-Symbol in `danger`, Headline beschreibt den Bereich, Beschreibung enthält die nächste Aktion.

Vereinheitlichung kommt in Pfad 1 (Iteration 4).

### Navigation

**Web-Sidebar** (`apps/web/src/components/shell.tsx`):

- 290 px breit, dunkles Surface, weiße Schrift.
- Nav-Items mit Icon + Label + (bei aktiver Route) Linear-Gradient-Hintergrund `accent → accentSoft`.
- Item-Filter über `allowedRoles` — rollenfremde Routen sind unsichtbar (UI-Audit F-01).
- Logout-Button am unteren Sidebar-Ende, dezent.

**Mobile-Tabs** (`apps/mobile/app/(tabs)/_layout.tsx`):

- Maximal 4 sichtbare Tabs + „Mehr" als Sheet-Container für sekundäre Routen.
- Aktive Farbe `accent`, inaktive `muted`.
- Höhe 72, paddingBottom 12, paddingTop 8 (manuell, weil expo-router default zu kompakt).

## Mobile vs. Web — bewusste Unterschiede

| Aspekt | Web | Mobile | Grund |
|---|---|---|---|
| Karte | `@vis.gl/react-google-maps` | `react-native-maps` (Provider Google auf Android, Apple Maps auf iOS) | Apple-Maps-Fallback funktioniert ohne Key, schnellere Akzeptanz im App-Store. |
| Auswahlfelder | natives `<select>` | Eigene `<SelectField>` mit `ActionSheetIOS`/Modal | iOS-Idiomatik. |
| Foto | nicht vorgesehen (Backoffice ist Read/Export) | Kamera-first via `ImagePicker.launchCameraAsync` | Erfassung läuft im Feld. |
| Theme | nur Light (Brand-Identität). | `userInterfaceStyle: automatic` mit Dark-Tokens vorbereitet | Mobile wird outdoor in Dämmerung benutzt. |

## Wo das hier endet

Das ist ein **lebendes Dokument**. Wenn ein Pattern nicht passt, wird es hier diskutiert und im Code geändert — nicht umgekehrt.

Erweiterungs-Trigger:
- neuer Token-Typ → erst Token in `packages/tokens/`, dann hier dokumentieren
- neue Component-Variante → erst hier den Use-Case dokumentieren, dann in Code
- Brand-Voice-Beispiele → hier ergänzen, sobald Mikrocopy-Reviews stattfinden

Nächste konkrete Schritte: siehe [UX-Roadmap v2](./ux-roadmap-v2.md).

---

## §10 Design-System-Erweiterungen (PRs #132–#159, Mai/Juni 2026)

### Neue semantische Farb-Tokens (`packages/tokens`)
- `onAccent` — Textfarbe auf Akzentflächen (PR #134, #146)
- `onWarning` — Textfarbe auf Warnflächen (PR #152, #153)
- `surfaceMuted` — gedämpfte Oberflächenfarbe (PR #134)

### Neue Primitiven (`apps/mobile/src/components/`)
- `<Badge tone>` — Status-Badge mit semantischen Tone-Varianten (`neutral`, `positive`, `warning`, `critical`) — PR #135
- `<FeedbackBanner>` — Formular-Feedback-Komponente (Ansitze, Fallwild, Revierarbeit) — PR #144
- `<StateView>` — Loading/Empty-State-Komponente (ersetzt manuelle Inline-States) — PR #132–#133

### Neue Hilfsfunktionen
- `cardSurface()` in `lib/surfaces.ts` — konsolidierter Card-Hintergrund-Token-Helper — PR #145
- `eyebrowText()` in `lib/typography.ts` — konsolidierter Eyebrow/Section-Label-Helper — PR #141
- `rnShadow.card` in `@hege/tokens` — Card-Schatten für Login und App-Loader — PR #156

### Token-Adoption (Spacing/Radius)
- 139 Hardcode-Stellen in 30 Dateien auf Design-Tokens migriert — PR #154
- Alle Accent-Flächen auf `onAccent`-Token migriert (20 Stellen) — PR #146

### iOS Dark Mode
- `UIUserInterfaceStyle=Automatic` in `ios/hegeRevier/Info.plist` gesetzt — PR #159
