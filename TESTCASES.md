# Test Cases

## API Ansitze

### TC-API-ANSITZ-00: Lokale Datenbank bootstrapen

- `docker compose up -d postgres minio` ausfuehren
- `pnpm --filter @hege/web storage:init` ausfuehren
- `pnpm --filter @hege/web db:migrate` ausfuehren
- `pnpm --filter @hege/web db:seed` ausfuehren
- Erwartung: Migration laeuft ohne SQL-Fehler durch
- Erwartung: der MinIO-Bucket `hege-assets` existiert
- Erwartung: der Seed meldet erfolgreiche Anlage von `users`, `reviere`, `memberships`, `ansitz_sessions`, `fallwild_vorgaenge` und `media_assets`

### TC-API-ANSITZ-00B: Neon `development` fuer Preview bootstrapen

- `pnpm --filter @hege/web db:migrate` gegen den Neon-Branch `development` ausfuehren
- `pnpm --filter @hege/web db:seed` gegen den Neon-Branch `development` ausfuehren
- Preview-URL oeffnen und `GET /api/v1/me`, `GET /api/v1/ansitze` sowie `/ansitze` pruefen
- Erwartung: die beiden API-Endpunkte antworten mit `200`
- Erwartung: die Seite `/ansitze` rendert ohne Serverfehler und zeigt aktive Ansitze

### TC-API-ANSITZ-00C: Neon `main` fuer Production bootstrapen

- `pnpm --filter @hege/web db:migrate` gegen den Neon-Branch `main` ausfuehren
- `pnpm --filter @hege/web db:seed` gegen den Neon-Branch `main` ausfuehren
- Production-URL oeffnen und `GET /api/v1/me`, `GET /api/v1/ansitze` sowie `/ansitze` pruefen
- Erwartung: die beiden API-Endpunkte antworten mit `200`
- Erwartung: die Seite `/ansitze` rendert ohne Serverfehler und zeigt aktive Ansitze
- Erwartung: Login via Kennung plus PIN und `GET /api/v1/fallwild` bleiben auch bei einem hinterherhaengenden Schema ohne `500` nutzbar

### TC-API-ANSITZ-01: Authentifizierter Kontext liefert `me`

- Web-App lokal starten
- `GET /api/v1/me` mit authentifizierter Session aufrufen
- Erwartung: Benutzer, Membership und Revier werden als JSON zurueckgegeben

### TC-API-ANSITZ-02: Aktive Ansitze lesen

- Web-App lokal starten
- `GET /api/v1/ansitze/live` aufrufen
- Erwartung: nur aktive Ansitze des Dev-Reviers werden als JSON zurueckgegeben

### TC-API-AUTH-01: Login liefert Session und Cookies

- Web-App lokal starten
- `POST /api/v1/auth/login` mit gueltiger Kennung und vierstelliger PIN aufrufen
- Erwartung: die Antwort enthaelt Benutzer-, Membership- und Revierkontext
- Erwartung: `access`- und `refresh`-Cookie werden gesetzt
- Erwartung: Username-Login funktioniert auch dann, wenn `users.username` in einer Legacy-DB noch aus der E-Mail abgeleitet werden muss

### TC-API-AUTH-02: Refresh erneuert die Session

- Web-App lokal starten
- `POST /api/v1/auth/refresh` mit gueltigem Refresh-Token aufrufen
- Erwartung: die Antwort enthaelt eine neue Session mit frischen Tokens
- Erwartung: der Revierkontext bleibt erhalten

### TC-API-AUTH-03: `me` liefert den aktiven Kontext

- Web-App lokal starten
- `GET /api/v1/me` mit authentifizierter Session aufrufen
- Erwartung: Benutzer, Membership, Revier und aktive Revier-ID werden zurueckgegeben

### TC-API-AUTH-04: Ungueltige Bodies liefern `400`

- Web-App lokal starten
- `POST /api/v1/auth/login` und `POST /api/v1/auth/refresh` mit ungueltigem JSON aufrufen
- Erwartung: die Endpunkte antworten mit `400`
- Erwartung: das Fehlerformat folgt `{ error: { code, message, status } }`

### TC-API-AUTH-05: Logout loescht Session-Cookies

- Web-App lokal starten
- `POST /api/v1/auth/logout` mit bestehender Session ausloesen
- Erwartung: der Endpunkt antwortet mit `303` auf `/login`
- Erwartung: `hege_access_token` und `hege_refresh_token` werden mit `Max-Age=0` geloescht

### TC-SRV-AUTH-01: Safe Post-Auth Path wird normalisiert

- Server-Unittests ausfuehren
- Erwartung: `toSafePostAuthPath("/login")` faellt auf `/app` zurueck
- Erwartung: `toSafePostAuthPath("/registrieren")` faellt auf `/app` zurueck
- Erwartung: gueltige Ziele wie `/app/setup` bleiben erhalten

### TC-SRV-AUTH-02: Auth-Gates lenken in App und Setup

- Server-Unittests ausfuehren
- Erwartung: unauthentifizierte Seitenaufrufe gehen auf `/login?next=...`
- Erwartung: eingeloggte Nutzer landen auf `/app`
- Erwartung: setup-pflichtige Nutzer landen auf `/app/setup`

