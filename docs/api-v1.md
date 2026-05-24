# API v1

## Ziel

Die erste produktive API-Version soll Web und Mobile mit einem gemeinsamen, stabilen Fachmodell bedienen. Sie wird versioniert und strikt pro Revier gescoped.

Zielpfad fuer Production ist `https://hege.app/api/v1`.

## Grundprinzipien

- REST fuer Fachressourcen
- Vercel-native Route Handler unter `apps/web`
- Revier-Kontext auf jeder fachlichen Ressource
- serverseitige Rollenpruefung
- DTO-Validierung und konsistente Fehlerformate

## Authentifizierung und Kontext

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

`POST /api/v1/auth/login` akzeptiert:

- `identifier` als E-Mail oder Benutzername
- `pin` als vierstellige Zeichenkette
- optional `membershipId`

### Revier-Scope

- der Benutzer sieht nur Ressourcen seines Reviers
- bei Mehrfachmitgliedschaft muss der aktive Revier-Kontext gesetzt sein
- `membership_id` wird serverseitig gegen den eingeloggten Benutzer geprueft

## Ressourcen

### Dashboard

- `GET /api/v1/dashboard`

Liefert:

- aktive Ansitze
- Konflikte
- offene Wartungen
- heutige Fallwild-Vorgaenge
- unveroeffentlichte Protokolle
- letzte Benachrichtigungen

### Sitzungen und Protokolle

- `GET /api/v1/sitzungen`
- `POST /api/v1/sitzungen`
- `GET /api/v1/sitzungen/:id`
- `PATCH /api/v1/sitzungen/:id`
- `POST /api/v1/sitzungen/:id/versionen`
- `PATCH /api/v1/sitzungen/:id/freigeben`
- `GET /api/v1/sitzungen/:id/pdf`
- `GET /api/v1/sitzungen/export.csv`
- `GET /api/v1/protokolle`
- `GET /api/v1/protokolle/:id`

### Ansitze

- `GET /api/v1/ansitze`
- `GET /api/v1/ansitze/live`
- `POST /api/v1/ansitze`
- `PATCH /api/v1/ansitze/:id/beenden`
- `GET /api/v1/ansitze/export.csv`

### Reviereinrichtungen

- `GET /api/v1/reviereinrichtungen`
- `GET /api/v1/reviereinrichtungen/:id`
- `POST /api/v1/reviereinrichtungen/:id/kontrollen`
- `GET /api/v1/reviereinrichtungen/export.csv`

### Fallwild

- `GET /api/v1/fallwild`
- `POST /api/v1/fallwild`
- `GET /api/v1/fallwild/:id`
- `POST /api/v1/fallwild/:id/fotos`
- `GET /api/v1/fallwild/export.csv`
- `POST /api/v1/geo/fallwild-location`

#### `POST /api/v1/geo/fallwild-location`

Löst Koordinaten für die Fallwild-Erfassung auf. Die Route ist serverseitig, damit der Google-Server-Key nicht an Web oder Mobile ausgeliefert wird.

Request:

- `lat` als Dezimalgrad
- `lng` als Dezimalgrad
- `accuracyMeters` optional, vom Gerät gelieferte GPS-Genauigkeit in Metern

Antwort:

- `location.lat`
- `location.lng`
- `location.accuracyMeters`, falls im Request übergeben
- `location.label`, falls ableitbar
- `location.addressLabel`, falls Google Reverse Geocoding konfiguriert ist
- `location.placeId`, falls Google einen Treffer liefert
- `gemeinde`, falls aus der Adresse ableitbar
- `strasse`, falls aus der Adresse ableitbar
- `roadReference.roadName`, falls aus Google oder GIP ableitbar
- `roadReference.roadKilometer`, falls der GIP-Resolver einen Wert liefert
- `roadReference.source` als `gip`, `manual` oder `unavailable`
- `warnings` mit Hinweisen, wenn Google oder GIP nicht konfiguriert sind oder ein Mock-Provider aktiv ist

Konfiguration:

- `HEGE_GEO_PROVIDER=live|mock|disabled`
- `GOOGLE_MAPS_SERVER_API_KEY`
- `GOOGLE_MAPS_REGION=AT`
- `GOOGLE_MAPS_LANGUAGE=de`
- `GIP_ROAD_KILOMETER_ENDPOINT`
- `GIP_ROAD_KILOMETER_INDEX_PATH`
- `GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS=150`

