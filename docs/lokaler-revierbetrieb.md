# Lokaler Revierbetrieb – Stand 05.09.2026

## Arbeitsgrenzen

Keine EAS-Builds. Kein Push, Deployment oder Schreiben in die Produktionsdatenbank durch diesen lokalen Arbeitslauf.
Web/API und Metro laufen lokal; Änderungen sind nicht automatisch auf dem installierten iPhone-Produktionsstand vorhanden.

## Starten und Testen

In jedem Terminal zuerst `cd /Users/andreas/GitHub/hege`.

1. Infrastruktur bei Bedarf: `docker compose up -d postgres minio`.
2. Terminal A: `pnpm --filter @hege/web dev` (Port 3000, bleibt aktiv).
3. Terminal B: `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000/api/v1 pnpm --filter @hege/mobile exec expo start --dev-client --port 8081` (bleibt aktiv).
4. Terminal C: `pnpm --filter @hege/domain test`, `pnpm --filter @hege/mobile test`, `pnpm --filter @hege/web test`.
5. Typprüfung: `pnpm --filter @hege/mobile typecheck` und `pnpm --filter @hege/web typecheck`.
6. Lokaler API-Smoke: `node apps/web/scripts/smoke-local-revier.mjs`. Dieser verwendet ausschließlich die lokale API und vorhandene Testrollen; Impersonationsereignisse werden lokal protokolliert.

