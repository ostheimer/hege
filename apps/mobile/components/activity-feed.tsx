import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatRelativeTime,
  type ActivityItem,
  type ActivityItemKind
} from "../lib/activity-feed.helpers";
import { useThemeColors, type ThemeColors } from "../lib/theme";
import { cardSurface } from "../lib/surfaces";
import { eyebrowText } from "../lib/typography";
import { useThemedStyles } from "../lib/use-themed-styles";
import { radius } from "@hege/tokens";

interface ActivityFeedProps {
  items: ReadonlyArray<ActivityItem>;
  onShowAll?: () => void;
  complete?: boolean;
  /**
   * Tap auf eine Activity-Karte. Aufrufer entscheidet, wohin
   * navigiert wird — typischerweise auf den passenden Listen-Tab
   * (Ansitze / Fallwild / Benachrichtigungen).
   */
  onItemPress?: (item: ActivityItem) => void;
}

/**
 * "Was gibt's Neues"-Section auf dem Heute-Tab. Zeigt einen
 * chronologisch sortierten Feed aus Ansitzen, Fallwild-Erfassungen
 * und Benachrichtigungen.
 *
 * Render-loses Layout: die Component sortiert nicht und mergt nicht —
 * das macht `buildActivityFeed` im Helper. Hier nur Darstellung,
 * was den Code testbar haelt und Render-Logik klar trennt.
 */
export function ActivityFeed({ items, onItemPress, onShowAll, complete = false }: ActivityFeedProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Aktivität</Text>
        {onShowAll ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Alle Aktivitäten anzeigen" testID="activity-show-all" onPress={onShowAll} hitSlop={12}>
            <Text style={styles.headerHint}>Alle anzeigen</Text>
          </Pressable>
        ) : <Text style={styles.headerHint}>{complete ? "Alle Einträge" : "Letzte 3 Einträge"}</Text>}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons color={styles.emptyIcon.color} name="leaf-outline" size={24} />
          <Text style={styles.emptyTitle}>Noch nichts Neues</Text>
          <Text style={styles.emptyCopy}>
            Sobald jemand ansitzt, Fallwild meldet oder eine Benachrichtigung kommt, taucht es hier auf.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const interactive = Boolean(onItemPress);
            const Wrapper: typeof Pressable | typeof View = interactive ? Pressable : View;
            const wrapperProps = interactive
              ? {
                  accessibilityRole: "button" as const,
                  accessibilityLabel: `${item.title}, ${item.subtitle}, ${formatRelativeTime(item.timestamp)}`,
                  onPress: () => {
                    void Haptics.selectionAsync();
                    onItemPress?.(item);
                  },
                  style: ({ pressed }: { pressed: boolean }) => [
                    styles.item,
                    pressed ? styles.itemPressed : null
                  ]
                }
              : { style: styles.item };

            return (
              <Wrapper key={item.id} testID={`activity-item-${index}`} {...wrapperProps}>
                <ActivityIcon kind={item.kind} styles={styles} />
                <View style={styles.itemBody}>
                  <View style={styles.itemHeader}>
                    <Text numberOfLines={2} style={styles.itemTitle}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemTime}>{formatRelativeTime(item.timestamp)}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.itemSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
                {index < items.length - 1 ? <View style={styles.divider} /> : null}
              </Wrapper>
            );
          })}
        </View>
      )}
    </View>
  );
}

interface ActivityIconProps {
  kind: ActivityItemKind;
  styles: ReturnType<typeof createStyles>;
}

function ActivityIcon({ kind, styles }: ActivityIconProps) {
  const theme = useThemeColors();
  const config = ACTIVITY_ICON_CONFIG[kind];

  return (
    <View style={[styles.iconWrap, { backgroundColor: hexWithAlpha(config.tint(theme), 0.16) }]}>
      <Ionicons color={config.tint(theme)} name={config.icon} size={18} />
    </View>
  );
}

const ACTIVITY_ICON_CONFIG: Record<
  ActivityItemKind,
  {
    icon: keyof typeof Ionicons.glyphMap;
    tint: (theme: ThemeColors) => string;
  }
> = {
  ansitz: { icon: "trail-sign", tint: (theme) => theme.accent },
  fallwild: { icon: "camera", tint: (theme) => theme.warning },
  notification: { icon: "notifications", tint: (theme) => theme.ink }
};

/**
 * Mischt Alpha-Kanal zu einer Hex-Farbe — fuer den weichen Icon-Hintergrund.
 * Erwartet `#rrggbb` oder `#rgb`. Andere Eingaben werden zurueckgegeben.
 */
function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  const value = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");

  return `${normalized}${value}`;
}

const createStyles = (theme: ThemeColors) =>
  ({
    card: { ...cardSurface(theme), gap: 14 },
    headerRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between"
    },
    eyebrow: { ...eyebrowText(theme) },
    headerHint: {
      fontSize: 11,
      color: theme.muted
    },
    list: {
      gap: 14
    },
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      position: "relative",
      paddingBottom: 14
    },
    itemPressed: {
      opacity: 0.6
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center"
    },
    itemBody: {
      flex: 1,
      gap: 2
    },
    itemHeader: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start"
    },
    itemTitle: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "700",
      color: theme.ink
    },
    itemTime: {
      fontSize: 12,
      color: theme.muted,
      paddingTop: 2
    },
    itemSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    },
    divider: {
      position: "absolute",
      left: 48,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.muted,
      opacity: 0.2
    },
    emptyState: {
      alignItems: "center",
      gap: 6,
      padding: 12
    },
    emptyIcon: {
      color: theme.muted
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.ink
    },
    emptyCopy: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted,
      textAlign: "center"
    }
  }) as const;