## API Fallwild

### TC-API-FALLWILD-01: Fallwildliste lesen

- Web-App lokal starten
- `GET /api/v1/fallwild` aufrufen
- Erwartung: die Antwort enthaelt die Fallwild-Vorgaenge des aktiven Reviers
- Erwartung: jeder Eintrag liefert Standort, Wildart, Bergungsstatus und Erfassungszeitpunkt
- Erwartung: fehlt `media_assets` in einer Legacy-DB noch, antwortet der Endpunkt weiter mit leerem `photos`-Array statt `500`
- Erwartung: fehlt die Storage-Public-URL fuer vorhandene Fotos, antwortet der Endpunkt ebenfalls mit leerem `photos`-Array statt `500`

### TC-API-FALLWILD-02: Fallwildvorgang anlegen

- Web-App lokal mit aktiver DB starten
- `POST /api/v1/fallwild` mit gueltigem JSON-Body senden
- Erwartung: der Endpunkt antwortet mit `201`
- Erwartung: der neue Vorgang erscheint anschliessend in `GET /api/v1/fallwild`

### TC-API-FALLWILD-03: CSV-Export abrufen

- Web-App lokal starten
- `GET /api/v1/fallwild/export.csv` aufrufen
- Erwartung: der Endpunkt antwortet mit `200`
- Erwartung: `content-type` ist `text/csv`
- Erwartung: die CSV enthaelt mindestens Kopfzeile sowie die gespeicherten Fallwild-Vorgaenge

### TC-API-FALLWILD-04: Fallwild-Detail liefert Fotos

- Web-App lokal mit authentifizierter Session starten
- `GET /api/v1/fallwild/:id` aufrufen
- Erwartung: die Antwort enthaelt einen vollstaendigen `FallwildVorgang`
- Erwartung: `photos` ist vorhanden und enthaelt vorhandene Medien des aktiven Reviers

### TC-API-FALLWILD-05: Foto-Upload fuer Fallwild

- Web-App lokal mit `postgres` und `minio` starten
- `POST /api/v1/fallwild/:id/fotos` als `multipart/form-data` mit einer JPEG- oder PNG-Datei senden
- Erwartung: der Endpunkt antwortet mit `201`
- Erwartung: `photo.url` zeigt auf den konfigurierten S3-/MinIO-Pfad
- Erwartung: ein anschliessendes `GET /api/v1/fallwild/:id` enthaelt das hochgeladene Foto in `photos`

### TC-API-FALLWILD-06: Foto-Upload validiert Typ, Groesse und Storage

- Web-App lokal starten
- `POST /api/v1/fallwild/:id/fotos` mit falschem `content-type`, zu grosser Datei oder ohne Storage-Konfiguration pruefen
- Erwartung: ungueltiges `multipart/form-data` antwortet mit `400`
- Erwartung: fachliche Limitverletzungen antworten mit `422`
- Erwartung: fehlende Storage-Konfiguration antwortet mit `503`
- Erwartung: fehlt `media_assets` in einer Legacy-DB noch, antwortet der Endpunkt mit `503` statt `500`

### TC-API-FALLWILD-07: Fallwild inklusive Fotos sicher bereinigen

- Mit `schriftfuehrer`- oder `revier-admin`-Session `DELETE /api/v1/fallwild/:id` aufrufen
- Erwartung: Storage-Objekte werden vor `media_assets` und `fallwild_vorgaenge` entfernt
- Erwartung: die Antwort enthält `{ deleted: true, id }`
- Erwartung: eine Feldrolle erhält `403`
- Erwartung: eine ID aus einem fremden Revier verhält sich wie nicht gefunden
- Erwartung: bei Storage-Fehler bleibt der Datenbankeintrag erhalten und die Route antwortet mit `503`

## API Dashboard, Reviereinrichtungen, Protokolle und Sitzungen

### TC-API-DASH-01: Dashboard-API liefert den Snapshot

- Web-App lokal mit authentifizierter Session starten
- `GET /api/v1/dashboard` aufrufen
- Erwartung: die Antwort enthaelt `overview`, `activeAnsitze` und `recentFallwild`
- Erwartung: der Snapshot basiert auf dem aktiven Revier aus dem Auth-Kontext
- Erwartung: ein nicht authentifizierter Aufruf antwortet mit `401`

### TC-API-REVIER-01: Reviereinrichtungen lesen

- Web-App lokal starten
- `GET /api/v1/reviereinrichtungen` aufrufen
- Erwartung: die Antwort enthaelt die Reviereinrichtungen des aktiven Reviers
- Erwartung: Status, letzte Kontrolle und offene Wartungen sind vorhanden

### TC-API-REVIER-02: Reviereinrichtung anlegen

- Mit einer `jaeger`-, `schriftfuehrer`-, `revier-admin`- oder `platform-admin`-Session `POST /api/v1/reviereinrichtungen` aufrufen
- Typ, Name, Standort, Zustand und optional Ausrichtung sowie typabhängige Details senden
- Erwartung: die Route antwortet mit `201` und legt den Datensatz im aktiven Revier an
- Erwartung: Ausrichtung außerhalb `0 <= Grad < 360`, ungültige Koordinaten oder unbekannte Typen liefern `400`
- Erwartung: Rollen ohne Erfassungsrecht erhalten `403`

