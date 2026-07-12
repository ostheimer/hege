# Projektregeln

## Dokumentation

- Die Projektdokumentation ist auf Deutsch zu verfassen.
- Produktsprache fuer die App ist Deutsch fuer Oesterreich (`de-AT`).

## Produktentscheidungen

- Kartenfunktionen in Web und Mobile orientieren sich an Google Maps.

## Tech-Stack

- Web: Next.js App Router; produktive API unter `apps/web/src/app/api/v1/`.
- Mobile: Expo/React Native im Bare Workflow; EAS Build und EAS Update.
- Daten: Drizzle ORM auf PostgreSQL/PostGIS; Storage über S3-kompatible APIs.
- Tests: Vitest für Domain/Web/Mobile, Playwright für Web-E2E, Maestro für stabile iOS-Simulator-Flows.

## Bestehende Code-Muster

- Der Mobile-Bereich `Meldungen` liegt in `apps/mobile/app/(tabs)/revierarbeit.tsx`; keine parallele `meldungen.tsx` anlegen.
- Mobile Card-Flächen über `cardSurface(theme)`, Feedback über `FeedbackBanner` und Status über `Badge` aufbauen.
- Rollenrechte aus `packages/domain/src/permissions.ts` ableiten; keine neuen lokalen Rollenlisten einführen.
- Rollen- und Zustandslabels über die bestehenden `formatRoleLabel`-/`formatEinrichtungZustand`-Helper anzeigen.
- Neue Mobile-Listen unterstützen Pull-to-Refresh; keinen separaten Aktualisieren-Button ergänzen.
- Reviermeldung-zu-Aufgabe nutzt `sourceType: "reviermeldung"` und `sourceId`.
