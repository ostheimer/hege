"use client";
import { useEffect, useState } from "react";
import {
  replaceMapRing,
  ringVertices,
  validateRevierMap,
  type MapCoordinate,
  type RevierMapData,
  type RingAddress,
} from "@hege/domain";
import { RevierBoundaryMap } from "./revier-boundary-map";
interface Props {
  owner: string;
  canEdit: boolean;
  center: { lat: number; lng: number };
}
interface Version {
  id: string;
  data: RevierMapData;
  savedAt: string;
}
const empty: RevierMapData = {
  source: "Kartenentwurf · nicht amtlich",
  areas: [
    {
      id: "boundary",
      name: "Reviergrenze",
      kind: "boundary",
      polygons: [[[]]],
    },
  ],
};
export function RevierBoundaryEditor({ owner, canEdit, center }: Props) {
  const key = `hege.web-boundary-draft.v1:${owner}`;
  const [map, setMap] = useState<RevierMapData>(empty);
  const [base, setBase] = useState<RevierMapData | null>(null);
  const [revision, setRevision] = useState<string | null>(null);
  const [address, setAddress] = useState<RingAddress>({
    area: 0,
    polygon: 0,
    ring: 0,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [history, setHistory] = useState<RevierMapData[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [ready, setReady] = useState(false);
  const [mapViewKey, setMapViewKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = JSON.stringify(map) !== JSON.stringify(base ?? empty);
  async function loadVersions() {
    const response = await fetch("/api/v1/revier-map/versions");
    if (response.ok) setVersions((await response.json()).versions);
  }
  async function load(restoreDraft = false) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/revier-map");
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "Karte konnte nicht geladen werden.",
        );
      setBase(body.map);
      setMap(body.map ?? structuredClone(empty));
      setRevision(body.revision);
      setAddress({ area: 0, polygon: 0, ring: 0 });
      setSelected(null);
      setHistory([]);
      setConfirmed(false);
      if (restoreDraft && canEdit) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw);
          if (
            draft.map?.areas?.length &&
            draft.map.areas.every(
              (a: RevierMapData["areas"][number]) =>
                Array.isArray(a.polygons) &&
                a.polygons.every(
                  (p) =>
                    Array.isArray(p) &&
                    p.every(
                      (r) =>
                        Array.isArray(r) &&
                        r.every(
                          (point) =>
                            Array.isArray(point) &&
                            point.length === 2 &&
                            point.every(Number.isFinite),
                        ),
                    ),
                ),
            )
          ) {
            setMap(draft.map);
            setRevision(draft.revision);
            setMessage(
              "Lokaler Entwurf wiederhergestellt. Gespeicherte Reviergrenze bleibt bis zur Übernahme unverändert.",
            );
          } else
            throw new Error(
              "Lokaler Entwurf ist ungültig. Gespeicherte Karte erneut laden.",
            );
        }
      }
      setReady(true);
      setMapViewKey((value) => value + 1);
      void loadVersions().catch(() =>
        setMessage("Versionsliste konnte nicht geladen werden."),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Laden fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load(true);
  }, [key]);
  useEffect(() => {
    if (!ready || !canEdit) return;
    try {
      if (dirty) localStorage.setItem(key, JSON.stringify({ map, revision }));
      else localStorage.removeItem(key);
    } catch {
      setError(
        "Lokaler Entwurf konnte nicht gesichert werden. Vor dem Schließen speichern.",
      );
    }
  }, [map, revision, ready, dirty, key, canEdit]);
  function edit(next: RevierMapData) {
    setHistory((previous) => [...previous.slice(-49), map]);
    setMap(next);
    setError(null);
    setMessage(null);
    setConfirmed(false);
  }
  function changePoint(index: number, point: MapCoordinate) {
    const points = ringVertices(map, address);
    points[index] = point;
    edit(replaceMapRing(map, address, points));
  }
  function addArea(kind: "boundary" | "exclusion") {
    const next = structuredClone(map);
    if (kind === "boundary") {
      const a = next.areas.findIndex((area) => area.kind === "boundary");
      if (a >= 0) {
        next.areas[a]!.polygons.push([[]]);
        setAddress({
          area: a,
          polygon: next.areas[a]!.polygons.length - 1,
          ring: 0,
        });
      } else {
        next.areas.push({
          id: crypto.randomUUID(),
          name: "Reviergrenze",
          kind,
          polygons: [[[]]],
        });
        setAddress({ area: next.areas.length - 1, polygon: 0, ring: 0 });
      }
    } else {
      next.areas.push({
        id: crypto.randomUUID(),
        name: "Ausschlussfläche",
        kind,
        polygons: [[[]]],
      });
      setAddress({ area: next.areas.length - 1, polygon: 0, ring: 0 });
    }
    edit(next);
    setSelected(null);
    setAdding(true);
  }
  let validation: string | null = null;
  try {
    validateRevierMap(map);
  } catch (reason) {
    validation = reason instanceof Error ? reason.message : "Grenze prüfen.";
  }
  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/revier-map", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ map, revision, confirmReplace: confirmed }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ??
            "Speichern fehlgeschlagen. Entwurf bleibt erhalten.",
        );
      setBase(body.map);
      setMap(body.map);
      setRevision(body.revision);
      setHistory([]);
      setConfirmed(false);
      setAdding(false);
      setMessage(
        "Reviergrenze gespeichert. Frühere Grenze bleibt als Version wiederherstellbar.",
      );
      void loadVersions().catch(() =>
        setError(
          "Grenze gespeichert. Versionsliste konnte nicht geladen werden.",
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  const points = ringVertices(map, address);
  return (
    <section
      className="section-card page-stack boundary-editor"
      data-testid="boundary-editor"
      aria-busy={busy}
    >
      <header className="section-header">
        <div>
          <h2>Reviergrenze {canEdit ? "bearbeiten" : "ansehen"}</h2>
          <p>
            Grün: Revier · Rot: Ausschlüsse. Der Entwurf ist keine amtlich
            bestätigte Jagdgrenze.
          </p>
        </div>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <RevierBoundaryMap
        key={mapViewKey}
        map={map}
        address={address}
        center={center}
        editable={canEdit && ready && !busy}
        adding={adding}
        selected={selected}
        onSelect={setSelected}
        onAdd={(point) =>
          edit(replaceMapRing(map, address, [...points, point]))
        }
        onMove={changePoint}
      />
      <label className="field">
        Teilfläche oder Ring
        <select
          aria-label="Teilfläche oder Ring"
          value={`${address.area}:${address.polygon}:${address.ring}`}
          disabled={busy}
          onChange={(event) => {
            const [area, polygon, ring] = event.target.value
              .split(":")
              .map(Number);
            setAddress({ area: area!, polygon: polygon!, ring: ring! });
            setSelected(null);
          }}
        >
          {map.areas.flatMap((area, a) =>
            area.polygons.flatMap((polygon, p) =>
              polygon.map((_, r) => (
                <option key={`${a}:${p}:${r}`} value={`${a}:${p}:${r}`}>
                  {area.name} · Teil {p + 1} ·{" "}
                  {r ? `innerer Ring ${r}` : "Außenring"}
                </option>
              )),
            ),
          )}
        </select>
      </label>
      <p>
        {points.length} Punkte im gewählten Ring ·{" "}
        {dirty ? "Ungespeicherter Entwurf" : "Gespeicherter Stand"}
      </p>
      {canEdit ? (
        <>
          <div className="section-actions">
            <button
              className="button-link"
              disabled={!ready || busy}
              aria-pressed={adding}
              onClick={() => setAdding(!adding)}
            >
              {adding ? "Punktsetzen beenden" : "Punkte auf Karte setzen"}
            </button>
            <button
              className="button-link"
              disabled={!ready || busy}
              onClick={() => addArea("boundary")}
            >
              Weitere Teilfläche
            </button>
            <button
              className="button-link"
              disabled={!ready || busy}
              onClick={() => addArea("exclusion")}
            >
              Ausschlussfläche hinzufügen
            </button>
            <button
              className="button-link"
              disabled={!ready || busy || !map.areas[address.area]}
              onClick={() => {
                const next = structuredClone(map);
                const polygon =
                  next.areas[address.area]!.polygons[address.polygon]!;
                polygon.push([]);
                edit(next);
                setAddress({ ...address, ring: polygon.length - 1 });
                setSelected(null);
                setAdding(true);
              }}
            >
              Inneren Ring hinzufügen
            </button>
          </div>
          <p>
            Zum Ergänzen „Punkte auf Karte setzen“ aktivieren und auf die Karte
            klicken. Punkte ziehen zum Verschieben.
          </p>
          {points.length <= 20 ? (
            <div className="section-actions">
              {points.map((_, index) => (
                <button
                  key={index}
                  className="button-link"
                  aria-label={`Grenzpunkt ${index + 1} auswählen`}
                  aria-pressed={selected === index}
                  disabled={busy}
                  onClick={() => setSelected(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          ) : (
            <label className="field">
              Grenzpunkt
              <select
                aria-label="Grenzpunkt auswählen"
                value={selected ?? ""}
                disabled={busy}
                onChange={(event) =>
                  setSelected(
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              >
                <option value="">Punkt auswählen</option>
                {points.map((_, index) => (
                  <option key={index} value={index}>
                    {index + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="section-actions">
            <button
              className="button-link"
              disabled={busy || selected === null}
              onClick={() => {
                edit(
                  replaceMapRing(
                    map,
                    address,
                    points.filter((_, index) => index !== selected),
                  ),
                );
                setSelected(null);
              }}
            >
              Gewählten Punkt entfernen
            </button>
            <button
              className="button-link"
              disabled={busy || !history.length}
              onClick={() => {
                setMap(history.at(-1)!);
                setHistory(history.slice(0, -1));
                setSelected(null);
                setAddress({ area: 0, polygon: 0, ring: 0 });
                setConfirmed(false);
              }}
            >
              Rückgängig
            </button>
            <button
              className="button-link"
              disabled={busy || !map.areas[address.area]}
              onClick={() => {
                if (
                  !window.confirm(
                    "Gewählten Ring oder Teilfläche aus dem Entwurf entfernen?",
                  )
                )
                  return;
                const next = structuredClone(map);
                const area = next.areas[address.area]!;
                if (address.ring)
                  area.polygons[address.polygon]!.splice(address.ring, 1);
                else area.polygons.splice(address.polygon, 1);
                if (!area.polygons.length) next.areas.splice(address.area, 1);
                if (!next.areas.length)
                  next.areas = structuredClone(empty.areas);
                edit(next);
                setAddress({ area: 0, polygon: 0, ring: 0 });
                setSelected(null);
              }}
            >
              Ring oder Teilfläche entfernen
            </button>
          </div>
          {validation ? (
            <p>{validation}</p>
          ) : (
            <p>
              Ringe geschlossen und Mindestfläche erfüllt. Die Lage der inneren
              Ringe und Überschneidungen werden beim Speichern geprüft.
            </p>
          )}
          {base ? (
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              />{" "}
              Bestehende Reviergrenze bewusst ändern
            </label>
          ) : null}
          <div className="section-actions">
            <button
              className="button-link"
              disabled={
                !ready ||
                busy ||
                !dirty ||
                !!validation ||
                (!!base && !confirmed)
              }
              onClick={() => void save()}
            >
              Reviergrenze speichern
            </button>
            <button
              className="button-link"
              disabled={busy}
              onClick={() => {
                if (
                  dirty &&
                  !window.confirm(
                    "Lokalen Entwurf verwerfen und gespeicherte Karte neu laden?",
                  )
                )
                  return;
                localStorage.removeItem(key);
                setMessage(null);
                setAdding(false);
                void load();
              }}
            >
              Gespeicherte Karte neu laden
            </button>
          </div>
          {versions.length ? (
            <details>
              <summary>Frühere Grenzen ({versions.length})</summary>
              {versions.map((version) => (
                <div key={version.id} className="section-actions">
                  <span>
                    {new Date(version.savedAt).toLocaleString("de-AT")}
                  </span>
                  <button
                    className="button-link"
                    disabled={busy}
                    onClick={() => {
                      if (
                        dirty &&
                        !window.confirm(
                          "Aktuellen Entwurf durch diese frühere Grenze ersetzen?",
                        )
                      )
                        return;
                      edit(version.data);
                      setAddress({ area: 0, polygon: 0, ring: 0 });
                      setSelected(null);
                    }}
                  >
                    Version als Entwurf laden
                  </button>
                </div>
              ))}
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