### TC-API-REVIER-03: Reviereinrichtungsfoto hochladen

- Eine vorhandene Reviereinrichtung des aktiven Reviers verwenden
- `POST /api/v1/reviereinrichtungen/:id/fotos` als `multipart/form-data` mit einem JPEG oder PNG aufrufen
- Erwartung: die Route antwortet mit `201` und `{ photo }`
- Erwartung: höchstens drei Fotos mit jeweils höchstens `10 MB` werden akzeptiert
- Erwartung: fremde IDs liefern `404`, ungültige Dateien `400`/`422` und fehlendes Storage `503`

### TC-API-REVIER-04: Wetter und Sonnenzeiten für einen Kartenpunkt

- Mit einer leseberechtigten Session `GET /api/v1/weather/point?lat=48.33597&lng=16.732315` aufrufen
- Erwartung: Windrichtung, Windstärke, Böen, Temperatur und Niederschlag werden aus dem GeoSphere-Nowcast geliefert
- Erwartung: Dämmerung, Sonnenaufgang, Sonnenuntergang und Abenddämmerung sind in jedem erfolgreichen Response vorhanden
- Erwartung: bei Ausfall des Wetterproviders bleibt die Antwort mit `weatherAvailable: false` und Sonnenzeiten nutzbar
- Erwartung: fehlende oder ungültige Koordinaten liefern `400`

### TC-API-PROT-01: Freigegebene Protokolle lesen

- Web-App lokal starten
- `GET /api/v1/protokolle` aufrufen
- Erwartung: nur veroeffentlichte Protokolle werden zurueckgegeben
- Erwartung: die Liste enthaelt Download-Referenz und Beschlusszaehler

### TC-API-PROT-02: Protokolldetail lesen

- Web-App lokal starten
- `GET /api/v1/protokolle/:id` mit einem freigegebenen Protokoll aufrufen
- Erwartung: Versionen, Beschluesse, Teilnehmer und Download-Referenz werden zurueckgegeben

### TC-API-SITZ-01: Sitzungen auflisten

- Web-App lokal starten
- `GET /api/v1/sitzungen` aufrufen
- Erwartung: Entwuerfe und freigegebene Sitzungen werden aufgelistet

### TC-API-SITZ-02: Sitzung anlegen

- Web-App mit authentifizierter `schriftfuehrer`- oder `revier-admin`-Session starten
- `POST /api/v1/sitzungen` mit gueltigem JSON aufrufen
- Erwartung: der Endpunkt antwortet mit `201`
- Erwartung: die neue Sitzung erscheint anschliessend in `GET /api/v1/sitzungen`

### TC-API-SITZ-03: Version anlegen und freigeben

- Web-App mit authentifizierter Session starten
- `POST /api/v1/sitzungen/:id/versionen` mit gueltigem JSON aufrufen
- Erwartung: der Endpunkt antwortet mit `201`
- `PATCH /api/v1/sitzungen/:id/freigeben` mit `revier-admin`-Session aufrufen
- Erwartung: die Sitzung wird freigegeben und ein Dokument kann per `GET /api/v1/sitzungen/:id/pdf` gelesen werden

### TC-API-DOC-01: Dokument-Download bereitstellen

- Web-App lokal starten
- `GET /api/v1/documents/:id/download` aufrufen
- Erwartung: der Endpunkt antwortet mit einem Download-Dokument oder `404`
- Erwartung: veroeffentlichte Protokolle verweisen auf diesen Download

## Automatisierte Web-Tests

### TC-AUTO-WEB-01: Unit- und Integrationstests fuer Domain und Web

- `pnpm --filter @hege/domain build` ausfuehren
- `pnpm --filter @hege/web test` ausfuehren
- `pnpm --filter @hege/web typecheck` ausfuehren
- `pnpm --filter @hege/web build` ausfuehren
- Erwartung: Domain-Build sowie Web-Test-, Typecheck- und Build-Lauf laufen gruen durch
- Erwartung: Route Handler, Services und Query-Schicht in `apps/web` werden per Vitest validiert

### TC-AUTO-WEB-02: Playwright fuer Auth und Sitzungen

- `pnpm test:e2e -- apps/web/e2e/auth.spec.ts apps/web/e2e/sitzungen.spec.ts` ausfuehren
- Erwartung: Login, Logout und Redirect auf `/login` laufen im Browser durch
- Erwartung: `jaeger` wird von `/sitzungen` auf `/` umgeleitet
- Erwartung: `schriftfuehrer` kann einen Entwurf anlegen und eine Version speichern
- Erwartung: `revier-admin` kann freigeben und das PDF laden

### TC-AUTO-WEB-03: Playwright Visual und Mutationen fuer Ansitz und Fallwild

- `pnpm test:e2e -- apps/web/e2e/ansitze.spec.ts apps/web/e2e/fallwild.spec.ts` ausfuehren
- Erwartung: Desktop- und Mobile-Viewport stimmen mit den Snapshots ueberein
- Erwartung: Ansitz-Start/Ende, Fallwild-Erfassung und CSV-Export laufen grün durch

### TC-AUTO-WEB-04: Playwright fuer Leitstand, Reviereinrichtungen und Protokolle

