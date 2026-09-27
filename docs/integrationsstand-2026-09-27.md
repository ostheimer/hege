# Integration des gesicherten Hege-Stands am 27.09.2026

## Umfang

Der Checkpoint `7a60d44` wurde gegen PR #217 abgeglichen. Die mobilen Ansichten, Revierkarte, Aktivitäten, GPS-Entwurfsgrundlage, API-Ergänzungen und direkten Foto-Uploads sind bereits in #217 enthalten. Der verbleibende Checkpoint besteht aus lokalem Seed-Schutz, Import-/Prüfwerkzeugen und historischen Abnahmeprotokollen. Die neuere Live-API-Dokumentation aus #217 bleibt erhalten.

## Preview und Produktion

Der fehlgeschlagene Preview-Login versuchte nachweislich `127.0.0.1:15432` zu erreichen. Preview hat entsprechend der Architektur keine Datenbank. Es wurde keine Produktionsverbindung eingerichtet.

Der Preview-Smoke prüft nun öffentliche Seiten und den anonymen Zugriffsschutz. Datenbankzugriffe werden erst bei tatsächlicher Verwendung initialisiert und melden bei fehlender Cloud-Konfiguration HTTP 503. Ein erfolgreicher Preview-Smoke ist ausdrücklich keine authentifizierte Datenbank-Abnahme. Der vollständige Release-Smoke bleibt bestehen.

## Prüfnachweise

- PR #217: 310 Web-Tests; vorhandene 209 Mobile-, 12 Domain- und 8 Token-Tests erfolgreich.
- Typprüfung: 9/9 erfolgreich. Web-Build lokal sowie ausdrücklich mit Preview-Einstellungen ohne Datenbank erfolgreich.
- Vier Smoke-Vertragstests prüfen auch, dass kaputte Seiten oder ungeschützte APIs weiterhin fehlschlagen und der Release-Smoke weiterhin einen Login verlangt.
- Lokaler Preview-Server: öffentlicher Smoke erfolgreich, Login ohne Datenbank kontrolliert HTTP 503.
- Vercel-Preview `41445f7`: Build und öffentlicher Smoke erfolgreich. PR #217 wurde als `1bab8c9` zusammengeführt; Vercel-Production und GitHub-Release-Check für diesen Merge-Commit sind erfolgreich. Die Vercel-CLI bestätigt `hege.app` als Alias dieses Deployments.
- Vollständiger Release-Smoke gegen `hege.app` am 27.09. erfolgreich; keine Fachdatensätze angelegt oder geändert.
- Seed-Schutz: 311 Web-Tests sowie fünf Playwright-Auth-Prüfungen einschließlich isoliertem Datenbank-Setup, Login/Logout und Rollenabwehr erfolgreich.
- Gesamter integrierter Stand: 27 Desktop-Playwright-Prüfungen erfolgreich (Auth, Ansitze, Fallwild, Karten, Plattformbenutzer, öffentliche Seiten, Sitzungen und Protokolle); keine neuen Screenshot-Baselines erzeugt.
- KMZ-Konverter mit synthetischen Daten geprüft: innerer Ring bleibt erhalten, DTD-Eingabe wird abgelehnt. Private Originaldateien wurden nicht veröffentlicht oder neu importiert.

## Offene Abnahmen und Entscheidungen

- #208: Echter GPS-Sensor, Kompass und vollständiger Einrichtungsablauf am physischen iPhone. Die Bestätigung des Foto-Uploads vom 14.09. ersetzt nicht die gesamte Hardware-Abnahme.
- #211: Die 58 Kartenorte bleiben ungeprüfte Orte. Einrichtungstypen/Zustände und die fachliche Zuordnung des außerhalb liegenden Ortes sind nicht zu erfinden.
- #212: Bestehende Impersonation bleibt auf Plattform-Admins begrenzt; andere Plattform-Admins sind als Ziele ausgeschlossen. Vollständige mobile Abnahme und fachliche Bestätigung dieser Regel stehen aus.
- #210: Gezielt live Punkte setzen, vollständiger Punkteditor und Web-Karteneditor sind eigenständige noch offene Umsetzung; bestehende GPS-Entwurfsgrundlage ist keine vollständige Abnahme.
- #214: Aktuelle Neon-Aufbewahrung, Schutzregeln und Cloud-Restore bleiben ohne entsprechenden Kontozugriff unbestätigt.

Keine neuen EAS-Builds oder kostenpflichtigen Ressourcen wurden für diese Integration ausgelöst. Historische Smoke-Dateien beschreiben ihren damaligen Stand und sind keine neue Geräteabnahme.

## Kurze iPhone-Abnahme für Andreas

1. Hege öffnen und unter „Über hege“ den sichtbaren App-/Update-Stand notieren.
2. Unter „Mehr → Reviereinrichtungen → Erfassen“ eine klar bezeichnete Testeinrichtung anlegen.
3. Im Freien echten GPS-Standort und Kompassrichtung übernehmen; ein neues Kamerafoto hinzufügen.
4. Speichern: Erfolgsanzeige, Wechsel in den Bestand, Kartenposition, Richtung und Foto im Detail prüfen. Bei einer Ansitzeinrichtung zusätzlich Wind und Sonnenzeiten kontrollieren.
5. Testergebnis und App-Stand zurückmelden. Den konkreten Testdatensatz samt Foto anschließend gezielt bereinigen und die Entfernung prüfen; keine anderen Einrichtungen löschen.

Die Geräteübersicht vom 27.09. erkennt Andreas' iPhone 16 Pro. Das ist kein Nachweis, dass die Sensorprüfung durchgeführt wurde. Keine Entsperr-/Sicherheitseinstellungen werden für die Prüfung automatisch geändert.
