"use client";
import { useState } from "react";
import { validateRevierMap, type RevierMapData } from "@hege/domain";
import { applyMapImport, exportMapKml, MAX_MAP_FILE_BYTES, readMapFile, type MapImport } from "../lib/revier-map-exchange";

interface Props {
  current: RevierMapData;
  saved: RevierMapData | null;
  canEdit: boolean;
  disabled: boolean;
  onImport: (map: RevierMapData) => void;
}
export function RevierMapExchange({ current, saved, canEdit, disabled, onImport }: Props) {
  const [pending, setPending] = useState<MapImport | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  let currentValid = false;
  try { validateRevierMap(current); currentValid = true; } catch { /* Leerer Entwurf. */ }
  const locked = disabled || reading;
  async function read(file: File) {
    setReading(true); setPending(null); setError(null);
    try {
      if (file.size > MAX_MAP_FILE_BYTES) throw new Error("Die Datei darf höchstens 5 MB groß sein.");
      setPending(readMapFile(new Uint8Array(await file.arrayBuffer()), file.name));
      setMode(currentValid ? "append" : "replace");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Import fehlgeschlagen."); }
    finally { setReading(false); }
  }
  return <div className="page-stack">
    <details>
      <summary>Anleitung: Google My Maps ↔ hege</summary>
      <h3>Von Google My Maps nach hege</h3>
      <ol>
        <li>In Google My Maps die eigene Karte öffnen. Im Menü neben dem Kartentitel „In KML/KMZ exportieren“ („Export to KML/KMZ“) wählen.</li>
        <li>„Gesamte Karte“ („Entire map“) oder die gewünschte Ebene wählen. „Daten mit Netzwerklink-KML aktuell halten“ ausgeschaltet lassen und „Herunterladen“ („Download“) wählen.</li>
        <li>In hege die Jagdgesellschaft und „Revierkarte“ öffnen. Mit dem vorhandenen Bearbeitungsrecht „KML/KMZ importieren“ verwenden. Der Jagdleiter kann die Übernahme mit einem berechtigten Benutzer abstimmen.</li>
        <li>Jede Fläche als „Reviergrenze“ oder „Ausschlussfläche“ zuordnen. Bei vorhandenen Daten ist „Zum Entwurf hinzufügen“ voreingestellt. „Entwurf ersetzen“ nur bewusst wählen. „Als Entwurf übernehmen“ ändert noch keine gespeicherte Grenze.</li>
        <li>Über „Teilfläche oder Ring“ alle Teilflächen und inneren Ringe auf „Karte“ und „Satellit“ prüfen. Bei einer vorhandenen Grenze „Bestehende Reviergrenze bewusst ändern“ bestätigen und „Reviergrenze speichern“ wählen.</li>
        <li>„Gespeicherte Karte neu laden“ wählen und die Grenze erneut prüfen. Der vorherige gespeicherte Stand bleibt unter „Frühere Grenzen“ wiederherstellbar.</li>
      </ol>
      <h3>Von hege nach Google My Maps</h3>
      <ol>
        <li>Änderungen zuerst speichern. „Gespeicherte Karte als KML exportieren“ lädt ausschließlich den gespeicherten Stand herunter.</li>
        <li>In Google My Maps „Neue Karte erstellen“ („Create a new map“) oder in einer eigenen Karte „Ebene hinzufügen“ („Add layer“) wählen.</li>
        <li>In der leeren Ebene „Importieren“ („Import“) wählen und die heruntergeladene KML-Datei auswählen. Eine neue Ebene vermeidet das Ersetzen vorhandener Daten.</li>
        <li>Grenzen, Teilflächen, Aussparungen und rot dargestellte Ausschlussflächen prüfen. My Maps ändert die hege-Karte nicht automatisch. Änderungen bei Bedarf erneut als KML/KMZ exportieren und in hege prüfen.</li>
      </ol>
      <p>Übertragen werden zweidimensionale Polygonflächen, Teilflächen und innere Ringe. Separate Ausschlussflächen bleiben eigenständige rote Flächen und sind im Export mit „[Ausschluss]“ bezeichnet. Sie werden nicht geometrisch aus der Grenze ausgeschnitten. Punkte, Einrichtungen, Linien, Fotos, Höhen und individuelle Stile gehören nicht zu diesem Austausch. My Maps kann KML-Inhalte verändern; nach jeder Übertragung alle Flächen prüfen.</p>
      <p>Grenzen: KML 2.2 in UTF-8 oder KMZ mit genau einer KML-Datei, höchstens 5 MB vor und nach dem Entpacken, 100 Flächen, 20.000 Punkte und die Speichergrenze von hege. Dateien werden im Browser gelesen; erst „Reviergrenze speichern“ überträgt die Flächen an hege.</p>
      <p>Diese Arbeitskarte ersetzt keine behördliche Feststellung des Jagdgebietes. „Jagdleiter“ bezeichnet die Funktion innerhalb der Jagdgesellschaft; ein technisches Bearbeitungsrecht bestellt keinen Jagdleiter.</p>
      <p><a href="https://support.google.com/mymaps/answer/3024836?hl=de" target="_blank" rel="noreferrer">Google-Hilfe zum Import</a> · <a href="https://support.google.com/mymaps/answer/3109452?hl=de" target="_blank" rel="noreferrer">Google-Hilfe zum Export</a> · <a href="https://www.ris.bka.gv.at/eli/lgbl/NI/6500/P27/LNO40015750" target="_blank" rel="noreferrer">Jagdgesellschaft und Jagdleiter (§ 27 NÖ Jagdgesetz)</a></p>
    </details>
    <div className="section-actions">
      {canEdit ? <label className="field">KML/KMZ importieren
        <input type="file" accept=".kml,.kmz" disabled={locked} onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (file) void read(file);
        }} />
      </label> : null}
      <button className="button-link" disabled={locked || !saved} onClick={() => {
        try {
          setError(null);
          const blob = new Blob([exportMapKml(saved!)], { type: "application/vnd.google-earth.kml+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a"); link.href = url; link.download = "hege-revierkarte.kml";
          document.body.appendChild(link); link.click(); link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Export fehlgeschlagen."); }
      }}>Gespeicherte Karte als KML exportieren</button>
    </div>
    {!saved && !disabled ? <p>Noch keine Reviergrenze gespeichert.</p> : null}
    {!canEdit ? <p>Du kannst die gespeicherte Karte ansehen und exportieren. Für den Import ist ein Benutzer mit Bearbeitungsrecht erforderlich.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {pending && canEdit ? <fieldset disabled={locked} className="page-stack">
      <legend>Import prüfen</legend>
      <p>{pending.areas.length} Flächen · {pending.areas.reduce((n, a) => n + a.polygons.length, 0)} Teilflächen · {pending.areas.reduce((n, a) => n + a.polygons.reduce((sum, p) => sum + p.length - 1, 0), 0)} innere Ringe. Zuordnung jeder Fläche prüfen; die Vorschläge stammen aus der Datei.</p>
      {pending.warnings.map((warning) => <p key={warning} role="status">{warning}</p>)}
      {pending.areas.map((area, index) => <label className="field" key={area.id}>{area.name}
        <select aria-label={`Flächentyp ${index + 1}: ${area.name}`} value={area.kind} onChange={(event) => {
          const kind = event.target.value as "boundary" | "exclusion";
          setPending({ ...pending, areas: pending.areas.map((a, i) => i === index ? { ...a, kind } : a) });
        }}><option value="boundary">Reviergrenze</option><option value="exclusion">Ausschlussfläche</option></select>
      </label>)}
      <label className="field">Übernahme
        <select aria-label="Übernahme" value={mode} onChange={(event) => setMode(event.target.value as "append" | "replace")}>
          <option value="append" disabled={!currentValid}>Zum Entwurf hinzufügen</option>
          <option value="replace">Entwurf ersetzen</option>
        </select>
      </label>
      <p>Die gespeicherte Grenze und vorhandene Kartenorte bleiben bis zum Speichern unverändert. „Entwurf ersetzen“ ersetzt alle Flächen im aktuellen Entwurf; „Rückgängig“ nimmt die Übernahme zurück.</p>
      <div className="section-actions"><button className="button-link" onClick={() => {
        try { const next = applyMapImport(current, pending.areas, mode); onImport(next); setPending(null); setError(null); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Flächen prüfen."); }
      }}>Als Entwurf übernehmen</button>
      <button className="button-link" onClick={() => { setPending(null); setError(null); }}>Import abbrechen</button></div>
    </fieldset> : null}
  </div>;
}