- `pnpm test:e2e -- apps/web/e2e/leitstand-protokolle.spec.ts` ausfuehren
- Erwartung: Dashboard, Reviereinrichtungen, Protokoll-Liste und Protokoll-Detail laufen auf Desktop und Mobile-Viewport durch
- Erwartung: der Dokument-Download liefert den erwarteten PDF-Dateinamen
- Erwartung: es gibt keinen Horizontal-Overflow im Mobile-Viewport

### TC-AUTO-MOBILE-01: Maestro-Core-Smoke für eine Feldrolle

- iOS-Simulator mit installierter App starten
- `HEGE_SMOKE_IDENTIFIER` und `HEGE_SMOKE_PIN` nur in der Umgebung setzen
- `pnpm mobile:e2e:ios:core` ausführen
- Erwartung: Build-Tag, Login, Dashboard, Mehr-Navigation und Kontakte sind sichtbar
- Erwartung: `Listen und Kontakte` ist für die Feldrolle nicht sichtbar

### TC-AUTO-MOBILE-02: Maestro-Rollen-Smoke

- `pnpm mobile:e2e:ios:roles` einmal als Schriftführung und einmal als Revier-Admin ausführen
- Erwartung: `Listen und Kontakte` und `Liste anlegen` sind sichtbar
- Erwartung: keine Zugangsdaten sind in den Flow-Dateien hinterlegt

### TC-AUTO-MOBILE-03: Maestro-Offline-Warteschlange

- angemeldeten iOS-Simulator mit leerer Warteschlange und installiertem aktuellen App-Stand starten
- `pnpm mobile:e2e:ios:queue` ausführen
- Erwartung: die Fixture überschreibt keine vorhandenen Vormerkungen
- Erwartung: `Offline-Vormerkungen` und `Jetzt senden` sind im Modus `Erfassen` sichtbar
- Erwartung: die Fixture wird nach dem Lauf aus AsyncStorage entfernt
- Ergänzend muss der Unit-Test für den App-Lebenszyklus belegen, dass `active` einen sofortigen Retry mit `retryFailed: true` auslöst

### TC-AUTO-MOBILE-04: Gespeicherte iPhone-Sitzung im Smoke-Harness

- gekoppeltes und auf iOS-Ebene entsperrtes Testgerät mit gespeicherter Sitzung verwenden
- `HEGE_IOS_DEVICE_ID=<uuid> pnpm mobile:smoke:ios:session` ausführen
- Erwartung: der Harness startet die Sitzung ohne manuelle App-Face-ID-Interaktion
- Erwartung: Sitzungstoken und übrige AsyncStorage-Werte bleiben unverändert
- Erwartung: die ursprüngliche Face-ID-Einstellung wird auch nach einem Fehler wiederhergestellt
- mit bewusst vorhandener Queue zusätzlich `HEGE_EXPECT_QUEUE_SYNC=1` setzen und eine anschließend leere Warteschlange verlangen

### TC-AUTO-WEB-05: Preview-Smoke gegen die PR-URL

- `pnpm --filter @hege/web smoke:preview -- <preview-url>` ausfuehren
- Erwartung: `/`, `/login`, `/registrieren?plan=starter`, `POST /api/v1/auth/login`, `/api/v1/me` und der authentifizierte Redirect von `/login` auf `/app` laufen gruen
- Erwartung: `/app`, `/api/v1/dashboard`, `/api/v1/reviereinrichtungen`, `/api/v1/protokolle`, `/api/v1/protokolle/:id` und `/api/v1/sitzungen` laufen mit authentifizierter Session gruen
- Erwartung: der Preview-Smoke findet ein veroeffentlichtes Protokoll und prueft den PDF-Download inklusive Dateinamen

### TC-AUTO-WEB-06: Browser-Contracts fuer Public Web und Redirects

- `pnpm --filter @hege/web test` ausfuehren
- Erwartung: Public-Landing, Pricing-CTAs, `/login`-Redirect und die Auth-Guards fuer `/app` und `/app/setup` sind abgesichert

## Web Ansitze

### TC-WEB-ANSITZ-01: Ansitzseite liest aus der Server-Schicht

- Web-App lokal starten
- Seite `/ansitze` oeffnen
- Erwartung: aktive Ansitze werden in der Tabelle angezeigt
- Erwartung: die Seite rendert ohne direkte Abhaengigkeit auf `demoData` in der UI
- Erwartung: mit laufender DB kommen die Daten aus `ansitz_sessions`

### TC-WEB-ANSITZ-02: Leerer Zustand

- Datenquelle temporaer ohne aktive Ansitze ausfuehren
- Seite `/ansitze` oeffnen
- Erwartung: die Tabelle zeigt `Keine aktiven Ansitze vorhanden.`

### TC-WEB-ANSITZ-03: Read-only Fallback ohne DB

- `HEGE_USE_DEMO_STORE=true` setzen
- Web-App lokal starten
- `/api/v1/me`, `/api/v1/ansitze/live` und `/ansitze` aufrufen
- Erwartung: API und Seite bleiben lesbar, obwohl keine Datenbank aktiv ist

### TC-WEB-ANSITZ-04: Ansitz im Web starten

