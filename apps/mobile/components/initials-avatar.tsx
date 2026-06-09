import { Pressable, Text, View } from "react-native";

import { getInitials } from "../lib/initials";
import { useThemeColors } from "../lib/theme";

interface InitialsAvatarProps {
  name: string;
  /** Durchmesser in px. Default 38 (Listen-Zeile). */
  size?: number;
  /** Wenn gesetzt, wird der Avatar tappbar (z. B. Sprung ins Profil). */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * Initialen-Avatar auf Akzent-Flaeche — der Personen-Anker fuer Profil,
 * Mehr-Zeile und Heute-Hero. Bewusst ohne Foto-Support: ein Initialen-
 * Kreis braucht kein Asset, skaliert mit jedem Namen und ist in Light
 * wie Dark kontraststark (accent + onAccent).
 */
export function InitialsAvatar({ name, size = 38, onPress, accessibilityLabel }: InitialsAvatarProps) {
  const theme = useThemeColors();

  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const
  };
  const label = {
    color: theme.onAccent,
    fontSize: Math.round(size * 0.38),
    fontWeight: "700" as const
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? "Profil öffnen"}
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [circle, pressed ? { opacity: 0.85 } : null]}
      >
        <Text style={label}>{getInitials(name)}</Text>
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={circle}>
      <Text style={label}>{getInitials(name)}</Text>
    </View>
  );
}
