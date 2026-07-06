# Projektregeln

## Dokumentation

- Die Projektdokumentation ist auf Deutsch zu verfassen.
- Produktsprache fuer die App ist Deutsch fuer Oesterreich (`de-AT`).

## Produktentscheidungen

- Kartenfunktionen in Web und Mobile orientieren sich an Google Maps.

## Code-Muster (immer verwenden, nie duplizieren)

**Mobile Tab-Dateinamen:** Der Tab „Meldungen" (Reviermeldungen + Aufgaben) liegt in `apps/mobile/app/(tabs)/revierarbeit.tsx`. Nicht `meldungen.tsx` erstellen — diese Datei existiert nicht und darf nicht angelegt werden.

**Mobile Card-Flächen:** Immer `cardSurface(theme)` aus `apps/mobile/lib/surfaces.ts` für alle Card-Hintergründe verwenden.

**Lesbare Labels:** Rollen-Labels über `formatRoleLabel` aus `apps/web/src/lib/labels.ts` bzw. `apps/mobile/lib/format.ts` auflösen. Zustände von Reviereinrichtungen über `formatEinrichtungZustand`. Nie Label-Strings inline definieren.

**Transientes Feedback:** `<FeedbackBanner>` für kurz eingeblendete Erfolgs-/Fehlermeldungen. Keinen eigenen Banner bauen.

**Status-Badges:** `<Badge tone>` mit semantischen Farbwerten (`success`, `warning`, `error`, `info`). Keine ad-hoc-Farblogik für Status-Chips.

**Pull-to-Refresh:** Neue Mobile-Listscreens brauchen Pull-to-Refresh. Der „Aktualisieren"-Button wurde entfernt (PR #172) und darf nicht neu eingebaut werden.

**Theme in nativen iOS-Sheets:** `resolveEffectiveThemeScheme(mode, scheme)` aufrufen, bevor ein nativer ActionSheet oder SelectField geöffnet wird — sonst ignoriert iOS-Sheet den In-App-Umschalter.

**Reviermeldung → Aufgabe Konversion:** Der Mechanismus läuft über `sourceType: "reviermeldung"` und `sourceId` in `apps/web/src/server/modules/revierarbeit/service.ts`. Neue Ressourcentypen (z. B. Fallwild → Aufgabe) können denselben Mechanismus nutzen.

**Filter/Sort/CSV als Standard:** Alle Listscreens (Web + Mobile) haben Filter-Chips, Sort-Chips und CSV-Export. Neue Listen müssen dieses Muster von Anfang an mitimplementieren.

**Web-Backoffice Reviermeldungen + Aufgaben:** Die Seiten `apps/web/src/app/app/reviermeldungen/` und `apps/web/src/app/app/aufgaben/` sind produktiv. Neue Features für diese Domänen bauen auf diesen bestehenden Seiten auf.