- Web-App mit aktiver DB starten
- Seite `/ansitze` oeffnen
- Formular `Neuer Ansitz` mit Standortname, Koordinaten und optionaler Notiz ausfuellen
- `Ansitz starten` ausloesen
- Erwartung: `POST /api/v1/ansitze` antwortet mit `201`
- Erwartung: die Erfolgsmeldung erscheint
- Erwartung: die Tabelle und der aktive Zaehler werden nach dem Refresh aktualisiert

### TC-WEB-ANSITZ-05: Ansitz im Web beenden

- Web-App mit mindestens einem aktiven Ansitz starten
- Seite `/ansitze` oeffnen
- Bei einem aktiven Eintrag `Beenden` ausloesen
- Erwartung: `PATCH /api/v1/ansitze/:id/beenden` antwortet mit `200`
- Erwartung: die Erfolgsmeldung erscheint
- Erwartung: der beendete Eintrag verschwindet nach dem Refresh aus der aktiven Tabelle

## Web Dashboard

### TC-WEB-DASH-01: Dashboard liest aus der Server-Schicht

- Web-App lokal starten
- Seite `/` oeffnen
- Erwartung: der Leitstand zeigt Reviername, aktive Ansitze, offene Wartungen, heutige Fallwild-Bergungen und Entwuerfe aus der Server-Schicht
- Erwartung: es werden keine `demoData`-Werte direkt in der Page verwendet
- Erwartung: die Kacheln und Zeitachsen rendern ohne Serverfehler

### TC-WEB-AUTH-01: Loginseite setzt die Session

- Web-App lokal starten
- Seite `/login` oeffnen
- Gueltige Kennung wie `ostheimer` oder `andreas@ostheimer.at` plus vierstellige PIN eingeben und absenden
- Erwartung: die App leitet auf das Dashboard weiter
- Erwartung: Navigation und Revierkontext werden nach dem Login angezeigt
- Erwartung: Placeholder und Hilfetexte zeigen keine konkreten Seed-Zugangsdaten

### TC-WEB-AUTH-02: Logout bringt zurueck zur Loginseite

- Web-App lokal starten und mit Demo-Zugangsdaten anmelden
- In der Sidebar `Abmelden` ausloesen
- Erwartung: die App leitet auf `/login`
- Erwartung: ein erneuter Aufruf von `/` verlangt wieder eine Anmeldung

## Web Public Landing

### TC-WEB-PUBLIC-01: Oeffentliche Landingseite fuer Gaeste

- Web-App lokal starten
- Seite `/` ohne Session oeffnen
- Erwartung: die Public Landing wird angezeigt
- Erwartung: die Hero- und Pricing-Texte sind sichtbar
- Erwartung: keine internen Backoffice-Daten erscheinen fuer Gaeste

### TC-WEB-PUBLIC-02: Pricing-CTAs zeigen auf die richtigen Ziele

- Web-App lokal starten
- Seite `/` ohne Session oeffnen
- Erwartung: `Anmelden` zeigt auf `/login`
- Erwartung: `Starter anlegen` zeigt auf `/registrieren?plan=starter`
- Erwartung: `Revier starten` zeigt auf `/registrieren?plan=revier`
- Erwartung: `Kontakt aufnehmen` zeigt auf `mailto:info@hege.app?subject=hege%20Organisation`

## Web App Entry

### TC-WEB-APP-01: Login mit bestehender Session landet im App-Block

- Web-App lokal starten
- gueltige Session ueber die API oder den Login-Flow setzen
- Seite `/login` oeffnen
- Erwartung: die App leitet auf `/app`

### TC-WEB-APP-02: Setup-Abschluss fuehrt in den App-Block

- Web-App mit setup-pflichtiger Session starten
- Seite `/login` oeffnen
- Erwartung: die App leitet auf `/app/setup`

### TC-WEB-APP-03: App-Routen lenken Gaeste zur Loginseite

- Web-App lokal starten
- Seite `/app/sitzungen` ohne Session oeffnen
- Erwartung: die App leitet auf `/login?next=/app/sitzungen`

### TC-WEB-REVIER-01: Reviereinrichtungen lesen im Web

- Web-App lokal starten
- Seite `/reviereinrichtungen` oeffnen
- Erwartung: die Liste kommt aus der Server-Schicht
- Erwartung: Status, letzte Kontrolle und offene Wartungen sind sichtbar

### TC-WEB-PROT-01: Protokolle lesen im Web

- Web-App lokal starten
- Seite `/protokolle` oeffnen
- Erwartung: nur freigegebene Protokolle werden angezeigt
- Erwartung: die Detailseite `/protokolle/:id` zeigt Versionen, Beschluesse und Download-Referenz

### TC-WEB-SITZ-01: Sitzungen im Web lesen und anlegen

- Web-App lokal starten
- Seite `/sitzungen` oeffnen
- Erwartung: Entwuerfe und freigegebene Sitzungen werden angezeigt
- Erwartung: ein neuer Entwurf kann angelegt werden
- Erwartung: die Detailseite zeigt Stammdaten, Versionen und Freigabe-Grundlage

## Web Fallwild

### TC-WEB-FALLWILD-01: Fallwildseite liest aus der Server-Schicht

