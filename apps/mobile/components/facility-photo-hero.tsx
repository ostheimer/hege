import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";

import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

export interface FacilityHeroPhoto {
  id: string;
  title: string;
  uri: string;
}

interface FacilityPhotoHeroProps {
  photos: ReadonlyArray<FacilityHeroPhoto>;
  title: string;
  mode: "capture" | "detail";
  busy?: boolean;
  onCamera?: () => void;
  onLibrary?: () => void;
  onRemove?: (id: string) => void;
}

export function FacilityPhotoHero({
  photos,
  title,
  mode,
  busy = false,
  onCamera,
  onLibrary,
  onRemove
}: FacilityPhotoHeroProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedPhotoIds, setFailedPhotoIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(photos.length - 1, 0)));
    setFailedPhotoIds((current) => new Set([...current].filter((id) => photos.some((photo) => photo.id === id))));
  }, [photos.length]);

  function updatePage(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    setActiveIndex(Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
  }

  return (
    <View
      accessibilityLabel={photos.length ? `${photos.length} Fotos von ${title}. Horizontal wischen, um weitere Fotos zu sehen.` : `Noch kein Foto für ${title}.`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.root}
      testID="reviereinrichtung-photo-hero"
    >
      {photos.length && width ? (
        <View style={styles.mediaFrame}>
          <ScrollView
            accessibilityRole="adjustable"
            horizontal
            onMomentumScrollEnd={updatePage}
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {photos.map((photo, index) => (
              <View key={photo.id} style={[styles.slide, { width }]}>
                <Image
                  accessibilityLabel={photo.title}
                  onError={() => setFailedPhotoIds((current) => new Set(current).add(photo.id))}
                  source={{ uri: photo.uri }}
                  style={styles.image}
                />
                {failedPhotoIds.has(photo.id) ? (
                  <View style={styles.imageError}>
                    <Ionicons color="#fff" name="image-outline" size={34} />
                    <Text style={styles.imageErrorText}>Foto nicht verfügbar</Text>
                  </View>
                ) : null}
                <LinearGradient colors={["transparent", "rgba(10,28,21,0.82)"]} style={styles.gradient} />
                <Text numberOfLines={1} style={styles.title}>{title}</Text>
                {mode === "capture" && onRemove ? (
                  <Pressable
                    accessibilityLabel={`Foto ${index + 1} entfernen`}
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={() => onRemove(photo.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons color="#fff" name="trash-outline" size={20} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <View pointerEvents="none" style={styles.counter} testID="reviereinrichtung-photo-counter"><Text style={styles.counterText}>{activeIndex + 1} / {photos.length}</Text></View>
          {photos.length > 1 ? (
            <View pointerEvents="none" style={styles.dots}>
              {photos.map((photo, index) => <View key={photo.id} style={[styles.dot, index === activeIndex ? styles.dotActive : null]} />)}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons color={theme.muted} name="camera-outline" size={42} />
          <Text style={styles.emptyTitle}>Foto der Einrichtung</Text>
          <Text style={styles.emptyCopy}>Das erste Foto wird zum Titelbild. Weitere Fotos können oben durchgewischt werden.</Text>
          {mode === "capture" ? (
            <View style={styles.emptyActions}>
              <PhotoAction icon="camera" label="Aufnehmen" onPress={onCamera} busy={busy} styles={styles} theme={theme} />
              <PhotoAction icon="images-outline" label="Mediathek" onPress={onLibrary} busy={busy} styles={styles} theme={theme} />
            </View>
          ) : null}
        </View>
      )}
      {mode === "capture" && photos.length ? (
        <View style={styles.manageRow}>
          <PhotoAction icon="camera" label="Foto aufnehmen" onPress={onCamera} busy={busy} styles={styles} theme={theme} compact />
          <PhotoAction icon="images-outline" label="Aus Mediathek" onPress={onLibrary} busy={busy} styles={styles} theme={theme} compact />
        </View>
      ) : null}
    </View>
  );
}

function PhotoAction({ icon, label, onPress, busy, styles, theme, compact = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  busy: boolean;
  compact?: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: ThemeColors;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={!onPress || busy}
      onPress={onPress}
      style={({ pressed }) => [compact ? styles.manageButton : styles.emptyButton, pressed ? styles.pressed : null, busy ? styles.disabled : null]}
    >
      {busy ? <ActivityIndicator color={theme.ink} /> : <Ionicons color={theme.ink} name={icon} size={21} />}
      <Text style={compact ? styles.manageText : styles.emptyButtonText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: ThemeColors) => ({
  root: { width: "100%", gap: 10 },
  mediaFrame: { height: 300, overflow: "hidden", borderRadius: 22, backgroundColor: theme.surfaceMuted },
  slide: { height: 300, overflow: "hidden", borderRadius: 22, backgroundColor: theme.surfaceMuted },
  image: { width: "100%", height: "100%", resizeMode: "cover" as const },
  imageError: { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, backgroundColor: theme.accent },
  imageErrorText: { color: "#fff", fontSize: 15, fontWeight: "700" as const },
  gradient: { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 },
  title: { position: "absolute" as const, left: 18, right: 76, bottom: 22, color: "#fff", fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  counter: { position: "absolute" as const, right: 14, bottom: 18, borderRadius: 14, backgroundColor: "rgba(10,28,21,0.72)", paddingHorizontal: 11, paddingVertical: 7 },
  counterText: { color: "#fff", fontSize: 13, fontWeight: "700" as const },
  dots: { position: "absolute" as const, left: 0, right: 0, bottom: 13, flexDirection: "row" as const, justifyContent: "center" as const, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.48)" },
  dotActive: { width: 18, backgroundColor: "#fff" },
  removeButton: { position: "absolute" as const, right: 14, top: 14, width: 44, height: 44, borderRadius: 22, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "rgba(10,28,21,0.72)" },
  empty: { minHeight: 238, borderRadius: 22, padding: 20, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, backgroundColor: theme.surfaceMuted },
  emptyTitle: { color: theme.ink, fontSize: 20, fontWeight: "700" as const },
  emptyCopy: { maxWidth: 310, color: theme.muted, fontSize: 14, lineHeight: 20, textAlign: "center" as const },
  emptyActions: { width: "100%", flexDirection: "row" as const, gap: 10, marginTop: 6 },
  emptyButton: { flex: 1, minHeight: 54, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 7, backgroundColor: theme.card },
  emptyButtonText: { color: theme.ink, fontSize: 14, fontWeight: "700" as const },
  manageRow: { flexDirection: "row" as const, gap: 10 },
  manageButton: { flex: 1, minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: theme.inputBorder, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 7, backgroundColor: theme.surface },
  manageText: { color: theme.ink, fontSize: 13, fontWeight: "700" as const },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 }
}) as const;
