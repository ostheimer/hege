import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

interface QueueStatusPillProps {
  count: number;
  failedCount: number;
  /**
   * Wenn `true`, hat die API gerade einen Read-Fehler geliefert (Dashboard-
   * Fetch fehlgeschlagen). Bei leerer Warteschlange zeigen wir dann
   * "API offline" statt "Sync OK" — die Pille soll nicht widerspruechlich
   * gruenen Haken zeigen, waehrend daneben "API nicht erreichbar" steht.
   */
  apiOffline?: boolean;
}

/**
 * `<QueueStatusPill>` — kompakter Status-Anzeiger fuer die Offline-
 * Warteschlange im Hero des Heute-Tabs.
 *
 * Vier Zustaende:
 * - **Sync OK**: alles synchronisiert. Neutrale, kleine Pille mit
 *   gruenem Haken und kurzem Label.
 * - **N warten**: Eintraege wollen hochgeladen werden. Akzent-Pille
 *   mit Cloud-Upload-Icon und Counter.
 * - **N Fehler**: Failed-Eintraege brauchen Aufmerksamkeit. Warning-
 *   farbene Pille mit Alert-Icon.
 * - **API offline**: Queue ist leer, aber der letzte API-Read ist
 *   gescheitert. Warning-Pille mit Cloud-Offline-Icon. Sonst wuerde
 *   die Pille "Sync OK" zeigen, waehrend daneben ein API-Error-Card
 *   sichtbar ist.
 *
 * Frueher war diese Info eine grosse Card unter dem Hero — die hat
 * ~30% des Heros gefressen. Die Pille passt jetzt rechts oben in den
 * Eyebrow-Row und macht Platz fuer den eigentlichen Inhalt.
 */
export function QueueStatusPill({ count, failedCount, apiOffline }: QueueStatusPillProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();

  if (failedCount > 0) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={`${failedCount} Warteschlangen-Eintraege mit Fehler`}
        style={[styles.pill, styles.pillFailed]}
      >
        <Ionicons color={theme.onWarning} name="alert-circle" size={14} />
        <Text style={[styles.label, styles.labelOnWarning]}>{failedCount} Fehler</Text>
      </View>
    );
  }

  if (count > 0) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={`${count} Warteschlangen-Eintraege warten auf Sync`}
        style={[styles.pill, styles.pillPending]}
      >
        <Ionicons color={theme.onAccent} name="cloud-upload" size={14} />
        <Text style={[styles.label, styles.labelOnAccent]}>{count} warten</Text>
      </View>
    );
  }

  if (apiOffline) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel="API nicht erreichbar"
        style={[styles.pill, styles.pillFailed]}
      >
        <Ionicons color={theme.onWarning} name="cloud-offline" size={14} />
        <Text style={[styles.label, styles.labelOnWarning]}>API offline</Text>
      </View>
    );
  }

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Warteschlange synchronisiert"
      style={[styles.pill, styles.pillSynced]}
    >
      <Ionicons color={theme.accent} name="checkmark-circle" size={14} />
      <Text style={[styles.label, styles.labelMuted]}>Sync OK</Text>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999
    },
    pillSynced: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.accent
    },
    pillPending: {
      backgroundColor: theme.accent
    },
    pillFailed: {
      backgroundColor: theme.warning
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4
    },
    labelOnAccent: {
      color: theme.onAccent
    },
    labelOnWarning: {
      color: theme.onWarning
    },
    labelMuted: {
      color: theme.accent
    }
  }) as const;
