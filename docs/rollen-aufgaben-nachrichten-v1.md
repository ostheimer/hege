# Rollen, Aufgaben und Nachrichten v1

## Ziel

Dieses Dokument beschreibt die fachliche Richtung fuer Rollen, Aufgaben, Nachrichten, Reviermeldungen und Veranstaltungen. Es ergaenzt das bestehende Rollenmodell, ohne eine verbindliche Migration oder vollstaendige Implementierung fuer diesen Sprint festzulegen.

Ziel ist ein internes Arbeits- und Kommunikationsmodell fuer Reviere in Oesterreich. Die App bleibt die fachliche Quelle der Wahrheit. Externe Messenger koennen spaeter ergaenzen, ersetzen aber nicht das eigene Modell.

Der konkrete naechste Umsetzungsschnitt fuer Reviermeldungen und Aufgaben liegt in [Reviermeldungen und Aufgaben v1](./reviermeldungen-aufgaben-v1-plan.md).

## Grundprinzipien

- alle Inhalte sind pro `revier_id` getrennt
- technische Zuordnung laeuft ueber `membership`
- eine Mitgliedschaft kann mehrere Rollen haben
- Berechtigungen werden aus Rollen und Kontext abgeleitet
- Sichtbarkeit wird explizit ueber Empfaengergruppen, Rollen oder Ressourcenbezug gesteuert
- Aufgaben und Nachrichten koennen auf fachliche Objekte verweisen
- WhatsApp ist kein fuehrender Datenkanal

## Rollenbild

### Bestehende Kernrollen

- `Revier Admin`: Verwaltung, Freigaben, Rollen- und Mitgliederueberblick
- `Schriftfuehrer`: Sitzungen, Protokolle, Beschluesse und protokollbezogene Aufgaben
- `Jaeger`: mobile Feldnutzung, Ansitz, Fallwild, Reviereinrichtungen, eigene Aufgaben

### Fachlich vorgesehene Erweiterungen

- `Paechter`
- `Jagdleiter`
- `Jagdaufseher`
- `Kassier`
- `Ausgeher`
- `Gesellschafter`
- `Gastjaeger`

Diese Rollen sind fachliche Zielrichtung. Sie muessen nicht sofort technisch vollstaendig getrennt werden.

## Sichtbarkeit

Sichtbarkeit wird nicht allein aus Rollen abgeleitet. Entscheidend sind Revier, Rolle, Empfaengergruppe und optional der Bezug zu einer Ressource.

### Grundregeln

- Mitglieder sehen nur Inhalte ihres aktiven Reviers
- adressierte Mitglieder sehen direkte Nachrichten und zugewiesene Aufgaben
- Rollen sehen Inhalte, die explizit an ihre Rolle adressiert sind
- Revier Admins sehen alle operativen Inhalte ihres Reviers
- Schriftfuehrer sehen protokoll- und sitzungsbezogene Inhalte
- Jaeger sehen feldrelevante Inhalte, eigene Aufgaben und an sie gerichtete Nachrichten
- Gastjaeger sehen nur Inhalte, die fuer ihre Teilnahme oder Einladung noetig sind

### Sichtbarkeitsstufen

- `private`: nur Ersteller und direkt adressierte Mitglieder
- `targeted`: definierte Mitglieder, Rollen oder Gruppen
- `revier`: alle aktiven Mitglieder im Revier
- `admin`: Revier Admins und berechtigte Leitungsrollen
- `resource`: Sichtbarkeit folgt der referenzierten Ressource

Die konkrete technische Policy kann spaeter feiner werden. Fuer v1 reicht ein klarer, nachvollziehbarer Sichtbarkeitsentscheid pro Inhalt.

## Empfaengergruppen

Nachrichten, Aufgaben, Reviermeldungen und Veranstaltungen koennen an unterschiedliche Empfaengergruppen gerichtet sein.

Moegliche Zielgruppen:

- einzelne `membership_id`
- mehrere Mitgliedschaften
- alle Mitglieder eines Reviers
- bestimmte Rollen im Revier
- Teilnehmer einer Veranstaltung
- Verantwortliche einer Aufgabe
- Mitglieder mit Bezug zu einer Reviereinrichtung
- Mitglieder mit Bezug zu einem Beschluss oder Protokollpunkt

Empfaengergruppen sollen nachvollziehbar gespeichert werden. Eine Nachricht an `alle Jaeger` darf nicht nur als Text gespeichert werden, sondern braucht eine strukturierte Zielgruppe.

## Aufgaben

Aufgaben sind interne Arbeitseinheiten im Revier. Sie koennen einmalig, wiederkehrend oder projektartig sein.

### Typische Aufgaben

