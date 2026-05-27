import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { DashboardResponse, NotificationItem } from "@hege/domain";

import { FilterChipRow } from "../../components/filter-chip-row";
import { ScreenShell } from "../../components/screen-shell";
import { StateView } from "../../components/state-view";
import { fetchDashboardSnapshot } from "../../lib/api";
import { formatApiErrorDescription } from "../../lib/format";
import {
  countUnread,
  markAllNotificationsRead,
  markNotificationRead,
  useReadNotificationIds
} from "../../lib/notifications-read-state";
import type { ThemeColors } from "../../lib/theme";
import { useThemeColors } from "../../lib/theme";
import { useThemedStyles } from "../../lib/use-themed-styles";

type NotificationFilter = "alle" | "ungelesen";

/**
 * `<BenachrichtigungenScreen>` — Notification-Center (P2.3).
 *
 * Stack-Route unter `/benachrichtigungen`. Erreichbar ueber den
 * Mehr-Tab. Holt die letzten Notifications aus dem Dashboard-
 * Snapshot (das Backend liefert sie schon mit) und kombiniert sie
 * clientseitig mit einem persistierten Read-State (AsyncStorage).
 *
 * Filter:
 * - alle: gesamte Liste, ungelesen oben hervorgehoben
 * - ungelesen: nur die nicht-gelesenen
 *
 * Bewusst nicht in dieser PR:
 * - Server-seitige Read-Persistenz (waere ein Backend-Schema-Change)
 * - Push-Setup pro Mitglied (braucht APNs/FCM-Setup)
 * - Channel-Filter (push/in-app) — nur 2 Channels, Filter unnoetig
 */
export default function BenachrichtigungenScreen() {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [snapshot, setSnapshot] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("alle");
  const readIds = useReadNotificationIds();

  useEffect(() => {
    void load();
  }, []);

  async function load(options?: { refreshing?: boolean }) {
    const refreshing = options?.refreshing ?? false;
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchDashboardSnapshot();
      setSnapshot(data);
    } catch (fetchError) {
      setSnapshot(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  const notifications = snapshot?.overview.letzteBenachrichtigungen ?? [];
  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const visibleNotifications = useMemo(() => {
    if (filter === "ungelesen") {
      return notifications.filter((entry) => !readSet.has(entry.id));
    }
    return notifications;
  }, [filter, notifications, readSet]);
  const unreadCount = countUnread(
    notifications.map((entry) => entry.id),
    readIds
  );

  async function handleTap(notification: NotificationItem) {
    if (readSet.has(notification.id)) {
      return;
    }
    void Haptics.selectionAsync();
    await markNotificationRead(notification.id);
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markAllNotificationsRead(notifications.map((entry) => entry.id));
  }

  return (
    <ScreenShell
      eyebrow="Benachrichtigungen"
      title={
        unreadCount > 0
          ? unreadCount === 1
            ? "1 ungelesene Meldung."
            : `${unreadCount} ungelesene Meldungen.`
          : "Alles gelesen."
      }
      subtitle="Push- und In-App-Nachrichten der letzten Zeit. Tippen markiert als gelesen."
      refresh={{
        refreshing: isRefreshing,
        onRefresh: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void load({ refreshing: true });
        }
      }}
    >
      <View style={styles.toolbar}>
        <FilterChipRow<NotificationFilter>
          value={filter}
          onChange={setFilter}
          accessibilityLabel="Filter umschalten"
          options={[
            { key: "alle", label: "Alle", count: notifications.length },
            { key: "ungelesen", label: "Ungelesen", count: unreadCount }
          ]}
        />
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alle als gelesen markieren"
            onPress={() => void handleMarkAllRead()}
            style={({ pressed }) => [styles.actionButton, pressed ? styles.actionPressed : null]}
          >
            <Ionicons color={theme.accent} name="checkmark-done" size={16} />
            <Text style={styles.actionLabel}>Alle gelesen</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <StateView
          mode="loading"
          title="Benachrichtigungen werden geladen"
          description="Letzte Meldungen werden aus dem Dashboard abgefragt."
        />
      ) : null}

      {error ? (
        <StateView
          mode="error"
          title="API nicht erreichbar"
          description={formatApiErrorDescription(error)}
          action={{ label: "Aktualisieren", onPress: () => void load({ refreshing: true }) }}
        />
      ) : null}

      {!isLoading && !error && visibleNotifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons color={theme.muted} name="notifications-off-outline" size={28} />
          <Text style={styles.emptyTitle}>
            {filter === "ungelesen" ? "Keine ungelesenen Meldungen" : "Noch keine Meldungen"}
          </Text>
          <Text style={styles.emptyCopy}>
            {filter === "ungelesen"
              ? "Du bist auf dem aktuellen Stand."
              : "Sobald eine Sitzung freigegeben wird oder jemand Fallwild meldet, taucht hier eine Meldung auf."}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {visibleNotifications.map((notification) => {
          const isRead = readSet.has(notification.id);
          return (
            <Pressable
              key={notification.id}
              accessibilityRole="button"
              accessibilityLabel={
                isRead
                  ? `${notification.title}, gelesen`
                  : `${notification.title}, ungelesen`
              }
              onPress={() => void handleTap(notification)}
              style={({ pressed }) => [
                styles.card,
                isRead ? styles.cardRead : styles.cardUnread,
                pressed ? styles.cardPressed : null
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.channelPill}>
                  <Ionicons
                    color={theme.muted}
                    name={notification.channel === "push" ? "notifications" : "chatbubble-ellipses"}
                    size={12}
                  />
                  <Text style={styles.channelLabel}>
                    {notification.channel === "push" ? "Push" : "In-App"}
                  </Text>
                </View>
                {!isRead ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.cardTitle}>{notification.title}</Text>
              <Text style={styles.cardBody}>{notification.body}</Text>
              <Text style={styles.cardTime}>{formatRelative(notification.createdAt)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenShell>
  );
}

function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "vor 1 Std." : `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Gestern";
  if (days < 7) return `vor ${days} Tagen`;
  try {
    return new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "short" }).format(then);
  } catch {
    return iso.slice(0, 10);
  }
}

const createStyles = (theme: ThemeColors) =>
  ({
    toolbar: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.muted
    },
    actionPressed: {
      opacity: 0.7
    },
    actionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.accent
    },
    list: {
      gap: 10
    },
    card: {
      gap: 6,
      padding: 16,
      borderRadius: 18,
      backgroundColor: theme.card
    },
    cardUnread: {
      borderLeftWidth: 3,
      borderLeftColor: theme.accent
    },
    cardRead: {
      opacity: 0.78
    },
    cardPressed: {
      opacity: 0.6
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    channelPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: theme.surface
    },
    channelLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.muted,
      textTransform: "uppercase",
      letterSpacing: 0.6
    },
    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 999,
      backgroundColor: theme.accent
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.ink,
      lineHeight: 22
    },
    cardBody: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    cardTime: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 2
    },
    emptyCard: {
      alignItems: "center",
      gap: 8,
      padding: 24,
      borderRadius: 22,
      backgroundColor: theme.card
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.ink,
      textAlign: "center"
    },
    emptyCopy: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted,
      textAlign: "center"
    }
  }) as const;
