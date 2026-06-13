# Projektregeln

## Dokumentation

- Die Projektdokumentation ist auf Deutsch zu verfassen.
- Produktsprache fuer die App ist Deutsch fuer Oesterreich (`de-AT`).

## Produktentscheidungen

- Kartenfunktionen in Web und Mobile orientieren sich an Google Maps.

## Arbeitsregeln fuer autonome Umsetzung

- Keine Rueckfrage, wenn eine konservative Annahme reicht; Annahmen werden im Commit und in der Dokumentation genannt.
- Fehlende externe Secrets blockieren keine Implementierung: Die Funktion bekommt einen klaren Fallback, eine Env-Dokumentation und Tests gegen Mock-/Fixture-Daten.
- Unrelated lokale Dateien bleiben unangetastet, insbesondere ungetrackte `... 2`-Duplikatdateien.
- Jede Funktion wird mindestens mit Typecheck, Unit-/Service-Tests und Browser-Smoke geprueft.
- Web-UI wird per Browser auf Desktop und Mobile-Viewport geprueft.
- Mobile wird per Typecheck, Unit-Tests, EAS-Update und iPhone-/Simulator-Smoke geprueft.
- Production wird erst als erledigt markiert, wenn `hege.app` oder der EAS-Channel live verifiziert wurde.

Vollstaendiger Umsetzungsplan: [docs/autonomer-umsetzungsplan-2026-05.md](docs/autonomer-umsetzungsplan-2026-05.md)
