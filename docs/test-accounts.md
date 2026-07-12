# Test-Accounts

## Zweck

Zentraler Überblick der Demo-/Test-Logins für hege. Wird für UI-Tests, Demos und Smoke-Läufe genutzt. Quelle der Daten: [packages/domain/src/mock-data.ts](../packages/domain/src/mock-data.ts), in Production über das Seed-Skript ([apps/web/scripts](../apps/web/scripts)) eingespielt.

## Demo-PIN

Alle Seed-User teilen dieselbe PIN. Quelle ist die Umgebungsvariable `DEMO_PASSWORD` ([apps/web/src/server/auth/service.ts:132-138](../apps/web/src/server/auth/service.ts#L132-L138)).

Aktueller Wert in Production: `9526`. Das ist ein Demo-Wert, nicht hochsensibel — der Seed legt vier Test-Accounts mit identischem Hash an.

## Login-Liste

Login wahlweise mit Username oder E-Mail.

| Rolle | Username | E-Mail | Display-Name | Jagdzeichen | Revier |
|-------|----------|--------|--------------|-------------|--------|
| `revier-admin` | `revieradmin` | revierleitung@hege.app | Revierleitung Gänserndorf | RL-01 | Jagdgesellschaft Gänserndorf |
| `schriftfuehrer` | `mair` | martin.mair@hege.app | Martin Mair | MM-04 | Jagdgesellschaft Gänserndorf |
| `jaeger` | `huber` | lukas.huber@hege.app | Lukas Huber | LH-07 | Jagdgesellschaft Gänserndorf |
| `ausgeher` | `ostheimer` | andreas@ostheimer.at | Andreas Ostheimer | AO-01 | Jagdgesellschaft Gänserndorf |

## Was welche Rolle sieht

Die gemeinsame Rollen-/Feature-Matrix liegt in [`packages/domain/src/permissions.ts`](../packages/domain/src/permissions.ts). Server-, Web- und Mobile-Guards leiten ihre Rollen daraus ab.

| Route | Erforderliche Rolle |
|-------|---------------------|
| `/app` (Dashboard) | jede authentifizierte Rolle |
| `/app/ansitze` | jede authentifizierte Rolle |
| `/app/fallwild` | jede authentifizierte Rolle |
| `/app/reviereinrichtungen` | jede authentifizierte Rolle |
| `/app/protokolle` | jede authentifizierte Rolle |
| `/app/kontakte` | jede authentifizierte Rolle |
| `/app/sitzungen` | `schriftfuehrer`, `revier-admin`, `platform-admin` |
| `/app/sitzungen/[id]` | `schriftfuehrer`, `revier-admin`, `platform-admin` |

Die Sidebar filtert rollenfremde Links. Nicht autorisierte Direktzugriffe führen mit sichtbarem Berechtigungshinweis zum Dashboard zurück.

## Mutationen je Rolle

Aus [apps/web/src/server/modules/sitzungen/service.ts:48-159](../apps/web/src/server/modules/sitzungen/service.ts#L48-L159):

| Aktion | Erlaubt |
|--------|---------|
| Sitzung anlegen / bearbeiten | `schriftfuehrer`, `revier-admin` |
| Version anlegen / bearbeiten | `schriftfuehrer`, `revier-admin` |
| Freigeben | `revier-admin` |
| Kontaktlisten anlegen / bearbeiten / löschen | `schriftfuehrer`, `revier-admin`, `platform-admin` |
| Fallwild-Testdaten bereinigen | `schriftfuehrer`, `revier-admin`, `platform-admin` |

## Fehlende Rolle

`platform-admin` ist im Type-System definiert ([packages/domain/src/types.ts:1](../packages/domain/src/types.ts#L1)), wird aber von keinem Seed-User belegt. Wer eine Plattform-Admin-Sicht testen möchte, muss den Seed erweitern — siehe [ui-audit-2026-05-07.md F-20](./ui-audit-2026-05-07.md#f-20-public-registration-legt-nur-revier-admin-an-kein-member-invite--hoch).

## Public-Registration

Der Self-Serve-Registrierungs-Flow auf `/registrieren` legt **immer** einen neuen `revier-admin` plus dessen Revier an ([apps/web/src/server/modules/public-registration/service.ts:71](../apps/web/src/server/modules/public-registration/service.ts#L71)). Es gibt aktuell keinen UI-Pfad, um weitere Mitglieder einzuladen oder mit Rollen zu versehen — siehe F-20 im Audit.

## Mobile

Login auf der iOS-/Android-App nutzt dieselben Credentials. Nach erfolgreichem Login wird die Session lokal gespeichert; Face ID / Touch ID entsperrt eine bestehende Sitzung, ersetzt aber keine PIN-Eingabe ([apps/mobile/app/login.tsx](../apps/mobile/app/login.tsx)).
