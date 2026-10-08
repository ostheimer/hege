import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import {
  canRoleAccess,
  mapBounds,
  type RevierMapData,
  type ReviereinrichtungListItem,
} from "@hege/domain";
import { useSessionSnapshot } from "../lib/session";
import { fetchRevierMap, fetchReviereinrichtungenList } from "../lib/api";
import { useThemeColors } from "../lib/theme";
import { cardSurface } from "../lib/surfaces";
import { FacilityIcon } from "./facility-icon";
import { viewCone } from "../lib/facility-map-overlays";
import { formatEinrichtungTyp } from "../lib/reviereinrichtung";
import { formatEinrichtungZustand } from "../lib/format";
import { buildInitialRegion } from "./map-preview.helpers";

export function RevierMapCard({
  revierId,
  name,
  expanded = false,
}: {
  revierId: string;
  name: string;
  expanded?: boolean;
}) {
  const [result, setResult] = useState<{
    revierId: string;
    map: RevierMapData | null;
    facilities: ReviereinrichtungListItem[];
  } | null>(null);
  const [error, setError] = useState(false);
  const [facilityError, setFacilityError] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  const theme = useThemeColors();
  const router = useRouter();
  const session = useSessionSnapshot().session;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(false);
      setFacilityError(false);
      void Promise.allSettled([
        fetchRevierMap(),
        fetchReviereinrichtungenList(),
      ]).then(([mapResult, facilitiesResult]) => {
        if (!active) return;
        setError(mapResult.status === "rejected");
        setFacilityError(facilitiesResult.status === "rejected");
        setResult({
          revierId,
          map: mapResult.status === "fulfilled" ? mapResult.value.map : null,
          facilities:
            facilitiesResult.status === "fulfilled"
              ? facilitiesResult.value.filter(
                  (entry) => entry.revierId === revierId,
                )
              : [],
        });
      });
      return () => {
        active = false;
      };
    }, [revierId]),
  );
  const map = result?.revierId === revierId ? result.map : null;
  const facilities = result?.revierId === revierId ? result.facilities : [];
  const region = map
    ? mapBounds(map.areas)
    : facilities.length
      ? buildInitialRegion(session?.revier.zentrum, facilities)
      : null;
  const supported =
    Platform.OS === "ios" ||
    (Platform.OS === "android" &&
      Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY));
  return (
    <View
      style={[cardSurface(theme), { padding: 16, gap: 12 }]}
      testID="home-revier-map"
    >
      <Text style={{ color: theme.ink, fontSize: 20, fontWeight: "700" }}>
        Revierkarte
      </Text>
      <Text style={{ color: theme.ink }}>{name}</Text>
      {(map || facilities.length) && region && supported ? (
        <MapView
          key={revierId + JSON.stringify(region)}
          style={{ height: expanded ? 480 : 260, borderRadius: 16 }}
          initialRegion={region}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          accessibilityLabel={`Revierkarte ${name}, mit Grenze und Ausschlussflächen`}
        >
          {map?.areas.flatMap((area) =>
            area.polygons.map((polygon, index) => (
              <Polygon
                key={`${area.id}-${index}`}
                coordinates={polygon[0].map(([longitude, latitude]) => ({
                  latitude,
                  longitude,
                }))}
                holes={polygon
                  .slice(1)
                  .map((ring) =>
                    ring.map(([longitude, latitude]) => ({
                      latitude,
                      longitude,
                    })),
                  )}
                strokeColor={area.kind === "exclusion" ? "#b54326" : "#24613e"}
                fillColor={
                  area.kind === "exclusion"
                    ? "rgba(181,67,38,0.35)"
                    : "rgba(36,97,62,0.18)"
                }
                strokeWidth={2}
              />
            )),
          )}
          {facilities.map((entry) => {
            const cone = viewCone(entry.location, entry.orientationDegrees);
            return cone.length ? (
              <Polygon
                key={`view-${entry.id}`}
                coordinates={cone}
                fillColor="rgba(202,174,66,0.28)"
                strokeColor="#CAAE42"
                strokeWidth={2}
              />
            ) : null;
          })}
          {facilities.map((entry) => (
            <Marker
              key={entry.id}
              testID={`revier-map-facility-${entry.id}`}
              coordinate={{
                latitude: entry.location.lat,
                longitude: entry.location.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              title={entry.name}
              description={`${formatEinrichtungTyp(entry.type)} · ${formatEinrichtungZustand(entry.status)}`}
              onPress={() =>
                router.push(`/reviereinrichtung/${entry.id}` as never)
              }
            >
              <View
                style={{
                  padding: 7,
                  borderRadius: 24,
                  backgroundColor: theme.card,
                  borderWidth: 2,
                  borderColor: theme.ink,
                }}
              >
                <FacilityIcon type={entry.type} color={theme.ink} size={26} />
              </View>
            </Marker>
          ))}
          {showPlaces
            ? map?.places?.map((place) => (
                <Marker
                  key={place.id}
                  coordinate={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                  }}
                  title={place.name}
                  description={
                    place.locationCheck === "outside"
                      ? "Außerhalb der importierten Grenze · Zuordnung prüfen"
                      : place.locationCheck === "exclusion"
                        ? "In einer Ausschlussfläche · Zuordnung prüfen"
                        : "Originaler Kartenort · Zustand und Einrichtungstyp ungeprüft"
                  }
                  pinColor="#b57816"
                />
              ))
            : null}
        </MapView>
      ) : (
        <Text style={{ color: theme.ink }}>
          {error
            ? "Revierkarte konnte nicht geladen werden."
            : !result
              ? "Revierkarte wird geladen …"
              : !map
                ? "Noch keine Reviergrenze hinterlegt."
                : "Die Kartenansicht ist auf diesem Gerät nicht verfügbar."}
        </Text>
      )}
      {map ? (
        <Text style={{ color: theme.ink }}>
          Grün: Reviergrenze · Rot: Ausschlussflächen. Quelle: {map.source}.
          Keine amtliche Grenzfeststellung.
        </Text>
      ) : null}
      {result ? (
        <Text testID="revier-map-facility-count" style={{ color: theme.ink }}>
          {facilities.length} Einrichtungen · Zum Öffnen auf das Symbol tippen.
        </Text>
      ) : null}
      {facilityError ? (
        <Text style={{ color: theme.ink }}>
          Einrichtungen konnten nicht geladen werden. Die Reviergrenze bleibt
          sichtbar.
        </Text>
      ) : null}
      {map?.places?.length ? (
        <>
          <Pressable
            testID="revier-map-places-toggle"
            accessibilityRole="button"
            accessibilityState={{ expanded: showPlaces }}
            onPress={() => setShowPlaces((value) => !value)}
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ color: theme.ink, fontWeight: "600" }}>
              {showPlaces
                ? "Ungeprüfte Kartenorte ausblenden"
                : `Ungeprüfte Kartenorte einblenden (${map.places.length})`}
            </Text>
          </Pressable>
          {showPlaces ? (
            <Text style={{ color: theme.ink }}>
              Orange: ungeprüfte Kartenorte, keine bestätigten Einrichtungen.
              Typ, Zustand und Grenzzuordnung vor Ort prüfen.
            </Text>
          ) : null}
        </>
      ) : null}
      {!expanded && (map || facilities.length) ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/revierkarte" as never)}
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ color: theme.ink, fontWeight: "600" }}>
            Karte vergrößern
          </Text>
        </Pressable>
      ) : null}
      {session &&
      canRoleAccess(session.membership.role, "revier-map-manage") ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/revierkarte-erfassen" as never)}
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ color: theme.ink, fontWeight: "600" }}>
            Grenze per GPS aufzeichnen
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