- Hochstand kontrollieren
- Hochstand reparieren
- Fuetterung betreuen
- Salzlecke auffuellen
- Kirrung pruefen
- Wildkamera warten
- Fallwild-Nachbearbeitung erledigen
- Arbeitseinsatz vorbereiten
- Veranstaltungsdienst uebernehmen
- Beschluss aus einer Sitzung umsetzen

### Aufgabenbezug

Eine Aufgabe kann ohne Bezug manuell entstehen oder auf eine Ressource verweisen.

Moegliche Bezuege:

- `reviereinrichtung`
- `fallwild_vorgang`
- `reviermeldung`
- `veranstaltung`
- `sitzung`
- `beschluss`
- `protokoll_version`
- `ansitz_session`

Der Bezug soll als `source_type` und `source_id` modellierbar sein, damit Aufgaben nicht fuer jede Quelle ein eigenes Sondermodell benoetigen.

### Aufgabenstatus

Moegliche Statuswerte:

- `offen`
- `angenommen`
- `in_arbeit`
- `blockiert`
- `erledigt`
- `abgelehnt`
- `archiviert`

### Aufgabenfelder

Moegliche fachliche Felder:

- Titel
- Beschreibung
- Revier
- Ersteller
- Verantwortliche
- Beobachter oder informierte Empfaenger
- Prioritaet
- Faelligkeitsdatum
- Startdatum
- Wiederholungsregel
- Standort oder Ressourcenbezug
- Status
- Abschlussnotiz
- Anhaenge oder Fotos

Diese Felder sind eine Richtung fuer spaetere API- und Datenmodellierung, keine verbindliche Migration.

## Nachrichten

Nachrichten sind interne, strukturierte Kommunikation im Revier. Sie sind nicht als vollstaendiger Chat-Ersatz fuer beliebige Privatkommunikation gedacht.

### Nachrichtentypen

- allgemeine Reviernachricht
- direkte Nachricht an Mitglieder
- rollenbezogene Nachricht
- aufgabenbezogene Nachricht
- veranstaltungsbezogene Nachricht
- protokoll- oder beschlussbezogene Nachricht
- Systemhinweis

### Nachrichtenregeln

- jede Nachricht hat einen Revierkontext
- jede Nachricht hat einen Ersteller oder einen Systemausloese
- jede Nachricht hat strukturierte Empfaenger
- Nachrichten koennen gelesen, archiviert oder als erledigt markiert werden
- fachlich relevante Nachrichten koennen auf Aufgaben, Reviermeldungen oder Veranstaltungen verweisen
- Push-Benachrichtigungen sind Auslieferung, nicht Quelle der Wahrheit

### Abgrenzung zu Notifications

`notifications` bleiben technische oder produktinterne Hinweise, zum Beispiel `Protokoll freigegeben` oder `neue Aufgabe`. Nachrichten sind dagegen fachliche Inhalte, die Nutzer bewusst erstellen oder beantworten.

Beide Konzepte koennen zusammenarbeiten: Eine neue Nachricht kann eine Notification ausloesen, aber die Notification ersetzt die Nachricht nicht.

## Reviermeldungen

Reviermeldungen sind strukturierte Beobachtungen oder Hinweise aus dem Revier. Sie liegen zwischen einfacher Nachricht und fachlichem Vorgang.

### Typische Reviermeldungen

- Wildsichtung
- Schaden
- Gefahr
- Sperre oder Einschraenkung
- Mangel an Reviereinrichtung
- auffaellige Beobachtung
- Hinweis fuer andere Jaeger

### Eigenschaften

- Standort optional, aber empfohlen
- Zeitpunkt verpflichtend
- Kategorie verpflichtend
- Status nachvollziehbar
- Fotos optional
- Sichtbarkeit abhaengig von Kategorie und Empfaengergruppe
- Meldung kann zu Aufgabe, Nachricht oder Veranstaltung fuehren

### Statuswerte

- `neu`
- `geprueft`
- `in_bearbeitung`
- `erledigt`
- `verworfen`
- `archiviert`

Fallwild bleibt ein eigener fachlicher Vorgang. Eine Reviermeldung kann auf Fallwild hinweisen, ersetzt aber nicht die strukturierte Fallwild-Erfassung.

## Veranstaltungen

Veranstaltungen buendeln Termine, Teilnehmer, Aufgaben und Kommunikation.

### Typische Veranstaltungen

- Gesellschaftsjagd
- Arbeitseinsatz
- Reviersitzung
- Schulung
- Hegemassnahme
- Kontrolltermin
- gemeinsamer Treffpunkt

### Eigenschaften

- Titel
- Beschreibung
- Start- und Endzeit
- Ort oder Treffpunkt
- Empfaengergruppe
- Teilnehmerstatus
- verantwortliche Rolle oder Mitgliedschaft
- optionale Aufgabenliste
- optionale Nachrichtenstrecke

