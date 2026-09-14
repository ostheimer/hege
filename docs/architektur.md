# Architektur

## Zielarchitektur

`hege` ist als mandantenfaehige SaaS fuer Jagdgesellschaften und Reviere in Oesterreich geplant. Ein `Revier` ist der fachliche Tenant. Benutzer koennen mehreren Revieren mit unterschiedlichen Rollen zugeordnet sein.

Die Plattform besteht aus drei Hauptanwendungen:

- `apps/web`: internes Backoffice fuer Schriftfuehrer und Revier-Admins
- `apps/mobile`: mobile App fuer Jaeger im Feld
- `apps/api`: bestehende Uebergangs-API fuer das Demo-Geruest und die schrittweise Migration

Das Shared Package `packages/domain` enthaelt gemeinsame Typen, Statuswerte, Demo-Daten und Fachregeln.

## Monorepo-Struktur

```text
apps/
  web/
  mobile/
  api/
packages/
  domain/
  tokens/
  icons/
docs/
```

## Technischer Zielstack

### Backend

- Next.js Route Handler in `apps/web` als Zielpfad fuer v1
- PostgreSQL mit PostGIS fuer Reviergrenzen, Standorte und Ereignisse
- Cloudflare R2 ueber S3-kompatible API fuer Fotos, Anhaenge und PDF-Dokumente
- Cloudflare DNS fuer `hege.app`
- optionale manuelle Aktualisierung oder leichtes Polling statt verpflichtender WebSockets in v1
- Job-Queue fuer Push, Bildverarbeitung, PDF-Generierung und Offline-Nachverarbeitung

### Web

- Next.js App Router
- internes Backoffice, keine oeffentliche Marketing-Seite
- Fokus auf Sitzungen, Protokolle, Freigaben und Revierueberblick

### Mobile

- Expo / React Native
- Fokus auf Ansitz, Fallwild, Reviereinrichtungen und Protokolle
- Offline-Faehigkeit fuer Kernablaeufe
- Kartenfunktionen orientieren sich an Google Maps fuer mobile Karten, Marker und Standortsuche

## Sprache und Lokalisierung

- v1 verwendet Deutsch fuer Oesterreich (`de-AT`) als einzige verpflichtende Produktsprache
- sichtbare Texte in Web und Mobile werden zentral strukturierbar gehalten, damit zusaetzliche Sprachen spaeter ergaenzt werden koennen
- API-Codes, Statuswerte und fachliche Schluessel bleiben sprachneutral, damit Uebersetzungen nicht mit Persistenz oder Integrationen vermischt werden
- Englisch (`en`) ist erst die bevorzugte erste Zweitsprache nach v1, nicht Bestandteil der initialen Auslieferung

## Mandanten- und Rollenmodell

### Tenant

- `Revier` ist die oberste fachliche Einheit
- alle fachlichen Ressourcen haengen an `revier_id`
- jede Anfrage wird auf einen Revier-Kontext eingeschraenkt

### Rollen

- `Platform Admin`
- `Revier Admin`
- `Schriftfuehrer`
- `Jaeger`
- weitere Rollen wie `Gaeste`, `Ausgeher`, `Gesellschafter`, `Paechter`, `Jagdaufseher`, `Jagdleiter` oder `Kassier` sind fachlich vorgesehen

### Grundregel

- `Schriftfuehrer` und `Revier Admin` arbeiten primaer im Web
- `Jaeger` arbeitet primaer mobil
- `Revier Admin` darf zusaetzlich Freigaben und Verwaltungsaktionen ausfuehren

### Erweiterbare Rollen

- Rollen sind fachlich erweiterbar, zum Beispiel um `Gaeste`, `Ausgeher`, `Gesellschafter`, `Paechter`, `Jagdaufseher`, `Jagdleiter` oder `Kassier`
- ein Mitglied kann mehrere Rollen gleichzeitig haben
- Rollen werden als fachliche Berechtigungsschicht verstanden, nicht als starre Einzelzuordnung

### Mitgliedschaft, Rolle und Berechtigung

- die `membership` bleibt die technische Zuordnung einer Person zu einem Revier
- Rollen haengen an einer Mitgliedschaft und koennen mehrfach vergeben werden
- Berechtigungen werden nicht frei pro Person gespeichert, sondern aus den aktiven Rollen abgeleitet
- spaetere Sonderrechte bleiben moeglich, sollen aber als Ausnahme ueber klar benannte Policy-Regeln modelliert werden

## Domaenenmodule

