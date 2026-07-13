"use client";

import type { AnsitzSession, FallwildVorgang, GeoPoint, Reviereinrichtung } from "@hege/domain";
import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { useMemo, useState } from "react";

import { formatEinrichtungTyp, formatEinrichtungZustand } from "../lib/labels";

const MAP_ID_FALLBACK = "hege-revier-map";
const FALLBACK_CENTER = { lat: 48.339, lng: 16.72 };

export type TerritoryMarkerType = "Einrichtung" | "Ansitz" | "Fallwild" | "Reviermeldung";

export interface TerritoryMarker {
  id: string;
  type: TerritoryMarkerType;
  title: string;
  position: { lat: number; lng: number };
  description?: string;
  meta?: ReadonlyArray<{ label: string; value: string }>;
  href?: string;
}

interface TerritoryMapProps {
  revierName: string;
  revierCenter?: GeoPoint;
  ansitze?: AnsitzSession[];
  einrichtungen?: Reviereinrichtung[];
  fallwild?: FallwildVorgang[];
  markers?: TerritoryMarker[];
}

export function TerritoryMap({
  revierName,
  revierCenter,
  ansitze = [],
  einrichtungen = [],
  fallwild = [],
  markers: extraMarkers = []
}: TerritoryMapProps) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? MAP_ID_FALLBACK;
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const markers = useMemo(
    () =>
      [
        ...einrichtungen.map((entry) => ({
          id: `einrichtung-${entry.id}`,
          type: "Einrichtung" as const,
          title: entry.name,
          position: { lat: entry.location.lat, lng: entry.location.lng },
          description: entry.beschreibung ?? entry.location.label,
          meta: [
            { label: "Typ", value: formatEinrichtungTyp(entry.type) },
            { label: "Status", value: formatEinrichtungZustand(entry.status) },
            ...(entry.orientationDegrees !== undefined
              ? [{ label: "Ausrichtung", value: `${Math.round(entry.orientationDegrees)}°` }]
              : []),
            { label: "Fotos", value: `${entry.photos.length}` },
            { label: "Offene Wartungen", value: `${entry.wartung.filter((item) => item.status === "offen").length}` }
          ],
          href: "/app/reviereinrichtungen"
        })),
        ...ansitze.map((entry) => ({
          id: `ansitz-${entry.id}`,
          type: "Ansitz" as const,
          title: entry.standortName,
          position: { lat: entry.location.lat, lng: entry.location.lng },
          description: entry.location.label ?? entry.note,
          meta: [
            { label: "Status", value: entry.status === "active" ? "aktiv" : "beendet" },
            { label: "Konflikt", value: entry.conflict ? "ja" : "nein" }
          ],
          href: "/app/ansitze"
        })),
        ...fallwild.map((entry) => ({
          id: `fallwild-${entry.id}`,
          type: "Fallwild" as const,
          title: `${entry.wildart} · ${entry.gemeinde}`,
          position: { lat: entry.location.lat, lng: entry.location.lng },
          description: entry.location.addressLabel ?? entry.location.label ?? entry.strasse,
          meta: [
            { label: "Status", value: formatBergungsStatus(entry.bergungsStatus) },
            { label: "Straße", value: entry.strasse ?? "nicht hinterlegt" },
            { label: "Fotos", value: `${entry.photos.length}` }
          ],
          href: "/app/fallwild"
        })),
        ...extraMarkers
      ].filter((marker) => Number.isFinite(marker.position.lat) && Number.isFinite(marker.position.lng)),
    [ansitze, einrichtungen, fallwild, extraMarkers]
  );
  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) ?? markers[0];
  const center = resolveMapCenter(revierCenter, markers);

  if (!apiKey) {
    return <TerritoryMapFallback markers={markers} revierName={revierName} />;
  }

  return (
    <div className="map-stage" aria-label={`Revierkarte ${revierName}`}>
      <APIProvider apiKey={apiKey} libraries={["marker"]}>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          mapId={mapId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
        >
          {markers.map((marker) => (
            <AdvancedMarker
              key={marker.id}
              onClick={() => setSelectedMarkerId(marker.id)}
              position={marker.position}
              title={marker.title}
            >
              <Pin
                background={pinColor(marker.type)}
                borderColor={selectedMarker?.id === marker.id ? "#fff9ef" : "#102218"}
                glyph={pinGlyph(marker.type)}
                glyphColor="#fff9ef"
                scale={selectedMarker?.id === marker.id ? 1.18 : 1}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
      <MapLegend markers={markers} />
      <MapDetailCard marker={selectedMarker} />
    </div>
  );
}

function resolveMapCenter(revierCenter: GeoPoint | undefined, markers: TerritoryMarker[]) {
  if (revierCenter && Number.isFinite(revierCenter.lat) && Number.isFinite(revierCenter.lng)) {
    return { lat: revierCenter.lat, lng: revierCenter.lng };
  }

  if (markers.length === 0) {
    return FALLBACK_CENTER;
  }

  return {
    lat: markers.reduce((sum, marker) => sum + marker.position.lat, 0) / markers.length,
    lng: markers.reduce((sum, marker) => sum + marker.position.lng, 0) / markers.length
  };
}

function pinColor(type: TerritoryMarkerType): string {
  switch (type) {
    case "Einrichtung":
      return "#9db36f";
    case "Ansitz":
      return "#24493a";
    case "Fallwild":
      return "#9d4a3f";
    case "Reviermeldung":
      return "#d6a23c";
  }
}

function pinGlyph(type: TerritoryMarkerType): string {
  switch (type) {
    case "Einrichtung":
      return "E";
    case "Ansitz":
      return "A";
    case "Fallwild":
      return "F";
    case "Reviermeldung":
      return "M";
  }
}

interface TerritoryMapFallbackProps {
  revierName: string;
  markers: TerritoryMarker[];
}

function TerritoryMapFallback({ revierName, markers }: TerritoryMapFallbackProps) {
  return (
    <div className="map-stage" aria-label={`Revierkarte ${revierName}`}>
      <div className="map-grid" />
      <div className="map-fallback-note">
        <p className="eyebrow">Karte deaktiviert</p>
        <p>Für die echte Karte ist noch kein Google-Maps-Key hinterlegt.</p>
        <p>
          {markers.length > 0
            ? `${markers.length} Marker im Datensatz: ${summarizeMarkers(markers)}.`
            : "Aktuell keine Marker im Revier hinterlegt."}
        </p>
        {markers.length > 0 ? (
          <div className="map-fallback-list" aria-label="Marker als Liste">
            {markers.slice(0, 8).map((marker) => (
              <span key={marker.id}>
                <strong>{marker.type}</strong> {marker.title}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MapLegend({ markers }: { markers: TerritoryMarker[] }) {
  const visibleTypes = markerTypes.filter((type) => markers.some((marker) => marker.type === type));

  if (visibleTypes.length === 0) {
    return null;
  }

  return (
    <div className="map-legend" aria-label="Kartenlegende">
      {visibleTypes.map((type) => (
        <span key={type}>
          <i style={{ backgroundColor: pinColor(type) }} />
          {type}
        </span>
      ))}
    </div>
  );
}

function MapDetailCard({ marker }: { marker?: TerritoryMarker }) {
  if (!marker) {
    return null;
  }

  return (
    <aside className="map-detail-card" aria-live="polite">
      <span className="eyebrow">{marker.type}</span>
      <strong>{marker.title}</strong>
      {marker.description ? <p>{marker.description}</p> : null}
      {marker.meta && marker.meta.length > 0 ? (
        <dl>
          {marker.meta.map((entry) => (
            <div key={`${entry.label}-${entry.value}`}>
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {marker.href ? <a href={marker.href}>Details öffnen</a> : null}
    </aside>
  );
}

const markerTypes: TerritoryMarkerType[] = ["Einrichtung", "Ansitz", "Fallwild", "Reviermeldung"];

export function summarizeMarkers(markers: TerritoryMarker[]): string {
  const counts = Object.fromEntries(markerTypes.map((type) => [type, 0])) as Record<TerritoryMarkerType, number>;

  for (const marker of markers) {
    counts[marker.type] += 1;
  }

  return markerTypes
    .map((type) => (counts[type] > 0 ? `${counts[type]}× ${type}` : null))
    .filter(Boolean)
    .join(", ");
}

function formatBergungsStatus(status: FallwildVorgang["bergungsStatus"]) {
  switch (status) {
    case "erfasst":
      return "erfasst";
    case "geborgen":
      return "geborgen";
    case "entsorgt":
      return "entsorgt";
    case "an-behoerde-gemeldet":
      return "an Behörde gemeldet";
  }
}