GIP ist die fachliche Zielquelle für Straßenkilometer. Google liefert in v1 nur Adresse, Gemeinde und Straße. Der konfigurierte `GIP_ROAD_KILOMETER_ENDPOINT` bekommt `lat`, `lng`, optional `roadName` und optional `accuracyMeters`; akzeptiert werden einfache JSON-Felder wie `roadName`/`roadKilometer`, GeoJSON-ähnliche `FeatureCollection`-Antworten mit `properties` sowie ArcGIS-ähnliche `features[].attributes`. Alternativ kann `GIP_ROAD_KILOMETER_INDEX_PATH` auf einen kompakten JSON-Index aus GIP-OGD-BEPU-Punkten zeigen; ohne expliziten Index nutzt das Backend einen gebündelten regionalen Gänserndorf-Index. Der lokale Resolver wählt den nächsten Punkt innerhalb von `GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS`, erweitert den Radius bei schlechter GPS-Genauigkeit und bevorzugt passende Straßencodes. Österreichische Straßennamen werden für den Abgleich normalisiert, sodass etwa `Landesstraße 9`, `L 9` und `L9` als derselbe Straßenbezug gelten. Mit `HEGE_GEO_PROVIDER=mock` liefert der Endpunkt lokale Gänserndorf-Testdaten ohne externe Keys; diese Antworten sind über `warnings` als Testdaten gekennzeichnet und nicht für echte Production-Erfassung gedacht. Details stehen in [GIP-Straßenkilometer v1](./gip-strassenkilometer-v1.md).

#### `POST /api/v1/fallwild`

Akzeptiert zusätzlich zu Wildart, Status und Gemeinde Standort-Metadaten:

- `location.accuracyMeters`
- `location.source`
- `location.addressLabel`
- `location.placeId`
- `roadReference.roadName`
- `roadReference.roadKilometer`
- `roadReference.source`
- `roadReference.placeId`

#### `GET /api/v1/fallwild/:id`

Liefert einen vollstaendigen `FallwildVorgang` des aktiven Reviers inklusive `photos`.

Antwort:

- `200` mit `FallwildVorgang`
- `404` wenn der Vorgang im aktiven Revier nicht existiert
- `403` wenn die Rolle nicht lesen darf

#### `POST /api/v1/fallwild/:id/fotos`

Akzeptiert genau eine Datei pro Request als `multipart/form-data`.

Request:

- Feld `file` ist verpflichtend
- Feld `title` ist optional
- erlaubt sind `image/jpeg` und `image/png`
- maximal `10 MB` pro Datei
- maximal `3` Fotos pro Fallwild-Vorgang

Antwort:

- `201` mit `{ photo: PhotoAsset }`
- `400` fuer ungueltiges `multipart/form-data`, leere Datei oder falsche Felder
- `422` fuer Ueberschreitung des Foto-Limits oder fachlich ungueltige Uploads
- `403` fuer fehlende Rolle
- `404` fuer fehlenden oder fremden Fallwild-Vorgang
- `503` wenn Storage nicht konfiguriert ist

Rollen:

- `jaeger`
- `schriftfuehrer`
- `revier-admin`

Storage-Vertrag:

- lokal ueber MinIO mit `S3_*`-Variablen
- Preview und Production ueber dieselbe S3-kompatible Schicht gegen Cloudflare R2
- Upload-Key-Schema: `<tenantKey>/fallwild/<fallwildId>/<photoId>-<sanitized-file-name>`

### Dokumente und Benachrichtigungen

- `GET /api/v1/notifications`
- `GET /api/v1/documents/:id/download`

### Kontaktlisten

Kontaktlisten bilden Telefonnummern fuer Web und Mobile ab. Registrierte Mitglieder des aktiven Reviers werden automatisch aus `memberships + users` geliefert; freie Listen koennen zusaetzlich verlinkte Mitglieder oder externe Kontakte enthalten.

- `GET /api/v1/contact-lists`
- `POST /api/v1/contact-lists`
- `PATCH /api/v1/contact-lists/:listId`
- `DELETE /api/v1/contact-lists/:listId`
- `POST /api/v1/contact-lists/:listId/entries`
- `PATCH /api/v1/contact-lists/:listId/entries/:entryId`
- `DELETE /api/v1/contact-lists/:listId/entries/:entryId`

`GET /api/v1/contact-lists` liefert:

- `registeredMembers`: automatisch gepflegte Mitgliederliste mit Name, Telefonnummer, Rolle und Jagdzeichen
- `lists`: frei angelegte Kontaktlisten mit Eintraegen
- `canManage`: ob die aktuelle Rolle Listen und Eintraege bearbeiten darf

Ein Kontaktlisteneintrag hat entweder:

- `membershipId` fuer ein registriertes Mitglied im aktiven Revier; Name und Telefonnummer werden live aus dem Benutzerprofil gelesen
- oder freie Felder `name` und `phone` fuer externe Kontakte

Optionale Zusatzfelder je Eintrag:

- `revier`
- `funktion`
- `note`

Rollen:

- Lesen: alle authentifizierten Revierrollen
- Bearbeiten: `revier-admin`, `schriftfuehrer`, `platform-admin`

### Reviermeldungen und Aufgaben

Reviermeldungen und Aufgaben bilden den ersten fachlichen Arbeitsblock nach Fallwild/Queue v2. Beide Ressourcen sind pro aktivem Revier getrennt und nutzen die bestehende Mitgliedschaft aus der Auth-Session.

- `GET /api/v1/reviermeldungen`
- `POST /api/v1/reviermeldungen`
- `GET /api/v1/reviermeldungen/:id`
- `PATCH /api/v1/reviermeldungen/:id`
- `GET /api/v1/reviermeldungen/export.csv`
- `GET /api/v1/aufgaben`
- `POST /api/v1/aufgaben`
- `GET /api/v1/aufgaben/:id`
- `PATCH /api/v1/aufgaben/:id`

Reviermeldungen erfassen Kategorie, Status, Zeitpunkt, Titel, Beschreibung, optionalen Standort und optionalen Ressourcenbezug. Aufgaben erfassen Titel, Status, Priorität, Fälligkeit, Verantwortliche und optional einen Bezug zu Reviermeldung, Reviereinrichtung, Fallwild, Sitzung oder Beschluss.

Rollen für v1:

- `revier-admin`
- `schriftfuehrer`
- `jaeger`
- `ausgeher`

Normale Mitglieder sehen eigene oder ihnen zugewiesene Aufgaben. Revier-Admins und Schriftführer sehen die Revierliste.

### Mitglieder und Einladungen

Die Mitgliederverwaltung umfasst aktive Revierzugehörigkeiten und E-Mail-basierte Einladungen.

- `GET /api/v1/memberships`
- `GET /api/v1/memberships/:id`
- `PATCH /api/v1/memberships/:id`
- `DELETE /api/v1/memberships/:id`
- `POST /api/v1/memberships/invitations`
- `GET /api/v1/memberships/invitations`
- `DELETE /api/v1/memberships/invitations/:token`

`POST /api/v1/memberships/invitations` sendet eine Einladungs-E-Mail mit einem Token-Link. Einladungen laufen nach 7 Tagen ab. Der eingeladene Nutzer registriert sich über `POST /api/v1/public/register` mit dem Token und nimmt die Einladung damit gleichzeitig an.

`DELETE /api/v1/memberships/invitations/:token` widerruft eine ausstehende Einladung vor deren Annahme.

Rollen:

- Verwalten (Einladen, Entfernen, Rollen ändern): `revier-admin`, `platform-admin`
- Lesen: alle authentifizierten Revierrollen

### Öffentliche Registrierung

- `POST /api/v1/public/register`

Erstellt einen neuen Benutzer und nimmt gleichzeitig eine ausstehende Mitgliedseinladung an, wenn ein gültiger `invitationToken` übergeben wird. Die Route ist nicht authentifiziert.

Request:

- `email`
- `password`
- `name`
- `invitationToken` optional; wenn angegeben, wird die Einladung angenommen und die Mitgliedschaft sofort aktiviert

Antwort:

- `201` mit `{ user, membership }` wenn Token vorhanden und gültig
- `201` mit `{ user }` ohne Token (Mitgliedschaft muss separat hinzugefügt werden)
- `409` wenn E-Mail bereits registriert
- `422` wenn Token abgelaufen oder ungültig

### Revier-Setup und aktives Revier

- `GET /api/v1/reviere/active`
- `PATCH /api/v1/reviere/active`
- `PATCH /api/v1/reviere/active/setup`

`GET /api/v1/reviere/active` liefert das aktive Revier des eingeloggten Benutzers inklusive Mitgliedschaft und Rollenzuweisung.