- Web-App lokal starten
- Seite `/fallwild` oeffnen
- Erwartung: vorhandene Fallwild-Vorgaenge werden ohne direkte UI-Abhaengigkeit auf `demoData` angezeigt
- Erwartung: Standort, Wildart, Status und Zeitpunkt werden lesbar formatiert

### TC-WEB-FALLWILD-02: Fallwild im Web erfassen

- Web-App mit aktiver DB starten
- Seite `/fallwild` oeffnen
- Formular mit Gemeinde, Lagebezeichnung, Koordinaten, Wildart und Status ausfuellen
- `Fallwild erfassen` ausloesen
- Erwartung: die Erfolgsmeldung erscheint
- Erwartung: der neue Eintrag erscheint nach dem Refresh in der Liste
- Erwartung: der API-Aufruf `POST /api/v1/fallwild` antwortet mit `201`

### TC-WEB-FALLWILD-03: CSV-Export aus dem Web

- Web-App lokal starten
- Seite `/fallwild` oeffnen
- `CSV exportieren` ausloesen
- Erwartung: der Browser laedt eine CSV ueber `/api/v1/fallwild/export.csv`
- Erwartung: die exportierte Datei enthaelt die sichtbaren Fallwild-Eintraege

### TC-WEB-FALLWILD-04: Mobile Browserbreite bleibt bedienbar

- Web-App lokal starten
- Seite `/fallwild` in schmaler Browserbreite oeffnen
- Erwartung: Formular, Liste und Aktionsleiste bleiben ohne horizontales Chaos bedienbar
- Erwartung: kein Hydration- oder Konsolenfehler tritt auf

## Mobile Dashboard

### TC-MOB-DASH-01: Heute im Revier nutzt echte API

- App oeffnen
- Startseite `Heute im Revier` aufrufen
- Erwartung: Reviername und aktive Ansitze werden aus `GET /api/v1/me` und `GET /api/v1/ansitze/live` geladen
- Erwartung: die Karte zeigt echte Daten aus der API statt `demoData`
- Erwartung: manueller Refresh aktualisiert die Werte
- Erwartung: die Offline-Warteschlange bleibt sichtbar

### TC-MOB-AUTH-01: Session-Restore und Login

- App oeffnen
- Falls bereits eine Session gespeichert ist, App neu starten
- Erwartung: die Session wird aus dem Storage wiederhergestellt
- Erwartung: nicht eingeloggte User landen auf der Loginseite
- Erwartung: ein erfolgreicher Login nutzt `POST /api/v1/auth/login` mit Kennung plus PIN und speichert die Session lokal

### TC-MOB-DASH-02: Dashboard bei API-Fehler

- API-URL auf einen nicht erreichbaren Host setzen
- Startseite `Heute im Revier` oeffnen
- Erwartung: Lade- oder Fehlerzustand wird angezeigt
- Erwartung: die App bleibt bedienbar

## Mobile Fallwild

### TC-MOB-FALLWILD-01: Fallwildliste laden

- App oeffnen
- Tab `Fallwild` oeffnen
- Erwartung: die Liste wird per `GET /api/v1/fallwild` geladen
- Erwartung: Eintraege oder leerer Zustand werden sauber dargestellt

### TC-MOB-FALLWILD-02: Manuelle Aktualisierung