Ein laufender Entwicklungsserver gibt den Terminal-Prompt nicht zurück. Den nächsten Server deshalb in einem anderen Terminal starten.
Bei einem versehentlichen `\` am Zeilenende wartet die Shell auf Fortsetzung: `Ctrl+C`, dann den vollständigen Befehl ohne Backslash eingeben.
Auf einem physischen iPhone bezeichnet `127.0.0.1` das iPhone, nicht den Mac. Für diesen Test muss die lokale Mac-Adresse im gemeinsamen Netzwerk bewusst konfiguriert werden; keine Produktions-URL als vermeintlichen lokalen Ersatz verwenden.

## Echte Daten und Beispieldaten

- Neues lokales Revier: `revier-gaenserndorf`, „Jagdgesellschaft Gänserndorf“.
- Andreas: bestehender Benutzer `ostheimer`, neue Mitgliedschaft `member-ostheimer-gaenserndorf`, technische Rolle `platform-admin`, fachliche Funktion `Jäger`.
- Keine neue PIN angelegt oder bestehende PIN geändert. Keine Telefonnummer oder Jagdzeichen erfunden.
- Im Profil unter „Meine Reviere“ das echte Revier auswählen. Das alte Revier `revier-attersee` bleibt als „Testrevier · Beispieldaten“ einschließlich aller alten Datensätze erhalten.
- Zusätzlich wurden 58 echte Orte aus der von Andreas geöffneten privaten Google-Maps-Liste gelesen. Die private Quelldatei liegt außerhalb von Git unter `/Users/andreas/Downloads/hege-gaenserndorf-places.json`.
- 57 Orte liegen innerhalb der importierten Grenze, ein Ort außerhalb; keiner liegt in einer Ausschlussfläche. Alle Namen bleiben unverändert. Abweichende Zuordnungen werden auf der Karte orange gekennzeichnet.
- Die Orte sind Kartenmarkierungen, noch keine geprüften/buchbaren Einrichtungen: Einrichtungstyp und Zustand fehlen teilweise. Es wurden weder Betriebszustände noch Jagdaktivitäten erfunden. Die fachliche Übernahme in die Einrichtungsverwaltung bleibt #211 zugeordnet.

## KMZ-Import

Die private Quelldatei bleibt außerhalb des Git-Repositorys. Keine Grenzen oder Koordinaten in öffentliche Issues kopieren.

Vorschau, aus `apps/web`:

```bash
pnpm exec tsx scripts/import-gaenserndorf.ts '/Pfad/zur/Karte.kmz'
```

Nach Sicherung und Prüfung der Vorschau mit `--apply` importieren. Das Skript ist ausdrücklich auf `localhost`/`127.0.0.1`, Port `15432`, Datenbank `hege` beschränkt.
Es erhält alle Ringe, Teilflächen und Ausschlüsse und ersetzt keine abweichende bestehende Karte. Der Import ist wiederholbar und wurde wiederholt geprüft.
Alle drei gelieferten Flächenobjekte wurden durch PostGIS als gültig bestätigt. Der gerundete Hektarwert wird aus den Kartenpolygonen abzüglich Ausschlüssen geschätzt; er ist keine amtliche Flächenangabe.

Neue Migrationen `0012` (Revierkarte) und `0013` (fachliche Mitgliedschaftsfunktion) wurden nur lokal angewendet.

Die Ortsliste wird über `pnpm exec tsx scripts/import-revier-places.ts PRIVATE_DATEI.json` geprüft und mit `--apply` lokal ergänzt. Das Skript prüft Grenz-/Ausschlusszuordnung mit PostGIS, erhält alle Quellorte und verweigert das Überschreiben einer abweichenden vorhandenen Ortsliste.

## GPS-Erfassung

Über „Grenze per GPS aufzeichnen“ können berechtigte Revier-/Plattform-Admins einen Grenzentwurf aufzeichnen.
Der Entwurf bleibt benutzer- und mitgliedschaftsbezogen auf dem Gerät gespeichert. Beim Verlassen der App wird pausiert; Hintergrundaufzeichnung ist bewusst nicht Bestandteil dieser ersten Version.
Ungenaue Punkte über 25 m, Sprünge und zu dicht beieinanderliegende Punkte werden verworfen. Maximal 2000 Punkte.
Zum Abschluss sind eine gültige Fläche ohne Selbstüberschneidung und eine Ringschluss-Lücke von höchstens 100 m erforderlich.
Pause, Fortsetzen, Entfernen des letzten Punkts und ausdrücklich bestätigtes Verwerfen sind vorhanden.
„Als Reviergrenze übernehmen“ verlangt eine Bestätigung und ersetzt **keine** bestehende Karte. Bei bestehender Karte bleibt der Entwurf erhalten (HTTP 409).
Bestehende Grenzen bearbeiten, Ausschlüsse im GPS-Editor zeichnen und echte Fahr-/Offline-/Hintergrundtests bleiben in #210 offen.
Die Präzisierung von Andreas ist in #210 erfasst: beim Abgehen live gezielt Punkte setzen sowie im Web direkt in der Kartenansicht zeichnen und bearbeiten. Ein manueller Punktsetzknopf, vollständiger Punkteditor und Web-Editor sind noch nicht umgesetzt. Google-Kartenunterlage/Satellit und mögliche My-Maps-Anbindung werden unter Lizenz-, Datenschutz- und Kostenvorbehalt geprüft, ohne Synchronisierung zu versprechen.

## Datenbanksicherung und Schutz

Vor dem Import wurde ein lokaler PostgreSQL-Dump erzeugt und erfolgreich in die separate lokale Prüfdatenbank `hege_restore_check_20260905` zurückgespielt (12 Benutzer wiederhergestellt).
Die Prüfdatenbank bleibt zunächst erhalten. Der temporäre Dump liegt unter `/tmp/hege-before-map-Q0FMJN/hege.dump`; `/tmp` ist keine dauerhafte Backup-Ablage.
Das ist ein lokaler Restore-Nachweis, kein Nachweis einer Neon-Produktionswiederherstellung.

Wichtiger gefundener Fehler: Die Anmeldung bekannter Seed-Benutzer schrieb zuvor automatisch Demo-Reviere zurück und konnte so den Reviernamen überschreiben. Dieser Schreibpfad wurde entfernt; Anmeldung legt keine Demo-Konten/-Reviere mehr an. Zwei Regressionstests sichern das ab.
`db:seed` verlangt jetzt `--confirm-demo-seed` und verweigert Cloud-/fremde Datenbanken. Es bleibt ein bewusst destruktiver Beispiel-Datenabgleich und wird nicht für echte Reviere eingesetzt.

## Externe Verifikation und verbleibende Grenzen

- Vercel-Projekt `hege` wurde read-only bestätigt; letzter gemeldeter Produktions-Deploymentstatus `READY`, ID `dpl_77yCARCWPHNV6UwpbyjJouUCJdXu`. Das ist keine vollständige Live-Abnahme.
- Die aktuelle Neon-Verbindung sieht nur eine Organisation ohne auffindbares Hege-Projekt; Zugriff auf die historisch dokumentierte Projekt-ID scheitert. Branch-Schutz, Aufbewahrungsdauer und aktuelle Vercel-Variablen-Zuordnung sind deshalb nicht frisch bestätigt.
- Keine Cloud-Branches, Schutzregeln, Zugangsdaten oder kostenpflichtigen Einstellungen verändert.
- Das iPhone 16 Pro von Andreas wurde als gepaart/verfügbar erkannt. Reale Kamera-, Kompass- und Fahrt-Abnahme erfordern Bedienung des physischen Geräts und bleiben #208 zugeordnet.
- Entscheidung zu Revier-Admin-Impersonation ausstehend. Bis zur Klärung bleibt die bestehende Plattform-Admin-Beschränkung erhalten; andere Plattform-Admins bleiben als Ziele ausgeschlossen.

Gesamtfortschritt: GitHub #215, Einzelthemen #209–#214 und bestehendes Hardware-Issue #208. Lokal umgesetzt ist nicht gleich veröffentlicht oder vollständig hardwaregeprüft.
