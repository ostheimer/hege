# UI-Inkonsistenz-Audit hege Mobile

Stand: 2026-05-27 · Erstellt durch Code-Analyse + visuelle Verifikation auf iPhone 16e (iOS 26.2) mit frischem Debug-Build aller 11 Mobile-Screens.

## Screenshots

Alle Bilder unter `docs/mobile-ui-audit/`. Pro Screen (Reihenfolge wie sie der User durchläuft):

| # | Screen | Datei |
|---|---|---|
| 10 | Heute (Dashboard) | [10-heute.png](mobile-ui-audit/10-heute.png) |
| 11 | Ansitze | [11-ansitze.png](mobile-ui-audit/11-ansitze.png) |
| 12 | Fallwild | [12-fallwild.png](mobile-ui-audit/12-fallwild.png) |
| 13 | Mehr | [13-mehr.png](mobile-ui-audit/13-mehr.png) |
| 14 | Reviereinrichtungen | [14-reviereinrichtungen.png](mobile-ui-audit/14-reviereinrichtungen.png) |
| 15 | Meldungen / Revierarbeit | [15-revierarbeit.png](mobile-ui-audit/15-revierarbeit.png) |
| 16 | Kontakte | [16-kontakte.png](mobile-ui-audit/16-kontakte.png) |
| 17 | Benachrichtigungen | [17-benachrichtigungen.png](mobile-ui-audit/17-benachrichtigungen.png) |
| 18 | Protokolle | [18-protokolle.png](mobile-ui-audit/18-protokolle.png) |
| 19 | Über hege | [19-ueber-hege.png](mobile-ui-audit/19-ueber-hege.png) |
| 05 | Login (Login-Screen ohne Stack) | [05-after-dev-menu.png](mobile-ui-audit/05-after-dev-menu.png) |

## Zusammenfassung

