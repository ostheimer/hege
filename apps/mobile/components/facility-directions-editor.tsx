import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ReviereinrichtungListItem } from "@hege/domain";
import { updateFacilityOutlook } from "../lib/api";
import { formatCardinalDirection } from "../lib/reviereinrichtung";
import { useThemeColors } from "../lib/theme";
import { cardSurface } from "../lib/surfaces";
import { FeedbackBanner } from "./feedback-banner";

const DIRECTIONS = [
  "Nord",
  "Nordost",
  "Ost",
  "Südost",
  "Süd",
  "Südwest",
  "West",
  "Nordwest",
];
export function FacilityDirectionsEditor({
  entry,
  onSaved,
  onCancel,
}: {
  entry: ReviereinrichtungListItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const theme = useThemeColors();
  const [main, setMain] = useState(entry.orientationDegrees);
  const [others, setOthers] = useState(
    entry.details?.additionalViewDirections ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = (a: number, b: number) =>
    formatCardinalDirection(a) === formatCardinalDirection(b);
  async function save() {
    if (main === undefined || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateFacilityOutlook(entry.id, {
        orientationDegrees: main,
        additionalViewDirections: others.filter(
          (value) => !matches(value, main),
        ),
      });
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  const choices = (secondary: boolean) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {DIRECTIONS.map((label, index) => {
        const value = index * 45,
          isMain = main !== undefined && matches(main, value);
        const selected = secondary
          ? others.some((other) => matches(other, value))
          : isMain;
        return (
          <Pressable
            key={label}
            testID={`facility-${secondary ? "window" : "main"}-direction-${value}`}
            accessibilityRole={secondary ? "checkbox" : "radio"}
            accessibilityState={{
              checked: selected,
              disabled: busy || (secondary && isMain),
            }}
            disabled={busy || (secondary && isMain)}
            onPress={() =>
              secondary
                ? setOthers((current) =>
                    selected
                      ? current.filter((other) => !matches(other, value))
                      : [...current, value],
                  )
                : (setMain(value),
                  setOthers((current) =>
                    current.filter((other) => !matches(other, value)),
                  ))
            }
            style={{
              minHeight: 44,
              padding: 11,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selected ? theme.accent : theme.inputBorder,
              backgroundColor: selected ? theme.accent : theme.background,
              opacity: secondary && isMain ? 0.35 : 1,
            }}
          >
            <Text style={{ color: selected ? theme.onAccent : theme.ink }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View style={{ ...cardSurface(theme), gap: 14 }}>
      <Text style={{ color: theme.ink, fontSize: 18, fontWeight: "700" }}>
        Hauptblickrichtung
      </Text>
      {choices(false)}
      <Text style={{ color: theme.ink, fontSize: 16, fontWeight: "700" }}>
        Weitere Fenster
      </Text>
      <Text style={{ color: theme.muted }}>
        Nur vorhandene Blickrichtungen auswählen.
      </Text>
      {choices(true)}
      {error ? (
        <FeedbackBanner
          tone="danger"
          title="Nicht gespeichert"
          description={error}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        testID="facility-directions-save"
        disabled={busy || main === undefined}
        onPress={() => void save()}
        style={{
          minHeight: 48,
          borderRadius: 14,
          backgroundColor: theme.accent,
          alignItems: "center",
          justifyContent: "center",
          opacity: busy || main === undefined ? 0.5 : 1,
        }}
      >
        <Text style={{ color: theme.onAccent, fontWeight: "700" }}>
          {busy ? "Wird gespeichert …" : "Blickrichtungen speichern"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onCancel}
        style={{
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.ink }}>Abbrechen</Text>
      </Pressable>
    </View>
  );
}