`PATCH /api/v1/reviere/active` aktualisiert Basis-Metadaten des aktiven Reviers (Name, Beschreibung, Kontaktdaten).

`PATCH /api/v1/reviere/active/setup` führt den initialen Setup-Schritt eines neu erstellten Reviers durch: setzt Reviername, Kontaktdaten und initiale Mitgliederrollen. Wird beim Onboarding neuer Revier-Admins verwendet.

Rollen:

- `GET`: alle authentifizierten Revierrollen
- `PATCH /active` und `PATCH /active/setup`: `revier-admin`, `platform-admin`

### Rollen, Nachrichten und Veranstaltungen

Diese Ressourcen bleiben für die nächste Ausbaustufe vorgesehen und werden fachlich bereits mitgedacht.

- `GET /api/v1/roles`
- `GET /api/v1/messages`
- `POST /api/v1/messages`

## Rollenregeln

### Schriftfuehrer

- Sitzungen lesen und bearbeiten
- Protokollversionen erstellen
- keine Freigabe von Protokollen

### Revier Admin

- alle Rechte des Schriftfuehrers
- Freigabe von Protokollen
- Verwaltungsrechte auf Reviereinrichtungen

### Jaeger

- Ansitze lesen und eigene Ansitze aendern
- Fallwild erfassen und Fallwild-Fotos hochladen
- Reviereinrichtungen lesen
- veroeffentlichte Protokolle lesen

## Fehlerfaelle

Das Fehlerformat bleibt:

- `{ error: { code, message, status } }`

Wichtige Fehlercodes:

- `unauthorized`
- `forbidden`
- `not-found`
- `validation-error`
- `service-unavailable`

Die API muss mindestens diese Faelle sauber zurueckgeben:

- ungueltiger Revier-Kontext
- fehlende Rolle
- Ressource nicht gefunden
- Pflichtfelder fehlen
- Ansitz-Konfliktwarnung
- Medien-Upload fehlgeschlagen
- PDF noch nicht verfuegbar

## Datenmodell v1

### Tatsächlich vorhandene Drizzle-Tabellen

- `users`
- `reviere`
- `memberships`
- `member_invitations`
- `ansitz_sessions`
- `reviereinrichtungen`
- `reviereinrichtung_kontrollen`
- `reviereinrichtung_wartungen`
- `fallwild_vorgaenge`
- `media_assets`
- `sitzungen`
- `sitzung_teilnehmer`
- `protokoll_versionen`
- `beschluesse`
- `dokumente`
- `notifications`
- `aufgabe_assignees`
- `contact_lists`
- `contact_entries`

### Geplant, noch nicht umgesetzt

- `devices`
- `audit_logs`

## Aktueller Stand im Repository

Bereits produktiv ueber `apps/web` vorhanden:

- `auth`, `me`, `dashboard`, `ansitze`, `fallwild`, `reviereinrichtungen`, `protokolle`, `sitzungen`, `documents`, `reviermeldungen`, `aufgaben` und `contact-lists`
- Einladungsbasierte Mitgliederverwaltung unter `memberships/invitations` mit E-Mail-Token-Flow und 7-Tage-Ablauf
- Öffentliche Registrierungsroute (`public/register`) mit optionaler Einladungsannahme
- Revier-Setup-Route für das Onboarding neuer Revier-Admins
- CSV-Export für Sitzungen, Ansitze, Reviereinrichtungen und Reviermeldungen
- Drizzle-Migrationen für Auth, Ansitze, Fallwild, `media_assets`, Reviereinrichtungen, Sitzungen, Protokolle, Dokumente, Notifications, Mitgliedseinladungen, Reviereinrichtungswartungen, Aufgaben-Zuweisungen und Kontaktlisten
- S3-kompatible Storage-Schicht fuer lokales MinIO und spaeteres R2 inklusive best-effort Rollback bei Medien-Insert-Fehlern

`apps/api` bleibt als Referenz und Uebergangspfad im Repository, ist aber nicht die produktive Zielarchitektur.

## Naechste API-Themen

1. gehaerteten Medien-/Queue-v2-Pfad per iPhone-/iOS-Simulator-Smoke mit Testkonto und Test-Revier erneut abnehmen
2. Reviermeldungen und Aufgaben v1 auf dieselbe API-Linie heben
3. Rollen-, Nachrichten- und Veranstaltungsressourcen danach auf denselben Rechte- und Fehlervertrag setzen