- **Geprüfte Screens:** 11 — Login, Heute, Ansitze, Fallwild, Mehr, Kontakte, Protokolle, Revierarbeit, Reviereinrichtungen, Benachrichtigungen, Über-hege
- **Token-Adoption:** `packages/tokens/src/index.ts` bietet `spacing`, `radius`, `rnShadow`, semantische Farben. **Stand (§10-PRs #134–#156):** semantische Farben, `spacing`/`radius` (exakt passende Werte) und `rnShadow.card` (Login-/App-Loader-Cards, #156) werden in der Mobile-App genutzt. Bewusst nicht adoptiert: die 6 bespoke Komponenten-Schatten (FAB, Map-Stage, Queue-Badge, View-Toggle) — der web-abgeleitete `rnShadow` passt dort nicht. Noch offen: off-scale-Spacing/-Radien (feineres Raster als die Skala).

## Bestätigte Painpoints aus dem Simulator

Aus den Screenshots klar sichtbare visuelle Defekte (über die im Code identifizierten Stil-Drifts hinaus):

### A. **ScreenShell-Title rendert ungewollt klein** (Bug)

In `screen-shell.tsx:74` ist der Title mit `adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={2}` konfiguriert. Bei langen Title-Texten wird er **unter den Subtitle gedrückt** und wirkt visuell weniger wichtig als der Subtitle daneben.

- [17-benachrichtigungen.png](mobile-ui-audit/17-benachrichtigungen.png): „5 ungelesene Meldungen." rendert sichtbar kleiner als der Subtitle „Push- und In-App-Nachrichten der letzten Zeit. Tippen markiert als gelesen."
- [18-protokolle.png](mobile-ui-audit/18-protokolle.png): „Beschlüsse und Sitzungsunterlagen immer dabei." ist visuell kaum von der Subtitle zu unterscheiden.
- [16-kontakte.png](mobile-ui-audit/16-kontakte.png): „Telefonlisten" als 1-Wort-Title sollte groß sein, ist aber durch den `adjustsFontSizeToFit` der Schwester-Screens trotzdem auf ca. 13-15px gerutscht — eine Inkonsistenz im Hero-Design.

**Empfehlung:** `adjustsFontSizeToFit` entfernen, statt dessen mit fester Größe arbeiten und `numberOfLines={3}` zulassen. Title sollte IMMER größer sein als Subtitle.

### B. **Hero-Aside-Card überlagert/clipped den Eyebrow** (Bug)

In den Tabs Ansitze/Fallwild/Revierarbeit rendert die `aside`-Slot eine eigene Card mit großer Zahl (`queueValue fontSize: 34`). Im Hero-Header wird der Eyebrow nebenan **abgeschnitten oder vom aside-Card-Hintergrund überlagert**:

- [11-ansitze.png](mobile-ui-audit/11-ansitze.png): Statt „ANSITZ" steht oben links nur ein leerer Bereich + eine isolierte „0" → der Hero-Eyebrow wurde durch das aside-card verschluckt.
- [12-fallwild.png](mobile-ui-audit/12-fallwild.png): Gleicher Bug — der Eyebrow „FALLWILD" ist nicht erkennbar, nur die „0" der Queue-Anzeige.
- [15-revierarbeit.png](mobile-ui-audit/15-revierarbeit.png): „REVI…" wird abgeschnitten, daneben überlagert die große „9" der Queue-Anzeige.

**Empfehlung:** `heroHeaderRow`-Flexbox in `screen-shell.tsx:107` braucht `flex: 1` auf eyebrow + `flex-shrink: 0` auf asideSlot konsistent — aktuell zerquetscht die aside-Card mit ihrer 34px-Zahl den Eyebrow auf Null.

### C. **Doppelter „Benachrichtigungen"-Titel** (das gleiche Problem wie ursprünglich bei Kontakte)

[17-benachrichtigungen.png](mobile-ui-audit/17-benachrichtigungen.png) zeigt:
- Oben Stack-Header „**Benachrichtigungen**" mit Back-Button
- Direkt darunter im Hero der Eyebrow „**BENACHRICHTIGUNGEN**"

Identisch zur Kontakte-Vorgeschichte. `apps/mobile/app/_layout.tsx:42` setzt `headerShown: true, title: "Benachrichtigungen"`. Konsequente Lösung: Benachrichtigungen genauso in `(tabs)` als hidden tab verschieben wie wir es für Kontakte getan haben.

### D. **Über-hege rendert eigenen Hero ohne Gradient**

[19-ueber-hege.png](mobile-ui-audit/19-ueber-hege.png) hat keinen LinearGradient, sondern eine flache Card mit `theme.card`-Hintergrund. Optisch fremd gegenüber allen Tab-Hero. Stack-Header oben + Eyebrow + großer „hege"-Titel duplizieren auch hier.

### E. **Kontakte: Kontakte-Korrektur ist drin** ✅

[16-kontakte.png](mobile-ui-audit/16-kontakte.png) bestätigt die vorherige Korrektur: kein Stack-Header mit „(tabs)" + „Kontakte" mehr, Tab-Bar unten sichtbar. Aber wegen Painpoint A wirkt der Title „Telefonlisten" trotzdem kleiner als der Subtitle.

### F. **Tab-Bar Konsistenz** ✅

Alle Tab-Screens (Heute/Ansitze/Fallwild/Mehr + die hidden Tabs Reviereinrichtungen/Revierarbeit/Kontakte/Protokolle) zeigen jetzt korrekt die untere Tab-Bar.

---

## Applied Patches (Before/After)

Drei Patches angewendet und im Simulator verifiziert.

### Patch A — ScreenShell-Title nicht mehr shrinken

`adjustsFontSizeToFit minimumFontScale={0.8}` aus `screen-shell.tsx:74` entfernt, durch `numberOfLines={3}` ersetzt.

| Vorher | Nachher |
|---|---|
| [16-kontakte.png](mobile-ui-audit/16-kontakte.png) — „Telefonlisten" sichtbar kleiner als Subtitle | [22-kontakte-after.png](mobile-ui-audit/22-kontakte-after.png) — „Telefonlisten" groß und prominent |
| [17-benachrichtigungen.png](mobile-ui-audit/17-benachrichtigungen.png) — „5 ungelesene Meldungen." winzig | [21-benachrichtigungen-after.png](mobile-ui-audit/21-benachrichtigungen-after.png) — Title groß |
| [18-protokolle.png](mobile-ui-audit/18-protokolle.png) — „Beschlüsse und Sitzungsunterlagen…" zerquetscht | [23-protokolle-after.png](mobile-ui-audit/23-protokolle-after.png) — Title über 3 Zeilen lesbar |

### Patch B — Aside-Card sichtbar machen

- `asideSlot` in `screen-shell.tsx:122` bekam `maxWidth: 140` (verhindert dass aside den Eyebrow erdrückt).
- `queueCard`/`asideCard` in `ansitze.tsx`, `fallwild.tsx`, `revierarbeit.tsx`: `backgroundColor: theme.accent` + `padding: 12 + borderRadius: 14`. Cremefarbene Texte sind jetzt auf grünem Hintergrund lesbar (vorher creme-auf-cream-Gradient).
- queueValue von `fontSize: 34` auf `26` reduziert (passt in 140px-Slot).

| Vorher | Nachher |
|---|---|
| [11-ansitze.png](mobile-ui-audit/11-ansitze.png) — nur isolierte „0", Eyebrow fehlt | [20-ansitze-after.png](mobile-ui-audit/20-ansitze-after.png) — Eyebrow „ANSITZ" + grüne aside-Card mit klar lesbarem Inhalt |
| [12-fallwild.png](mobile-ui-audit/12-fallwild.png) | [24-fallwild-after.png](mobile-ui-audit/24-fallwild-after.png) — analog mit „AUSSTEHENDE SYNCHRONISIERUNG" |

### Patch C — Benachrichtigungen ins (tabs)

- `apps/mobile/app/benachrichtigungen.tsx` → `apps/mobile/app/(tabs)/benachrichtigungen.tsx`
- `Stack.Screen` Eintrag aus `_layout.tsx` entfernt
- `Tabs.Screen name="benachrichtigungen" options={{ href: null }}` in `(tabs)/_layout.tsx` ergänzt
- Hrefs in `mehr.tsx` und `(tabs)/index.tsx` auf `/(tabs)/benachrichtigungen` umgestellt

| Vorher | Nachher |
|---|---|
| [17-benachrichtigungen.png](mobile-ui-audit/17-benachrichtigungen.png) — Stack-Header „Benachrichtigungen" + ScreenShell-Eyebrow „BENACHRICHTIGUNGEN" (doppelt), keine Tab-Bar | [21-benachrichtigungen-after.png](mobile-ui-audit/21-benachrichtigungen-after.png) — kein Stack-Header, Eyebrow einmalig, Tab-Bar unten |

**Status:** Patches A+B+C visuell im Simulator (iPhone 16e, frischer Debug-Build) verifiziert.

### G. **Mehr-Liste**

[13-mehr.png](mobile-ui-audit/13-mehr.png): Title „Profil und weitere Bereiche" passt zwei Zeilen, OK. Liste sauber strukturiert mit Icon-Badges + Chevron rechts. Hier ist der Hero großzügig dimensioniert — im Vergleich wirkt der Heute-Hero ([10-heute.png](mobile-ui-audit/10-heute.png)) mit „Sync OK"-Pill enger.

---

## Code-Painpoints (aus der vorherigen Analyse, mit visueller Bestätigung)

- **Top-3:**
  1. **State-Cards** sind 5× redundant implementiert (`stateCard`, `infoCard`, `errorCard`, `feedbackCard*`, `queueStateCard`). Die einheitliche `StateView`-Komponente existiert, wird aber nur von Heute, Benachrichtigungen und Kontakte genutzt.
  2. **Padding/Radius-Drift in Cards:** Form/State-Cards `18+22`, Filter-Sections `14+18`, Mehr-Links `16+18`, Über-hege wechselt `20+22 / 16+18`. Keiner dieser Werte ist Token-Wert.
  3. **Secondary-Button-Farbe** in mindestens 5 Varianten: `#e3dccd`, `#ddcfb7`, `#e8dfcc`, `#f0eadc`, `theme.card`. Ohne semantische Definition.

---

## 1. Spacing / Padding — Card-Inventory

| Screen | Style-Key | padding | borderRadius | gap | backgroundColor |
|---|---|---|---|---|---|
| ScreenShell.hero | `hero` | 18 | 24 | 6 | LinearGradient |
| ScreenShell.heroCompact | `heroCompact` | 14 | 18 | 4 | LinearGradient |
| login | `card` | 24 | 28 | 18 | `theme.card` |
| login | `unlockPanel` | 14 | 20 | 10 | `#f0eadc` |
| heute | `card` | 18 | 22 | 10 | `theme.card` |
| heute | `queueStateCard` | 18 | 22 | 6 | `#efe3d1` |
| ansitze | `formCard` | 18 | 22 | 14 | `theme.card` |
| ansitze | `stateCard` | 18 | 22 | 6 | `theme.card` |
| ansitze | `infoCard` | 18 | 22 | 6 | `#efe3d1` |
| ansitze | `errorCard` | 18 | 22 | 6 | `#f0d9d4` |
| ansitze | `filterSection` | 14 | 18 | 10 | `theme.card` |
| fallwild | `formCard` | 18 | 22 | 14 | `theme.card` |
| fallwild | `locationActionCard` | 14 | 18 | 8 | `#f3ecdf` |
| fallwild | `photoPreviewCard` | 12 | 18 | 12 | `#f3ecdf` |
| fallwild | `feedbackCard*` | 18 | 22 | 6 | `#e3ecd7` / `#efe3d1` |
| fallwild | `smartDefaultsBanner` | 14 | 16 | 4 | `rgba(157,179,111,0.18)` |
| mehr | `profileCard` | 18 | 22 | 6 | `theme.card` |
| mehr | `linkList` | – | 22 | – | `theme.card` |
| kontakte | `sectionCard` | 14 | 18 | 12 | `theme.card` |
| kontakte | `listCard` | 14 | 18 | 12 | `rgba(255,255,255,0.54)` |
| kontakte | `contactCard` | 12 | 16 | 10 | `theme.surface` |
| protokolle | `card` | 18 | 22 | 8 | `theme.card` |
| protokolle | `filterSection` | 14 | 18 | 10 | `theme.card` |
| revierarbeit | `formCard` | 18 | 22 | 14 | `theme.card` |
| revierarbeit | `filterSection` | 14 | 18 | 10 | `theme.card` |
| reviereinrichtungen | `card` | 18 | 22 | 8 | `theme.card` |
| benachrichtigungen | `card` | 16 | 18 | 6 | `theme.card` |
| benachrichtigungen | `emptyCard` | 24 | 22 | 8 | `theme.card` |
| ueber-hege | `heroCard` | 20 | 22 | 8 | `theme.card` |
| ueber-hege | `card` | 16 | 18 | 10 | `theme.card` |
| StateView (Komponente) | `card` | 22 | 22 | 12 | `theme.card` |

**Auffälligkeiten:**
- Drei konkurrierende Card-Größen: **18/22** (Form, Listen, State), **14/18** (Filter, Secondary-Surfaces), **16/18** (Notification, Über-hege).
- Werte 6, 10, 12, 14, 18, 22 sind komplett außerhalb des Token-Systems (`spacing.xs=4`, `sm=8`, `md=16`, `lg=24`).
- `StateView` nutzt padding 22 — größer als alle Inline-Varianten. Auf demselben Screen mischt sich also größere und kleinere Karte.

---

## 2. Buttons

### Primary Button

| Screen | minHeight | borderRadius | fontSize | textColor |
|---|---|---|---|---|
| login | 52 | 16 | 16 | `theme.surface` |
| ansitze | 52 | 16 | 16 | `theme.surface` |
| fallwild | 52 | 16 | 16 | `theme.surface` |
| revierarbeit | 52 | 16 | 16 | `theme.surface` |
| **kontakte** | **46** | 16 | **14** | `#fff8ec` |
| fallwild.locationButton | **48** | 16 | 14 | `theme.surface` |
| fallwild.photoCameraButton | **48** | **999** | 14 | `theme.surface` |
| mehr.logoutButton | 52 | **18** | 15 | `theme.ink` |

**Painpoints:**
- Kontakte-PrimaryButton ist 46 hoch mit fontSize 14 — sichtbar kleiner als die 52er-Buttons in Ansitze/Fallwild.
- Mehr-Logout hat borderRadius 18 statt 16.
- Fallwild-Photo-Camera ist Pill (`999`) statt der Standard 16.
- Text-Farbe wechselt zwischen `theme.surface`, `#fff8ec`, `#fff9ef`, `#f7f2e5` — drei Cremetöne für "weiß auf grün".

### Secondary Button — 6 Varianten

| Screen | minHeight | borderRadius | backgroundColor |
|---|---|---|---|
| login | 48 | 16 | `theme.surface` + border `#cfc7b7` |
| heute | – | 999 | `#e3dccd` |
| ansitze | 52 | 16 | `#e3dccd` |
| fallwild.secondaryButton | 52 | 16 | `#e3dccd` |
| fallwild.photoPickerButton | 48 | 999 | `#e8dfcc` |
| fallwild.photoRemoveButton | 36 | 999 | `#ddcfb7` |
| revierarbeit | 44 | 14 | `#e3dccd` |
| kontakte | 42 | 14 | `#e3dccd` |

**Painpoints:** 6 verschiedene Hintergrundfarben für "Secondary"; Höhe variiert 36–52, radius 14/16/999. Allein in Fallwild stehen drei Beigetöne nebeneinander.

---

## 3. State-Cards (Loading/Error/Empty/Info/Feedback) — 5× redundant

| Variante | Hex-BG | Screens | Bedeutung |
|---|---|---|---|
| `stateCard` | `theme.card` | ansitze, fallwild, revierarbeit, protokolle, reviereinrichtungen | Loading/Empty |
| `infoCard` | `#efe3d1` | ansitze, revierarbeit | Status-Message |
| `errorCard` | `#f0d9d4` | ansitze, fallwild, revierarbeit | Fehler |
| `queueStateCard` | `#efe3d1` | heute | Queue-Hinweis |
| `feedbackCardSuccess` | `#e3ecd7` | fallwild | Success |
| `feedbackCardWarning` | `#efe3d1` | fallwild | Warnung |
| `emptyCard` | `theme.card` | benachrichtigungen | Empty (zentriert) |
| `StateView` (Component) | `theme.card` | heute, benachrichtigungen, kontakte | offizielle Komponente |

**Painpoints:**
- `infoCard`, `feedbackCardWarning`, `queueStateCard` haben identisches `#efe3d1` — semantisch dasselbe, drei Style-Keys.
- Protokolle benutzt `stateCard` **auch für Error** — keine visuelle Fehler-Indikation.
- `StateView` ist die einzige Komponente, die das Pattern zentralisiert — wird aber nur von 3 Screens benutzt.

---

## 4. Hardcoded Farben außerhalb der Tokens

### Cremes / Backgrounds

| Hex | Verwendung | Vorschlag |
|---|---|---|
| `#e3dccd` | Secondary-Button-BG (überall) | `surfaceMutedSolid` |
| `#e8dfcc` | photoPickerButton | konsolidieren auf `#e3dccd` |
| `#ddcfb7` | photoRemove, discardButton | `surfaceMutedStrong` |
| `#cfc7b7` | borderColor secondary (login) | konsolidieren mit `#d9d2c4` |
| `#d9d2c4` | Input-Border (alle Forms) | `inputBorder` |
| `#f0eadc` | Login unlockPanel | konsolidieren auf `warningSurface` |
| `#f3ecdf` | Fallwild Location/Photo-Card | `surfaceMuted` |
| `#e5dfd1` | Separator (protokolle) | `tokens.border` |

### Status-Pastelle

| Hex | Bedeutung | Vorschlag |
|---|---|---|
| `#dde7cf` / `#e3ecd7` | Success / OK | `successSurface` |
| `#dce6df` | Info | `infoSurface` |
| `#efe3d1` / `#f0eadc` | Warning / Info | `warningSurface` |
| `#f4d9bf` | Conflict | `conflictSurface` |
| `#f0d9d4` | Danger | `dangerSurface` |
| `#d8e4ee` | Uploading / cool info | `infoSurfaceCool` |

### Light-Inks (Tinte auf Akzent-grün)

`#fff8ec`, `#fff9ef`, `#f7f2e5` — drei Cremetöne für dasselbe Konzept "Tinte auf grünem Akzent". Brauche Token `onAccent`. → ✅ **Erledigt:** `onAccent` erstellt (#134) + auf Akzent-Flächen und Map-Fallbacks adoptiert (#146/#148); analog `onWarning` für `theme.warning`-Flächen (Status-Pills/-Badges, #152). Beide kippen im Dark Mode bewusst auf dunkle Tinte (`#10231d`) statt Creme — Kontrast behoben.

### Sonstige Drifts

- `kontakte.tsx:644`: hardcoded `#19392c` als Icon-Farbe ≠ `tokens.lightColors.ink` (`#173328`).
- `kontakte.tsx:644`: hardcoded `#9d4a3f` als Danger-Icon-Farbe ≠ `tokens.lightColors.danger` (`#96483d`).
- Gradient `["#fff8ec","#dde6c3"]` doppelt in `screen-shell.tsx:67` und `login.tsx:135` — beim Anpassen muss man zwei Stellen ändern.

---

## 5. ScreenShell-Nutzung

| Screen | Nutzt ScreenShell | Refresh in ScreenShell |
|---|---|---|
| login | nein (eigene Gradient + Card) | – |
| heute | ja | ja |
| ansitze | ja | nein (Toolbar) |
| fallwild | ja | nein (Toolbar) |
| mehr | ja | ja |
| kontakte | ja | ja |
| protokolle | ja | nein (Toolbar) |
| revierarbeit | ja | nein (Toolbar) |
| reviereinrichtungen | ja | ja |
| benachrichtigungen | ja | ja |
| ueber-hege | nein (eigener Hero) | – |

**Painpoints:**
- **Niemand** nutzt `compactHero={true}` oder `topSafeArea={false}` — diese ScreenShell-Props sind tot.
- Login (`fontSize: 30, padding: 24, borderRadius: 28`), ScreenShell-Hero (`fontSize: 26, padding: 18, borderRadius: 24`) und Über-hege-Hero (`fontSize: 36, padding: 20, borderRadius: 22`) sind drei verschiedene Hero-Looks für drei verschiedene Routen-Typen.
- Refresh wird nur von 5 von 9 Tab-Screens an ScreenShell delegiert — der Rest baut Custom-Refresh-Buttons.

---

## 6. Schatten

- `rnShadow.card` und `rnShadow.elevated` existieren in Tokens (`packages/tokens/src/index.ts:141-156`).
- **Niemand importiert sie.** `grep "rnShadow" apps/mobile` → 0 Treffer.
- Login-Card hat als einzige einen Inline-Schatten (`login.tsx:243-247`) — identisch zum Token-Wert, **außer `elevation: 4` statt `6`**.

---

## 7. Eyebrow / Section-Label Typo — 9+ verschiedene Definitionen

| Style | fontSize | letterSpacing | fontWeight | Vorkommen |
|---|---|---|---|---|
| ScreenShell.eyebrow | 12 | **1.5** | (nicht gesetzt) | `screen-shell.tsx:113` |
| heute.cardEyebrow | 12 | 1.2 | 700 | `index.tsx:458` |
| filterEyebrow (5 Screens) | **11** | 1.1 | 700 | Ansitze/Fallwild/etc. |
| sectionLabel (3 Screens) | 12 | 1.1 | (nicht gesetzt) | Forms |
| mehr.profileLabel | 12 | 1.2 | (nicht gesetzt) | `mehr.tsx:219` |
| kontakte.eyebrow | 12 | 1.1 | (nicht gesetzt) | `kontakte.tsx:735` |
| ueber-hege.eyebrow | 11 | 1.2 | 700 | `ueber-hege.tsx:159` |
| benachrichtigungen.channelLabel | 11 | 0.6 | 700 | Pill |
| ansitze.ansitzBadgeText | 11 | 0.8 | 700 | Badge |

**Painpoint:** Der Hero-Eyebrow von ScreenShell wirkt "weicher" als die Inline-Eyebrows in den Cards, weil ihm `fontWeight: 700` fehlt, dafür `letterSpacing: 1.5` (alle anderen 1.1/1.2).

---

## 8. Badges — 5 verschiedene Padding-Sets

| Style | px | py | radius | weight | Screen |
|---|---|---|---|---|---|
| ansitze.okBadge / dangerBadge | 12 | 8 | 999 | 600 | |
| heute.queueBadge | 12 | 8 | 999 | 600 | |
| **heute.ansitzBadge** | 10 | **4** | 999 | 700 | |
| fallwild.badge | 12 | 8 | 999 | 600 | |
| revierarbeit.*Badge | 12 | 8 | 999 | 700 | |
| **protokolle.okBadge** | 10 | **7** | 999 | 700 | |
| **kontakte.countBadge** | **9** | **5** | 999 | 700 | |
| **benachrichtigungen.channelPill** | **8** | **2** | 999 | 700 | |

Auf demselben Bildschirm können verschieden große "aktiv"-Badges nebeneinander stehen.

---

## 9. Sonstige Drifts

### Inputs

Alle 5 Forms (Login/Ansitze/Fallwild/Revierarbeit) nutzen `minHeight: 52, borderRadius: 16, borderColor: #d9d2c4, paddingHorizontal: 14`. **Kontakte** weicht ab mit `minHeight: 50, paddingVertical: 10` zusätzlich — leicht enger.

### Filter-Reset-Pill — byte-identisches Copy-Paste

5 Screens (Ansitze, Fallwild, Protokolle, Revierarbeit, Reviereinrichtungen) haben **identische** `filterReset`-Definitionen. Ändert man die Akzent-Rundung, muss man 5 Files anfassen.

### Hero-Aside-Cards (Queue-Anzeige)

Ansitze/Fallwild/Revierarbeit rendern in `aside` eigene `queueCard` mit fontSize 34 für den Wert. Heute nutzt stattdessen den `QueueStatusPill`-Component. → 4× verschiedene Pattern für dasselbe Konzept "Hero-Aside-Anzeige".

---

## 10. Empfehlung: Konsolidierung

### Fehlende Tokens / Style-Primitiven

1. **Semantische Farb-Sets** in `@hege/tokens`:
   - `surfaceMuted`, `surfaceMutedStrong`, `inputBorder`, `onAccent`, `onWarning`
   - `successSurface`, `warningSurface`, `dangerSurface`, `infoSurface`, `conflictSurface`
   - _Status: ✅ erstellt (#134), erweitert um `onWarning` (#152). Adoptiert: `StateView` (#134), `<Badge>`/Status-Surfaces (#135/#136), Muted-Buttons (#142), `<FeedbackBanner>` (#144), `onAccent` auf Akzent-Flächen + Map-Fallbacks (#146/#148), `onWarning` auf Status-Pills/-Badges (#152). Text-auf-farbiger-Fläche ist im Dark Mode jetzt durchgehend kontraststark._

2. **Spacing-Tokens tatsächlich nutzen.** Ersetze 6/10/12/14/18/22 durch `tokens.spacing.xs/sm/md/lg`. → ✅ exact-match (4/8/16/24/32) adoptiert (#154); off-scale (6/10/12/14/18/22) bewusst belassen — die App nutzt ein feineres Raster als die Skala, Snapping wäre ein sichtbarer Eingriff (separate Design-Entscheidung).

3. **Radius-Mapping:**
   - `radius.sm` (6) → Channel-Pills
   - `radius.md` (12) → Icon-Buttons, Photo-Image
   - `radius.lg` (20) → State-Cards, Filter-Sections (statt 18/22)
   - `radius.xl` (28) → Hero, Login-Card (statt 24/28)
   - `radius.full` (999) → Pills/Badges
   - _Status: ✅ exact-match (12/20/28/999) adoptiert (#154); off-scale (14/16/18/22/24) bewusst belassen._

4. **Style-Primitive-Komponenten** (`apps/mobile/components/ui/`):
   - `<PrimaryButton>` mit Größen `default | small | pill`
   - `<SecondaryButton>` mit Varianten
   - `<Card>` mit Varianten `primary | filter | state`
   - `<Eyebrow>` (Typo-Komponente)
   - `<Badge tone="success|warning|danger|info|conflict">`
   - `<FilterSection>` wrapper für SearchInput + ChipRows + Reset
   - Pflicht: `<StateView>` statt Inline-`stateCard`/`errorCard`/`infoCard`/`feedbackCard*`.

5. **`rnShadow.card` aus Tokens importieren** — entweder in Login + Hero-Aside einsetzen oder Token entfernen.

6. **ScreenShell für alle Routes:** Login und Über-hege migrieren (`compactHero` und `topSafeArea` existieren genau dafür).

### Geschätzter Aufwand (reine Konsolidierung, keine UX-Änderung)

- ~1 Tag: Tokens-Datei erweitern (semantische Farben) + Snapshot-Verify
- ~2 Tage: Style-Primitive-Komponenten + Pilot-Migration (Heute + Ansitze)
- ~2 Tage: Migration der restlichen 9 Screens
- ~0.5 Tag: Login + Über-hege auf ScreenShell

**Gesamt: ~5–6 Personentage** für hohe Lesbarkeits- und Wartungsgewinne ohne sichtbare UX-Umgestaltung.
