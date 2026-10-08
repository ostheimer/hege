"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  mapBounds,
  ringVertices,
  type MapCoordinate,
  type RevierMapData,
  type RingAddress,
} from "@hege/domain";
interface Props {
  map: RevierMapData;
  address: RingAddress;
  center: { lat: number; lng: number };
  editable: boolean;
  adding: boolean;
  selected: number | null;
  onAdd: (point: MapCoordinate) => void;
  onSelect: (index: number) => void;
  onMove: (index: number, point: MapCoordinate) => void;
}
export function RevierBoundaryMap(props: Props) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [loadError, setLoadError] = useState(false);
  const key =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY?.trim();
  const initialBounds = useMemo(() => mapBounds(props.map.areas), []);
  const initialCenter = initialBounds
    ? { lat: initialBounds.latitude, lng: initialBounds.longitude }
    : props.center;
  return key ? (
    <APIProvider
      apiKey={key}
      language="de"
      region="AT"
      onError={() => setLoadError(true)}
    >
      {loadError ? (
        <p role="alert">
          Die Google-Karte konnte nicht geladen werden. Dein Grenzentwurf bleibt erhalten.
        </p>
      ) : null}
      <div className="section-actions" aria-label="Kartenunterlage">
        <button
          className="button-link"
          aria-pressed={mapType === "roadmap"}
          onClick={() => setMapType("roadmap")}
        >
          Karte
        </button>
        <button
          className="button-link"
          aria-pressed={mapType === "satellite"}
          onClick={() => setMapType("satellite")}
        >
          Satellit
        </button>
      </div>
      <Map
        defaultCenter={initialCenter}
        defaultZoom={13}
        // Google verlangt für AdvancedMarker eine gültige Karten-ID.
        // Produktion verwendet eine eigene ID; DEMO_MAP_ID dient der lokalen Prüfung.
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID"}
        mapTypeId={mapType}
        style={{ height: 480, borderRadius: 16 }}
        mapTypeControl={false}
        gestureHandling="greedy"
        onClick={(event) => {
          if (props.editable && props.adding && event.detail.latLng)
            props.onAdd([event.detail.latLng.lng, event.detail.latLng.lat]);
        }}
      >
        <GoogleBoundaryLayer {...props} />
      </Map>
    </APIProvider>
  ) : (
    <SchematicMap {...props} />
  );
}
function GoogleBoundaryLayer(props: Props) {
  const map = useMap();
  const maps = useMapsLibrary("maps");
  const initialBounds = useRef(mapBounds(props.map.areas));
  useEffect(() => {
    const bounds = initialBounds.current;
    if (map && bounds)
      map.fitBounds({
        south: bounds.latitude - bounds.latitudeDelta / 2,
        north: bounds.latitude + bounds.latitudeDelta / 2,
        west: bounds.longitude - bounds.longitudeDelta / 2,
        east: bounds.longitude + bounds.longitudeDelta / 2,
      });
  }, [map]);
  useEffect(() => {
    if (!map || !maps) return;
    const polygons = props.map.areas.flatMap((area) =>
      area.polygons.map((polygon) => {
        const winding = (ring: MapCoordinate[]) =>
          ring.reduce((sum, p, i) => {
            const next = ring[(i + 1) % ring.length]!;
            return sum + p[0] * next[1] - next[0] * p[1];
          }, 0);
        const outerSign = Math.sign(winding(polygon[0]!));
        const paths = polygon.map((ring, i) =>
          (i && Math.sign(winding(ring)) === outerSign
            ? [...ring].reverse()
            : ring
          ).map(([lng, lat]) => ({ lat, lng })),
        );
        return new maps.Polygon({
          map,
          paths,
          clickable: false,
          strokeColor: area.kind === "boundary" ? "#24613e" : "#b54326",
          fillColor: area.kind === "boundary" ? "#24613e" : "#b54326",
          fillOpacity: 0.18,
          strokeWeight: 2,
        });
      }),
    );
    return () => polygons.forEach((polygon) => polygon.setMap(null));
  }, [map, maps, props.map]);
  return ringVertices(props.map, props.address).map(([lng, lat], index) => (
    <AdvancedMarker
      key={index}
      position={{ lat, lng }}
      title={`Punkt ${index + 1}`}
      draggable={props.editable}
      onClick={(event) => {
        event.stop();
        props.onSelect(index);
      }}
      onDragEnd={(event) => {
        if (event.latLng)
          props.onMove(index, [event.latLng.lng(), event.latLng.lat()]);
      }}
    >
      <span
        data-testid={`map-point-${index}`}
        style={{
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          borderRadius: 14,
          background: props.selected === index ? "#CAAE42" : "#24613e",
          color: "white",
          border: "2px solid white",
        }}
      >
        {index + 1}
      </span>
    </AdvancedMarker>
  ));
}
/** Ohne Browser-Schlüssel bleibt der Punkteditor lokal als ausdrücklich schematische Karte nutzbar. */
function SchematicMap(props: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const drag = useRef<number | null>(null);
  const moved = useRef(false);
  const [dragPreview, setDragPreview] = useState<MapCoordinate | null>(null);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0)
        setCanvasWidth(entry.contentRect.width);
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);
  // Der Ausschnitt bleibt beim Zeichnen stabil und wird nur beim Laden neu gewählt.
  const bounds = useMemo(
    () =>
      mapBounds(props.map.areas) ?? {
        latitude: props.center.lat,
        longitude: props.center.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.018,
      },
    [props.center],
  );
  const xy = ([lng, lat]: MapCoordinate): [number, number] => [
    ((lng - bounds.longitude) / bounds.longitudeDelta) * canvasWidth +
      canvasWidth / 2,
    250 - ((lat - bounds.latitude) / bounds.latitudeDelta) * 500,
  ];
  const coordinate = (
    event: React.PointerEvent<SVGSVGElement>,
  ): MapCoordinate => {
    const rect = svg.current!.getBoundingClientRect();
    return [
      bounds.longitude +
        ((event.clientX - rect.left) / rect.width - 0.5) *
          bounds.longitudeDelta,
      bounds.latitude +
        (0.5 - (event.clientY - rect.top) / rect.height) * bounds.latitudeDelta,
    ];
  };
  return (
    <div>
      <p className="muted">
        Schematische Ansicht – Kartenunterlage derzeit nicht verfügbar.
      </p>
      <svg
        ref={svg}
        data-testid="boundary-map"
        role="img"
        aria-label="Reviergrenze auf der Karte bearbeiten"
        viewBox={`0 0 ${canvasWidth} 500`}
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 480,
          background: "#eef0df",
          borderRadius: 16,
          touchAction: "none",
        }}
        onPointerDown={(event) => {
          if (
            props.editable &&
            (event.target as Element).tagName === "circle"
          ) {
            drag.current = Number(
              (event.target as Element).getAttribute("data-point"),
            );
            moved.current = false;
            svg.current?.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (drag.current !== null && props.editable) {
            moved.current = true;
            setDragPreview(coordinate(event));
          }
        }}
        onPointerUp={(event) => {
          if (drag.current !== null) {
            if (moved.current) props.onMove(drag.current, coordinate(event));
            props.onSelect(drag.current);
            drag.current = null;
            setDragPreview(null);
          } else if (props.editable && props.adding && !moved.current)
            props.onAdd(coordinate(event));
          moved.current = false;
        }}
      >
        <defs>
          <pattern
            id="boundary-grid"
            width="80"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 80 0 L 0 0 0 50" fill="none" stroke="#cdd3bb" />
          </pattern>
        </defs>
        <rect width={canvasWidth} height="500" fill="url(#boundary-grid)" />
        {props.map.areas.flatMap((area) =>
          area.polygons.map((polygon, p) => (
            <path
              key={`${area.id}-${p}`}
              d={polygon
                .map(
                  (ring) =>
                    ring
                      .map(
                        (point, i) => `${i ? "L" : "M"}${xy(point).join(" ")}`,
                      )
                      .join(" ") + " Z",
                )
                .join(" ")}
              fillRule="evenodd"
              fill={area.kind === "boundary" ? "#24613e22" : "#b5432655"}
              stroke={area.kind === "boundary" ? "#24613e" : "#b54326"}
              strokeWidth="2"
              pointerEvents="none"
            />
          )),
        )}
        {ringVertices(props.map, props.address).map((point, i) => {
          const [cx, cy] = xy(
            drag.current === i && dragPreview ? dragPreview : point,
          );
          return (
            <g key={i}>
              <circle
                data-testid={`map-point-${i}`}
                data-point={i}
                cx={cx}
                cy={cy}
                r="12"
                fill={props.selected === i ? "#CAAE42" : "#24613e"}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                pointerEvents="none"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
