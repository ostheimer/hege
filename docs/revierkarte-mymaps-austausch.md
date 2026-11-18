# Revierkarte mit Google My Maps austauschen

Die Anleitung ist direkt unter **Revierkarte → Anleitung: Google My Maps ↔ hege** erreichbar. Die Schaltflächen heißen **KML/KMZ importieren**, **Als Entwurf übernehmen** und **Gespeicherte Karte als KML exportieren**. Lesen und Exportieren stehen auch Benutzern ohne Bearbeitungsrecht zur Verfügung.

## Google My Maps → hege

1. Eigene Karte in My Maps öffnen. Menü neben dem Kartentitel → **In KML/KMZ exportieren** (englisch **Export to KML/KMZ**).
2. Gesamte Karte oder gewünschte Ebene wählen. Netzwerklink ausgeschaltet lassen. **Herunterladen** (**Download**).
3. In hege die richtige Jagdgesellschaft und **Revierkarte** öffnen. Mit vorhandenem Bearbeitungsrecht **KML/KMZ importieren** wählen.
4. Jede Fläche als **Reviergrenze** oder **Ausschlussfläche** prüfen. Bei vorhandenem gültigem Entwurf ist **Zum Entwurf hinzufügen** voreingestellt. **Entwurf ersetzen** ersetzt bewusst dessen Flächen. **Als Entwurf übernehmen** speichert noch nichts.
5. Alle Einträge unter **Teilfläche oder Ring** auf **Karte** und **Satellit** prüfen. Bei bestehender Grenze **Bestehende Reviergrenze bewusst ändern** bestätigen. **Reviergrenze speichern**.
6. **Gespeicherte Karte neu laden**, Flächen nochmals kontrollieren. **Frühere Grenzen → Version als Entwurf laden** erlaubt die Wiederherstellung; auch diese anschließend bewusst speichern.

## hege → Google My Maps

1. Gewünschte Änderungen speichern. **Gespeicherte Karte als KML exportieren** exportiert ausschließlich den gespeicherten Stand.
2. In My Maps **Neue Karte erstellen** (**Create a new map**) oder **Ebene hinzufügen** (**Add layer**) in einer eigenen Karte wählen.
3. In der leeren Ebene **Importieren** (**Import**) und die heruntergeladene Datei wählen. Vorhandene Ebenen bleiben dadurch erhalten.
4. Teilflächen, Aussparungen und rote Ausschlussflächen kontrollieren. Änderungen in My Maps werden nicht automatisch mit hege synchronisiert; bei Bedarf erneut exportieren und in hege prüfen.

## Grenzen des Austauschs

- KML 2.2/UTF-8 oder KMZ mit genau einer KML-Datei; höchstens 5 MB Datei und entpackte KML, 100 Flächen, 20.000 Ringpunkte und vorhandenes Speicherlimit von 1.000.000 JSON-Zeichen. Jedes Polygon benötigt geschlossene Ringe; Mindestfläche 1 m², vollständige Topologieprüfung beim Speichern durch PostGIS.
- Polygon/MultiGeometry, Teilflächen und innere Ringe bleiben erhalten. Höhen werden mit Hinweis verworfen. Punkte, Linien und andere Objekte werden gezählt und ausdrücklich als nicht übernommen angezeigt. Einrichtungen, Fotos und eigene Stile sind nicht Teil dieses Flächenaustauschs.
- Ausschlussflächen bleiben separate rote Polygone. Sie werden nicht aus der Grenze herausgerechnet; ein innerer Ring hingegen bleibt eine Aussparung seines Polygons. Im Export steht vor Ausschlüssen **[Ausschluss]**; zusätzlich enthalten sie das KML-Attribut `hege_kind`. Originalnamen werden separat in `hege_name` erhalten. Die Zuordnung wird vor der Übernahme angezeigt und ist änderbar.
- Importvorschau läuft im Browser ohne Dateiübertragung. XML-DTD, Entities und Netzwerklinks sind gesperrt; keine externe Ressource wird geladen. KMZ wird in begrenzten Schritten entpackt; nicht benötigte Dateien werden nicht entpackt.
- Bestehende Kartenorte bleiben erhalten. Das Importieren allein schreibt keine Produktionsdaten; Speichern erfolgt über den regulären autorisierten `PUT /api/v1/revier-map`, mit Revisionsvergleich, Bestätigung und Vorversion. Es werden keine Datenbankmigration oder neuen Rechte benötigt.
- My Maps kann Darstellung, Namen und Zahlenformat verändern. Vollständigkeit nach jeder Übertragung prüfen. Die Arbeitskarte ersetzt keine behördliche Feststellung des Jagdgebietes.