### Ansitz

- aktive Ansitze
- Konfliktpruefung bei Doppelbelegung
- aktueller Status im Revier mit manueller Aktualisierung

### Reviereinrichtungen

- Hochstaende, Fuetterungen, Salzlecken, Kirrungen und weitere Einrichtungstypen
- Zustand, Kontrollen und Wartung

### Fallwild

- strukturierte Erfassung von KFZ-Wild
- Fotos, Standort, Wildart, Geschlecht, Status
- Exportierbarkeit fuer interne oder externe Weitergabe

### Sitzungen und Protokolle

- Sitzungsstammdaten
- Teilnehmer
- Protokollversionen
- Beschluesse
- Freigabe und Veroeffentlichung

### Mitglieder, Rollen, Aufgaben und Nachrichten

- Mitgliedschaften koennen mehrere Rollen tragen
- Aufgaben werden Rollen oder einzelnen Mitgliedern zugewiesen
- Aufgaben koennen aus Protokollen, Beschluessen oder manueller Zuweisung entstehen
- Aufgaben koennen einmalig, wiederkehrend oder als Projekt mit Start- und Enddatum gefuehrt werden
- Nachrichten werden intern rollen- oder empfaengerbezogen modelliert
- externe Messenger wie WhatsApp oder Telegram werden spaeter als Kanaele angedockt

### Geplante Aufgabenregeln

- Rollen mit Zuweisungsrecht sind mindestens `Revier Admin`, `Paechter`, `Jagdleiter`, `Jagdaufseher` und fuer protokollbezogene Beschluesse auch `Schriftfuehrer`
- Aufgaben koennen an einzelne Mitgliedschaften, an Rollen im Revier oder an gemischte Zielgruppen adressiert werden
- typische Aufgaben sind Wasserungen oder Fuetterungen betreuen, Hochstaende reparieren, Hochstaende bauen, Hochstaende versetzen und Dienste bei Veranstaltungen
- Projektaufgaben tragen Start- und Enddatum, wiederkehrende Aufgaben eine Regel fuer Wiederholung und Faelligkeit

### Geplante Nachrichtenkanaele

- die fachliche Kernlogik speichert Nachrichten kanalneutral im eigenen Nachrichtenmodell
- WhatsApp und Telegram sind in der ersten Ausbaustufe nur ausgehende Kanal-Adapter fuer Benachrichtigungen oder Weiterleitungen
- eingehende Messenger-Nachrichten werden fuer v1 nicht als fuehrender Datenkanal eingeplant

## Datenhaltung

### Aktueller Stand

- `apps/api` verwendet derzeit einen In-Memory-Demo-Store
- `apps/web` besitzt bereits eine Drizzle-/Neon-Grundlage fuer `users`, `reviere`, `memberships`, `ansitz_sessions` und `fallwild_vorgaenge`
- lokale Migrationen und Seed-Skripte liegen unter `apps/web/drizzle*` und `apps/web/src/server/db`
- lokale Infrastruktur fuer PostgreSQL/PostGIS und MinIO ist vorbereitet

### Zielzustand

- persistente Tabellen fuer Benutzer, Reviere, Mitgliedschaften und Geraete
- persistente Tabellen fuer Ansitze, Fallwild, Reviereinrichtungen und Protokolle
- persistente Tabellen fuer Rollen, Aufgaben, Nachrichten und Zuordnungen
- getrennte Asset-Verwaltung fuer Fotos und Dokumente
- Audit-Log fuer sensible Aktionen

## Echtzeit und Offline

### Echtzeit

- v1 benoetigt keine verpflichtende Echtzeitverbindung
- aktive Ansitze werden per manueller Aktualisierung oder leichtem Polling nachgeladen
- Push-Benachrichtigungen informieren ueber relevante Ereignisse

### Offline

- Mobile-App speichert Kernaktionen lokal
- Operationen erhalten clientseitige IDs
- Synchronisierung erfolgt bei Rueckkehr der Verbindung
- Medien-Upload wird getrennt von Fachdaten behandelt

## Sicherheit und Betrieb

- Production unter `https://hege.app`
- Hosting in der EU
- Web und API v1 auf Vercel
- Datenbank auf Neon in EU-Region
- DNS ueber Cloudflare
- DSGVO-konforme Datenspeicherung
- serverseitige Rollen- und Tenant-Pruefung auf jeder fachlichen Ressource
- Rollenpruefung spaeter auch fuer Aufgabenvergabe, Nachrichtenerstellung und Kanalwahl
- Audit-Log fuer Freigaben, Exporte, Loeschungen und sensible Aenderungen
- Monitoring, strukturierte Logs und Healthchecks in der produktiven Stufe
- Karten- und Standortfunktionen werden auf Google Maps standardisiert, damit Web und Mobile dieselbe Kartenlogik nutzen