- Tab `Fallwild` oeffnen
- Pull-to-Refresh ausloesen (der `Aktualisieren`-Button wurde in PR #172 entfernt)
- Erwartung: die Liste wird neu geladen, ohne dass die App abstuerzt

### TC-MOB-FALLWILD-03: API nicht erreichbar

- API-URL auf einen nicht erreichbaren Host setzen
- Tab `Fallwild` oeffnen
- Erwartung: ein Fehlerzustand wird angezeigt
- Erwartung: die Offline-Warteschlange bleibt sichtbar

### TC-MOB-FALLWILD-04: Fallwildformular mit Queue-Fallback

- Tab `Fallwild` oeffnen
- Formular mit Koordinaten, Gemeinde, Lage, Wildart und Status ausfuellen
- `Fallwild speichern` ausloesen
- Erwartung: online wird der Vorgang direkt an `POST /api/v1/fallwild` gesendet
- Erwartung: ohne Verbindung wird der Vorgang in die Offline-Queue gelegt und im Dashboard sichtbar

### TC-MOB-FALLWILD-05: Fallwild mit Fotos online erfassen

- Tab `Fallwild` oeffnen
- bis zu drei Fotos aus der Bibliothek auswaehlen
- Formular absenden
- Erwartung: zuerst wird `POST /api/v1/fallwild` ausgefuehrt
- Erwartung: danach laufen die Foto-Uploads sequentiell ueber `POST /api/v1/fallwild/:id/fotos`
- Erwartung: der neue Vorgang erscheint mit Fotoanzahl in der Liste

### TC-MOB-FALLWILD-06: Fallwild mit Fotos offline erfassen und spaeter synchronisieren

- Netzwerk deaktivieren
- Tab `Fallwild` oeffnen und einen Vorgang mit Fotos absenden
- Erwartung: der Create-Eintrag landet in der Queue
- Netzwerk wieder aktivieren und `Queue sync` ausloesen
- Erwartung: nach erfolgreichem Create entstehen nachgelagerte Foto-Upload-Eintraege
- Erwartung: erfolgreiche Eintraege verschwinden, `failed` oder `conflict` bleiben sichtbar

## Mobile Reviereinrichtungen und Protokolle

### TC-MOB-REV-01: Reviereinrichtungen laden

- App oeffnen
- Tab `Einrichtungen` oeffnen
- Erwartung: die Liste wird per `GET /api/v1/reviereinrichtungen` geladen
- Erwartung: Status und letzte Kontrolle werden angezeigt

### TC-MOB-REV-02: Reviereinrichtung mit GPS und Ausrichtung erfassen

- `Mehr` → `Reviereinrichtungen` öffnen und im Modus `Erfassen` einen Ansitztyp wählen
- Name eingeben, iPhone-GPS übernehmen und optional Ausrichtung per Kompass oder Gradzahl setzen
- Ansitzdetails, Beschreibung und bis zu drei Fotos ergänzen
- Erwartung: nach `Reviereinrichtung speichern` erscheint eine eindeutige Erfolgsmeldung
- Erwartung: die App wechselt zu `Karte & Bestand`; das leere Formular bleibt nicht unter der Erfolgsmeldung stehen

### TC-MOB-REV-03: Reviereinrichtung auf Karte und in der Suche finden

- Eine neue Einrichtung speichern oder einen vorhandenen Seed verwenden
- Im Bestand zwischen `Karte` und `Liste` wechseln und nach dem Namen suchen
- Erwartung: der Karten-Pin und genau die gefilterte Listenkarte sind sichtbar
- Erwartung: Pull-to-Refresh lädt Serverdaten neu; ein separater Aktualisieren-Button ist nicht vorhanden

### TC-MOB-REV-04: Jagdliches Wetter an einer Ansitzeinrichtung

- In Karte oder Liste eine Ansitzeinrichtung öffnen
- Erwartung: Windrichtung und Windstärke sowie, soweit verfügbar, Böen, Temperatur und Niederschlag sind sichtbar
- Erwartung: Dämmerung, Sonnenaufgang, Sonnenuntergang und Abenddämmerung werden in Ortszeit angezeigt
- Erwartung: die Quelle `GeoSphere Austria` ist ausgewiesen

### TC-MOB-REV-05: Reviereinrichtung offline vormerken und synchronisieren

- Netzwerk deaktivieren und eine Einrichtung mit optionalen Fotos speichern
- Erwartung: der Create-Eintrag erscheint in `Offline-Vormerkungen` und als vorgemerkter Bestand/Karten-Pin
- Netzwerk aktivieren oder die App erneut in den Vordergrund bringen
- Erwartung: Create wird automatisch übertragen; Foto-Uploads folgen erst mit der Server-ID
- Erwartung: nach vollständigem Erfolg verschwinden Queue-Eintrag und veraltete Vormerkungs-Meldung
- Erwartung: `failed`/`conflict` bleiben mit `Erneut versuchen` und `Verwerfen` sichtbar

### TC-MOB-REV-06: Automatisierte iOS-Smokes

- `pnpm mobile:e2e:ios:reviereinrichtungen` mit lokalem API-Server und Testkonto ausführen
- Erwartung: Login, simuliertes GPS, Speichern, Karten-Pin, Suche, Wetter und Sonnenzeiten laufen grün
- Bei leerer echter Queue `pnpm mobile:e2e:ios:reviereinrichtungen:queue` ausführen
- Erwartung: die persistierte Fixture `Offline Testkanzel` und ihre Konfliktmeldung sind sichtbar; die Fixture wird danach entfernt

### TC-MOB-PROT-01: Protokolle lesen

- App oeffnen
- Tab `Protokolle` oeffnen
- Erwartung: freigegebene Protokolle werden geladen
- Erwartung: Detailinformationen und Download-Referenz sind sichtbar

## Mobile Ansitze

### TC-MOB-ANSITZ-01: Ansitzliste laden

- App oeffnen
- Tab `Ansitz` oeffnen
- Pruefen, dass die Liste per `GET /api/v1/ansitze/live` geladen wird
- Erwartung: aktive Ansitze werden angezeigt oder ein leerer Zustand wird sauber dargestellt

### TC-MOB-ANSITZ-02: Manuelle Aktualisierung

- Tab `Ansitz` oeffnen
- Pull-to-Refresh ausfuehren (der `Aktualisieren`-Button wurde in PR #172 entfernt)
- Erwartung: die Liste wird neu geladen, ohne dass die App abstuerzt

### TC-MOB-ANSITZ-03: API nicht erreichbar

- API-URL auf einen nicht erreichbaren Host setzen
- Tab `Ansitz` oeffnen
- Erwartung: Lade- oder Fehlerzustand wird angezeigt, die App bleibt bedienbar

### TC-MOB-ANSITZ-04: Ansitzformular mit Queue-Fallback

- Tab `Ansitz` oeffnen
- Formular mit Standortname, Koordinaten und Notiz ausfuellen
- `Ansitz speichern` ausloesen
- Erwartung: online wird ein `POST /api/v1/ansitze` ausgefuehrt
- Erwartung: ohne Verbindung wird der Ansitz in die Offline-Queue gelegt

## Mobile Sitzung und Queue

### TC-MOB-SITZ-01: Dashboard zeigt Queue und Sitzungskontext

- App oeffnen
- Startseite `Heute im Revier` oeffnen
- Erwartung: Queue, naechste Sitzung und letzte Benachrichtigung werden angezeigt
- Erwartung: der Login-Kontext stammt aus der Session und nicht aus lokalen Platzhaltern

### TC-MOB-SITZ-02: Offline-Warteschlange bleibt sichtbar

- App oeffnen
- Eine vorhandene Offline-Warteschlange simulieren oder vorhandene Demo-Queue verwenden
- Erwartung: die Warteschlange wird im Dashboard angezeigt
- Erwartung: `Ansitz` und `Fallwild` bleiben trotz Queue-Basis bedienbar

### TC-MOB-SITZ-03: Queue-Sync verarbeitet Pending und Failed Eintraege

- App mit bestehender Offline-Queue oeffnen
- Im Dashboard `Queue sync` ausloesen
- Erwartung: erfolgreiche Eintraege verschwinden aus der Queue
- Erwartung: fehlgeschlagene Eintraege behalten einen Fehlerstatus und koennen erneut synchronisiert werden

### TC-MOB-SITZ-04: Queue zeigt Upload- und Konfliktstatus

- App mit vorbereiteten `fallwild-photo-upload`-Eintraegen oeffnen
- Erwartung: das Dashboard zeigt Typ, Status, letzte Fehlermeldung und Attachment-Hinweis
- Erwartung: `failed` und `conflict` koennen sichtbar verworfen werden

### TC-MOB-IOS-01: iPhone-/iOS-Simulator-Smoke vorbereiten

- Xcode mit iOS Simulator oder ein iPhone mit Expo Go vorbereiten
- `pnpm --filter @hege/mobile dev` ausfuehren
- im Expo-Terminal `i` fuer iOS Simulator druecken oder den QR-Code mit Expo Go am iPhone oeffnen
- Login mit Demo-Kennung durchlaufen
- Dashboard, Ansitz, Fallwild mit Fotoauswahl und Offline-Queue manuell pruefen
- Erwartung: die App startet nativ, stellt die Session wieder her und zeigt Queue-Status sowie die zentralen Tabs ohne Runtime-Fehler

### TC-MOB-ANDROID-01: Android-Emulator-Smoke optional vorbereiten

- Android Studio mit Android Emulator einrichten, falls Android-Abdeckung ohne physisches Geraet benoetigt wird
- Android-Emulator starten
- `node apps/mobile/scripts/create-test-image.mjs` ausfuehren
- `powershell -ExecutionPolicy Bypass -File apps/mobile/scripts/android-smoke.ps1` ausfuehren
- Erwartung: das Skript pusht ein Testbild auf den Emulator und gibt den nativen Smoke-Ablauf fuer Login, Dashboard, Ansitz, Fallwild mit Foto und Offline-Sync aus

## Fehlende Testabdeckung (Stand 2026-06-06)

Die folgenden Bereiche haben noch keine Test Cases in diesem Dokument:

### Web-Screens ohne Test Cases
- `/app/aufgaben` — Aufgaben-Verwaltung (Web-Backoffice)
- `/app/reviermeldungen` — Reviermeldungen (Web-Backoffice)
- `/app/benachrichtigungen` — Benachrichtigungen (Web)
- `/app/kontakte` — Kontaktlisten (Web) *(implementiert, keine Web-TCs)*
- `/einladung` — Mitglieder-Einladungsflow
- `/app/mitglieder` — Mitgliederverwaltung

### Mobile-Screens ohne Test Cases
- Benachrichtigungen-Tab (`(tabs)/benachrichtigungen.tsx`)
- `ueber-hege.tsx` Screen

### API-Endpunkte ohne Test Cases
- `/api/v1/memberships/invitations` (GET/POST), `/api/v1/memberships/invitations/[id]` (DELETE), `/api/v1/memberships/invitations/accept` (POST), `/api/v1/memberships/invitations/export.csv` (GET)
- `/api/v1/reviere/active/setup` (POST/PATCH)
- `/api/v1/public/register` (POST)

### Rollen-/Berechtigungslogik
- Weitergehende Mutations-E2E für Admin vs. Schriftführung über die bereits automatisierte Sichtbarkeitsprüfung hinaus

### Dark Mode
- Systemweites Dark-Mode-Verhalten (Tokens, Kontrast-Verhältnisse) (**implementiert — PRs #159, #165; In-App-Umschalter PR #165**)

- [ ] TC-MOB-PROFIL-01: Profil-Screen öffnen → Sektionen Identität/Erscheinungsbild/Face-ID/Konto sichtbar, Initialen-Avatar korrekt
- [ ] TC-MOB-PROFIL-02: In-App-Theme-Umschalter (Mehr → Profil → Erscheinungsbild: System/Hell/Dunkel) → Theme wechselt und persistiert nach App-Neustart
- [ ] TC-API-AUTH-PIN: `POST /api/v1/auth/change-pin` → altes PIN korrekt → neues PIN gesetzt; falsches altes PIN → 401

*TODO: Test Cases für diese Bereiche hinzufügen*
