import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { canRoleAccess, mapBounds, type RevierMapData } from "@hege/domain";
import { useSessionSnapshot } from "../lib/session";
import { fetchRevierMap } from "../lib/api";
import { useThemeColors } from "../lib/theme";
import { cardSurface } from "../lib/surfaces";

export function RevierMapCard({ revierId, name, expanded = false }: { revierId: string; name: string; expanded?: boolean }) {
  const [result, setResult] = useState<{ revierId: string; map: RevierMapData | null } | null>(null);
  const [error, setError] = useState(false);
  const theme = useThemeColors();
  const router = useRouter();
  const session = useSessionSnapshot().session;
  useFocusEffect(useCallback(() => {
    let active = true;
    setError(false);
    void fetchRevierMap().then(({ map }) => { if (active) setResult({ revierId, map }); })
      .catch(() => { if (active) { setResult(null); setError(true); } });
    return () => { active = false; };
  }, [revierId]));
  const map = result?.revierId === revierId ? result.map : null;
  const region = map ? mapBounds(map.areas) : null;
  const supported = Platform.OS === "ios" || (Platform.OS === "android" && Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY));
  return <View style={[cardSurface(theme), { padding: 16, gap: 12 }]} testID="home-revier-map">
    <Text style={{ color: theme.ink, fontSize: 20, fontWeight: "700" }}>Revierkarte</Text>
    <Text style={{ color: theme.ink }}>{name}</Text>
    {map && region && supported ? <MapView key={revierId + JSON.stringify(region)}
      style={{ height: expanded ? 480 : 260, borderRadius: 16 }} initialRegion={region}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      accessibilityLabel={`Revierkarte ${name}, mit Grenze und Ausschlussflächen`}>
      {map.areas.flatMap(area => area.polygons.map((polygon, index) => <Polygon
        key={`${area.id}-${index}`}
        coordinates={polygon[0].map(([longitude, latitude]) => ({ latitude, longitude }))}
        holes={polygon.slice(1).map(ring => ring.map(([longitude, latitude]) => ({ latitude, longitude })))}
        strokeColor={area.kind === "exclusion" ? "#b54326" : "#24613e"}
        fillColor={area.kind === "exclusion" ? "rgba(181,67,38,0.35)" : "rgba(36,97,62,0.18)"}
        strokeWidth={2} />))}
      {map.places?.map(place => <Marker key={place.id}
        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
        title={place.name}
        description={place.locationCheck === "outside" ? "Außerhalb der importierten Grenze · Zuordnung prüfen" : place.locationCheck === "exclusion" ? "In einer Ausschlussfläche · Zuordnung prüfen" : "Originaler Kartenort · Zustand und Einrichtungstyp ungeprüft"}
        pinColor={place.locationCheck === "inside" ? "#24613e" : "#b57816"} />)}
    </MapView> : <Text style={{ color: theme.ink }}>
      {error ? "Revierkarte konnte nicht geladen werden." : !result ? "Revierkarte wird geladen …" : !map ? "Noch keine Reviergrenze hinterlegt." : "Die Kartenansicht ist auf diesem Gerät nicht verfügbar."}
    </Text>}
    {map ? <Text style={{ color: theme.ink }}>Grün: Reviergrenze · Rot: Ausschlussflächen. Quelle: {map.source}. Keine amtliche Grenzfeststellung.</Text> : null}
    {map?.places?.length ? <Text style={{ color: theme.ink }}>{map.places.length} originale Kartenorte. Orange: Grenzzuordnung prüfen. Zustand und Einrichtungstyp sind noch nicht bestätigt.</Text> : null}
    {!expanded && map ? <Pressable accessibilityRole="button" onPress={() => router.push("/revierkarte" as never)} style={{ paddingVertical: 12 }}>
      <Text style={{ color: theme.ink, fontWeight: "600" }}>Karte vergrößern</Text>
    </Pressable> : null}
    {session && canRoleAccess(session.membership.role, "revier-map-manage") ? <Pressable accessibilityRole="button" onPress={() => router.push("/revierkarte-erfassen" as never)} style={{ paddingVertical: 12 }}>
      <Text style={{ color: theme.ink, fontWeight: "600" }}>Grenze per GPS aufzeichnen</Text>
    </Pressable> : null}
  </View>;
}
