# Projektregeln

## Dokumentation

- Die Projektdokumentation ist auf Deutsch zu verfassen.
- Produktsprache fuer die App ist Deutsch fuer Oesterreich (`de-AT`).

## Produktentscheidungen

- Kartenfunktionen in Web und Mobile orientieren sich an Google Maps.

## Tech-Stack

- **Web:** Next.js 15 (`apps/web`) — produktive Linie; Vercel-native Route Handler unter `apps/web/src/app/api/v1/`
- **Mobile:** Expo / React Native (`apps/mobile`)
- **API-Referenz:** NestJS (`apps/api`) — nur Übergangspfad und Referenz, nicht die Zielarchitektur
- **Datenbank:** Drizzle ORM gegen Neon PostgreSQL/PostGIS; Schemas und Queries unter `apps/web/src/server/`
- **Build-System:** Turborepo + pnpm Workspaces (Monorepo)

## Primäre Architektur

Die produktive API-Linie läuft als Vercel-native Route Handler in `apps/web/src/app/api/v1/`. Die NestJS-App (`apps/api`) ist nur Referenzpfad und Übergangslösung; sie ist nicht die langfristige Zielarchitektur.

**API-Basispfad:** `/api/v1/`

## Packages

- `packages/domain` — gemeinsame Typen, Demo-Daten und Fachregeln
- `packages/tokens` — gemeinsame Design-Tokens (Farben, Spacing, Radius, Typographie) für Web und Mobile
- `packages/icons` — gemeinsame Icon-Assets für Web und Mobile

## Test-Commands

```bash
pnpm test          # Vitest – Unit- und Integrationstests für @hege/domain und @hege/web
pnpm test:e2e      # Playwright E2E-Tests in apps/web/e2e/
```

## Branch-Strategie

- Feature-Branches von `main`
- Turborepo als Build-System
- pnpm Workspaces als Monorepo-Grundlage