## Begriffe in Niederösterreich

Die **Jagdgesellschaft** und deren **Jagdleiter** richten sich nach § 27 NÖ Jagdgesetz 1974. Ein technisches Bearbeitungsrecht in hege ist keine Bestellung zum Jagdleiter. **Jagdverwalter** bzw. **Genossenschaftsjagdverwalter** sind andere Funktionen (§§ 43, 52) und keine Synonyme für den Jagdleiter einer Jagdgesellschaft. Die Benutzerrollen werden durch den Kartenaustausch nicht geändert.

## Prüfnachweise, 19.11.2026

- Ausgangsstand `a2fee71`: neuer UI-Akzeptanztest scheitert an fehlendem Import/Export. Nach Einbindung besteht derselbe Test. Befehl: `pnpm --filter @hege/web test src/components/revier-boundary-exchange.test.ts`.
- Vollständige Browser-Gegenprobe: `revier-map-exchange.spec.ts` gegen den unveränderten Editor aus `a2fee71`, danach derselbe Test mit der Implementierung. Ausgangsstand scheitert am fehlenden Importfeld; Datenbankaufbau und Anmeldung funktionieren.
- Parser-Tests: ungerundete Koordinaten, Multipart, Aussparungen, Ausschlüsse, Namespace-Präfixe, KMZ, begrenzte Dateigrößen, Ablehnung von DTD/Netzwerklinks/offenen Ringen, Ergänzen/Ersetzen ohne Verlust vorhandener Orte. Zusätzlicher Rot-Grün-Randfall: Ausschlussname mit 200 Zeichen, durch getrennten Originalnamen behoben. Umbenennung in My Maps hat Vorrang vor alten Metadaten (ebenfalls Rot-Grün geprüft).
- Desktop und mobiler Browser: Importvorschau schreibt nichts, speichern/neu öffnen, inneren Ring auswählen, Datei herunterladen und erneut importieren, vorhandenen Stand schützen, Rückgängig, Anleitung und Leserrechte. Bestehende Editorprüfungen testen zusätzlich PostGIS, konkurrierende Revisionen und Versionswiederherstellung.
- Echter My-Maps-Rundlauf mit erfundener Karte: zwei Grenzteilflächen, ein innerer Ring und eine Ausschlussfläche importiert und visuell kontrolliert. Rückexport enthält alle drei Polygone und den inneren Ring; maximale numerische Abweichung 7,11e-15 Grad. Aussage gilt für die geprüfte Polygonstruktur, nicht für alle KML-Funktionen.
- Web-Vitest: 349 Tests in 72 Dateien bestanden; Domain: 17 Tests in 5 Dateien bestanden. Typecheck und Next.js-Produktionsbuild bestanden. Browser-Screenshots auf Desktop und mobil visuell kontrolliert.
- Private Quelle separat lokal geprüft, keine privaten Karten oder Koordinaten in Testdateien oder GitHub. Produktionsimport und Produktionsabnahme werden im Issue gesondert dokumentiert.

## Quellen und API-Prüfung

- [Google My Maps: Import](https://support.google.com/mymaps/answer/3024836?hl=de), [Export](https://support.google.com/mymaps/answer/3109452?hl=de).
- [Google KML-Referenz](https://developers.google.com/kml/documentation/kmlreference): Polygon, outerBoundaryIs, innerBoundaryIs, MultiGeometry, ExtendedData und KML-Farbreihenfolge.
- [fflate](https://github.com/101arrowz/fflate): offizielles npm-Paket `fflate`, festgeschrieben auf 0.8.2. `Unzip`, `UnzipInflate`, `onfile`, `originalSize`, `ondata` und `push` gegen installierte Deklarationen und Paketquelle geprüft.
- [DOMParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString): `application/xml` und Parserfehlerprüfung; produktiv nativer Browserparser. Tests nutzen das offizielle [xmldom](https://github.com/xmldom/xmldom)-Paket `@xmldom/xmldom` 0.9.12 ausschließlich als Entwicklungsabhängigkeit. Browser-E2E ergänzt die Tests mit echtem DOMParser.
- [§ 27 NÖ Jagdgesetz](https://www.ris.bka.gv.at/eli/lgbl/NI/6500/P27/LNO40015750), [konsolidiertes NÖ Jagdgesetz](https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrNO&Gesetzesnummer=20000559), am 19.11.2026 abgerufen; RIS lieferte die konsolidierte Fassung vom 17.11.2026.