### Teilnehmerstatus

- `eingeladen`
- `zugesagt`
- `abgesagt`
- `vielleicht`
- `teilgenommen`
- `nicht_erschienen`

Veranstaltungen koennen spaeter Aufgaben erzeugen, zum Beispiel Dienste, Vorbereitung, Nachbereitung oder Kontrollgaenge.

## WhatsApp-Abgrenzung

WhatsApp kann spaeter als zusaetzlicher Kanal betrachtet werden, ist aber nicht die fachliche Quelle.

### Nicht Ziel von v1

- automatische Synchronisierung von WhatsApp-Gruppen
- Import eingehender WhatsApp-Nachrichten als fuehrende Fachdaten
- Aufgabensteuerung ausschliesslich ueber WhatsApp
- Speicherung privater Chatverlaeufe
- Versand sensibler Standortdaten ohne explizite fachliche Entscheidung

### Moegliche spaetere Nutzung

- Versand einer kurzen Benachrichtigung mit Link in die App
- Erinnerung an Veranstaltung oder Aufgabe
- Hinweis auf freigegebenes Protokoll
- Weiterleitung allgemeiner Revierinformationen an opt-in Empfaenger

Der vollstaendige Inhalt und der verbindliche Status bleiben in der App.

## API-Richtung

Die API soll fachliche Ressourcen klar trennen und trotzdem Beziehungen zulassen.

### Bereits implementiert

Die folgenden Endpunkte sind produktiv in `apps/web/src/app/api/v1/` vorhanden:

- `GET /api/v1/reviermeldungen`
- `POST /api/v1/reviermeldungen`
- `GET /api/v1/reviermeldungen/:id`
- `PATCH /api/v1/reviermeldungen/:id`
- `GET /api/v1/aufgaben`
- `POST /api/v1/aufgaben`
- `GET /api/v1/aufgaben/:id`
- `PATCH /api/v1/aufgaben/:id`

### Geplant (naechste Ausbaustufe)

- `GET /api/v1/roles`
- `GET /api/v1/memberships` *(GET /api/v1/memberships/invitations bereits vorhanden)*
- `GET /api/v1/messages`
- `POST /api/v1/messages`
- `PATCH /api/v1/messages/:id`
- `GET /api/v1/veranstaltungen`
- `POST /api/v1/veranstaltungen`
- `PATCH /api/v1/veranstaltungen/:id`

Diese Liste ist eine Richtung. Sie legt keine Umsetzung in diesem Sprint fest.

## Datenmodell-Richtung

Moegliche Tabellen oder Ressourcen:

- `roles`
- `membership_roles`
- `tasks` *(aktuell als `reviermeldungen` und `aufgaben` getrennt modelliert)*
- `task_assignees`
- `task_comments`
- `messages`
- `message_recipients`
- `message_read_states`
- `reviermeldungen` *(bereits vorhanden)*
- `veranstaltungen`
- `veranstaltung_teilnehmer`
- `resource_links`

Wichtige gemeinsame Felder:

- `id`
- `revier_id`
- `created_by_membership_id`
- `visibility`
- `status`
- `source_type`
- `source_id`
- `created_at`
- `updated_at`
- `archived_at`

Fuer Empfaengergruppen kann spaeter eine generische Struktur entstehen, zum Beispiel `target_type` und `target_id` mit Werten wie `membership`, `role`, `revier`, `event_participants` oder `task_assignees`.

## Datenschutz und Nachvollziehbarkeit

- Nachrichten und Aufgaben sind revierinterne Daten
- private Kommunikation soll nicht unnoetig in die Plattform gezogen werden
- sensible Standort- und Personendaten brauchen klare Sichtbarkeit
- Aenderungen an Aufgabenstatus und Verantwortlichkeit sollen nachvollziehbar sein
- Revier Admins benoetigen Ueberblick, aber keine unnoetige Vermischung mit privater Kommunikation
- Audit-Logs sollen fachliche Entscheidungen erfassen, nicht jede gelesene Nachricht

## Akzeptanzkriterien fuer spaetere Umsetzung

- Inhalte sind pro Revier getrennt
- Empfaengergruppen werden strukturiert gespeichert
- Aufgaben koennen einzelnen Mitgliedern, Rollen oder Gruppen zugewiesen werden
- Aufgaben koennen auf fachliche Ressourcen verweisen
- Reviermeldungen sind von Fallwild und Nachrichten unterscheidbar
- Veranstaltungen koennen Teilnehmer, Ort und Aufgabenbezug tragen
- WhatsApp bleibt optionaler Ausgabekanal und nicht Quelle der Wahrheit
- das Dokument erzwingt keine Migration in diesem Sprint