### Environment-Matrix

`hege` nutzt einen einzigen dauerhaften Neon-Zielzweig und getrennte lokale Infrastruktur:

- `Local`: lokales Next.js mit Docker-Postgres/PostGIS und MinIO; keine produktiven Neon-Zugangsdaten
- `Preview`: Vercel-Preview-Deployments ohne Zugriff auf die Produktionsdatenbank
- `Production`: produktive Vercel-Deployments mit dem geschützten Neon-Branch `main`

Die Datenbankzuordnung ist bewusst so geschnitten:

- `Lokale Entwicklung` → lokales Docker-Postgres/PostGIS
- `Vercel Preview` → keine dauerhaft verbundene Neon-Datenbank
- `Vercel Production` → geschützter Neon-Branch `main`

Damit gibt es genau eine dauerhafte Neon-Datenbankumgebung:

- `main`: isolierte und gegen Löschen, Archivieren sowie Zurücksetzen geschützte Produktionsdatenbank

Die bestehende Neon-Marketplace-Ressource wird ausschließlich mit `Vercel Production` verbunden. Sie verwaltet die Produktions-Verbindungsvariablen automatisch und hält Preview sowie Development von Produktionsdaten getrennt. Eine automatische `branch-per-preview`-Strategie ist deaktiviert; ein separater Preview-Branch wird nur bei konkretem späterem Bedarf eingerichtet.

Vor Änderungen oder Löschungen an Neon-Branches muss der tatsächlich verwendete Produktionsendpunkt in Vercel geprüft werden. Der Branch-Name allein ist kein Nachweis dafür, dass eine Umgebung unkritisch ist.

### Verbindliche Variablen

Fuer den Laufzeitpfad in `apps/web` und die Datenmigrationen gelten diese Regeln:

- `DATABASE_URL`: gepoolte Verbindungszeichenkette fuer die App-Laufzeit
- `DATABASE_URL_UNPOOLED`: direkte Verbindungszeichenkette fuer Migrationen, Seeds und Admin-Tools
- `HEGE_USE_DEMO_STORE`: nur fuer Local oder fruehe Preview-Fallbacks, nicht fuer die produktive Zielarchitektur
- `NEXT_PUBLIC_APP_URL`: oeffentliche App-URL je Umgebung
- `EXPO_PUBLIC_API_BASE_URL`: API-Basis fuer die Mobile-App

Lokales Docker-Postgres ist der reguläre Entwicklungs- und Testmodus und lauscht ausschließlich unter `127.0.0.1:15432`. Der Standardport `5432` bleibt für bereits vorhandene PostgreSQL-Installationen frei. Diese Trennung erlaubt schnelle lokale Arbeit ohne Cloud-Abhängigkeit, zusätzliche Neon-Branches oder kostenpflichtige EAS-Builds.

## Aktueller Repository-Stand

- gemeinsames Domain-Modell vorhanden
- API-Endpunkte fuer die Kernmodule in `apps/api` vorhanden
- erster Vercel-native Datenpfad fuer `me`, `ansitze` und `fallwild` in `apps/web` vorhanden
- Web- und Mobile-UIs als sichtbares Grundgeruest vorhanden
- Domain- und Env-Grundlage fuer `hege.app` vorhanden
- produktive Authentifizierung aktiv (E-Mail/Benutzername + PIN, Auth-Session, Revierkontext)
- persistente Drizzle-/Neon-Schicht fuer alle Kernmodule vorhanden und produktiv
- Design-System `@hege/tokens` und `@hege/icons` als eigene Packages in `packages/` etabliert

## Naechste technische Ausbaustufe

1. Rollen-, Aufgaben- und Nachrichtenmodell fachlich weiter ausarbeiten
2. Google-Maps-Karten auf echte Daten umstellen (Backoffice-Dashboard und Mobile-MapPreview)
3. Mobile-E2E-Strategie ueber den dokumentierten Geraete-Smoke hinaus festziehen
4. Android-Emulator-Smoke als Zweitpfad vorbereiten
5. PDF-Erzeugung weiter haerten
6. GIP-Bounding-Box mit dem tatsaechlichen Revier abgleichen
