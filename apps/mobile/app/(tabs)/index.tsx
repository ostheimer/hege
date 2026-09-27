import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { DashboardResponse } from "@hege/domain";

import { ActivityFeed } from "../../components/activity-feed";
import { RevierMapCard } from "../../components/revier-map-card";
import { InitialsAvatar } from "../../components/initials-avatar";
import { MetricTile } from "../../components/metric-tile";
import { QueueStatusPill } from "../../components/queue-status-pill";
import { RoleHeadline } from "../../components/role-headline";
import { ScreenShell } from "../../components/screen-shell";
import { StateView } from "../../components/state-view";
import { FeedbackBanner } from "../../components/feedback-banner";
import { loadDashboardContent } from "../../lib/dashboard-load";
import {
  buildActivityFeed,
  formatTodayLabel
} from "../../lib/activity-feed.helpers";
import type { ActivityItem } from "../../lib/activity-feed.helpers";
import { fetchActivityHistory, fetchDashboardSnapshot } from "../../lib/api";
import { getSession, useSessionSnapshot } from "../../lib/session";
import { computeRoleDashboard } from "../../lib/dashboard-role.helpers";
import { firstName } from "../../lib/format";
import {
  discardOfflineQueueEntry,
  retryOfflineQueueEntry,
  syncOfflineQueue,
  useOfflineQueueSnapshot
} from "../../lib/offline-queue";
import {
  getOfflineQueueEntryAttachmentHint,
  getOfflineQueueEntryRetryHint,
  getOfflineQueueEntryStatusLine,
  getOfflineQueueStatusLabel
} from "../../lib/offline-queue-status";
import type { ThemeColors } from "../../lib/theme";
import { cardSurface } from "../../lib/surfaces";
import { eyebrowText } from "../../lib/typography";
import { useThemedStyles } from "../../lib/use-themed-styles";
import { spacing, radius } from "@hege/tokens";

/**
 * Heute-Tab — Dashboard "Was gibt's Neues" (Pfad-2-Rework).
 *
 * Produktentscheidung 05.09.2026: Revierkarte zuerst, danach Aktivitäten.
 *
 * Aufbau:
 *  1. Hero (ScreenShell) mit Datum + Revier + User.
 *  2. Optional: Offline-Queue-Toolbar.
 *  3. Aktivitaets-Feed: chronologisch sortierte Mischung aus Ansitzen,
 *     Fallwild-Erfassungen und Benachrichtigungen.
 *  4. Aktive Ansitze (nur wenn vorhanden) als kompakte Liste.
 *  5. Naechste Sitzung als Card (nur wenn vorhanden).
 *  6. Anstehend: 3 kleine Tiles fuer Wartungen, Aufgaben, Protokolle in
 *     Freigabe.
 */
export default function HeuteScreen() {
  const router = useRouter();
  const session = useSessionSnapshot();
  const queue = useOfflineQueueSnapshot();
  const styles = useThemedStyles(createStyles);
  const [loadedSnapshot, setSnapshot] = useState<DashboardResponse | null>(null);
  const snapshot = loadedSnapshot?.membership.id === session.session?.membership.id ? loadedSnapshot : null;
  const requestSequence = useRef(0);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [discardingEntryId, setDiscardingEntryId] = useState<string | null>(null);
  const [retryingEntryId, setRetryingEntryId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void loadDashboard();
  }, [session.session?.membership.id]));

  async function loadDashboard(options?: { refreshing?: boolean }) {
    const requestId = ++requestSequence.current;
    const membershipId = getSession()?.membership.id;
    const refreshing = options?.refreshing ?? false;

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setApiOffline(false);

    try {
      const { snapshot: data, history, historyUnavailable: unavailable } = await loadDashboardContent(fetchDashboardSnapshot, fetchActivityHistory);
      if (requestId !== requestSequence.current || membershipId !== getSession()?.membership.id) return;
      setSnapshot(data);
      setActivityItems(buildActivityFeed(history));
      setHistoryUnavailable(unavailable);
    } catch (fetchError) {
      if (requestId !== requestSequence.current || membershipId !== getSession()?.membership.id) return;
      setSnapshot(null);
      setApiOffline(fetchError instanceof TypeError);
      setActivityItems([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unbekannter Fehler");
    } finally {
      if (requestId === requestSequence.current && membershipId === getSession()?.membership.id) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }

  async function handleQueueSync() {
    setQueueMessage(null);

    try {
      const remaining = await syncOfflineQueue();
      setQueueMessage(
        remaining.length === 0
          ? "Warteschlange ist leer."
          : `${remaining.length} Einträge warten weiter auf Synchronisierung.`
      );
      await loadDashboard({ refreshing: true });
    } catch (syncError) {
      setQueueMessage(
        syncError instanceof Error
          ? syncError.message
          : "Warteschlange konnte nicht synchronisiert werden."
      );
    }
  }

  async function handleDiscardEntry(entryId: string) {
    setDiscardingEntryId(entryId);
    setQueueMessage(null);

    try {
      await discardOfflineQueueEntry(entryId);
      setQueueMessage("Eintrag verworfen.");
    } catch (discardError) {
      setQueueMessage(
        discardError instanceof Error ? discardError.message : "Eintrag konnte nicht verworfen werden."
      );
    } finally {
      setDiscardingEntryId(null);
    }
  }

  async function handleRetryEntry(entryId: string) {
    setRetryingEntryId(entryId);
    setQueueMessage(null);

    try {
      await retryOfflineQueueEntry(entryId);
      const remaining = await syncOfflineQueue();
      setQueueMessage(
        remaining.length === 0
          ? "Eintrag erfolgreich synchronisiert."
          : `${remaining.length} Einträge warten weiter in der Warteschlange.`
      );
      await loadDashboard({ refreshing: true });
    } catch (retryError) {
      setQueueMessage(
        retryError instanceof Error
          ? retryError.message
          : "Eintrag konnte nicht erneut versucht werden."
      );
    } finally {
      setRetryingEntryId(null);
    }
  }

  const queueEntries = queue.entries;
  const queueCount = queueEntries.length;
  const failedQueueCount = queueEntries.filter((entry) => entry.status === "failed").length;
  const queueIsEmpty = queueCount === 0;
  const activeAnsitze = snapshot?.activeAnsitze ?? [];
  const todayLabel = formatTodayLabel();
  // Rollenspezifischer Headline + Tile-Satz fuer den Heute-Tab (P2.2).
  // computeRoleDashboard liest aus snapshot.membership.role und liefert
  // pro Rolle eine eigene Headline-Konfiguration und drei priorisierte
  // Tiles. Bei fehlendem Snapshot bleibt das null — gerendert wird die
  // Section nur, wenn Daten da sind.
  const roleDashboard = snapshot
    ? computeRoleDashboard(snapshot.membership.role, snapshot)
    : null;

  // Personalisierte Begruessung als Hero-Title. Wenn der Snapshot
  // geladen ist, zeigen wir 'Weidmannsheil {firstName}!' — Revier-Name,
  // Rolle und Jagdzeichen rutschen in den Subtitle. Vor dem Snapshot
  // bleibt der neutrale Fallback 'Heute im Revier' aktiv.
  const greeting = snapshot ? `Weidmannsheil ${firstName(snapshot.user.name)}!` : "Heute im Revier";

  return (
    <ScreenShell
      testID="dashboard-screen"
      eyebrow={todayLabel}
      title={greeting}
      subtitle={
        snapshot
          ? `${snapshot.revier.name}\n${[snapshot.membership.functionLabel, formatRoleLabel(snapshot.membership.role), snapshot.membership.jagdzeichen].filter(Boolean).join(" · ")}`
          : "Aktivität, Aufgaben und Warteschlange auf einen Blick."
      }
      refresh={{
        refreshing: isRefreshing,
        onRefresh: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void loadDashboard({ refreshing: true });
        }
      }}
      aside={
        <View style={styles.asideRow}>
          <QueueStatusPill
            count={queueCount}
            failedCount={failedQueueCount}
            apiOffline={apiOffline}
          />
          {session.session ? (
            <InitialsAvatar
              name={session.session.user.name}
              size={30}
              accessibilityLabel="Profil öffnen"
              onPress={() => router.push("/(tabs)/profil" as Parameters<typeof router.push>[0])}
            />
          ) : null}
        </View>
      }
    >
      {snapshot ? <RevierMapCard key={snapshot.membership.id} revierId={snapshot.revier.id} name={snapshot.revier.name} /> : null}
      {!queueIsEmpty ? (
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Warteschlange senden"
            style={[styles.secondaryButton, queue.isSyncing ? styles.buttonDisabled : null]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              void handleQueueSync();
            }}
            disabled={queue.isSyncing}
          >
            <Text style={styles.secondaryButtonText}>
              {queue.isSyncing ? "Wird gesendet..." : "Warteschlange senden"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <StateView
          mode="loading"
          title="Dashboard wird geladen"
          description="Revierdaten und letzte Aktivität werden von der API abgefragt."
        />
      ) : null}

      {error ? (
        <StateView
          mode="error"
          title="Startseite konnte nicht geladen werden"
          description="Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut."
          action={{ label: "Aktualisieren", onPress: () => void loadDashboard({ refreshing: true }) }}
        />
      ) : null}

      {snapshot && historyUnavailable ? <FeedbackBanner tone="warning" title="Aktivitäten eingeschränkt" description="Die vollständige Historie ist gerade nicht verfügbar. Die übrigen Revierdaten bleiben nutzbar." /> : null}

      {queueMessage ? (
        <View style={styles.queueStateCard}>
          <Text style={styles.queueStateTitle}>Warteschlangen-Status</Text>
          <Text style={styles.queueStateCopy}>{queueMessage}</Text>
        </View>
      ) : null}

      {snapshot && roleDashboard ? (
        <>
          <RoleHeadline data={roleDashboard.headline} />

          <ActivityFeed
            items={activityItems}
            onShowAll={() => router.push("/aktivitaeten" as Parameters<typeof router.push>[0])}
            onItemPress={(item) => {
              // Tap auf einen Feed-Eintrag fuehrt auf den passenden
              // Listen-Tab. Tiefen-Deeplinks (z.B. auf den konkreten
              // Fallwild-Vorgang) waeren ein eigenes Feature — momentan
              // hat keine der Listen pro-Eintrag-Detail-Routen.
              if (item.kind === "ansitz") {
                router.push("/(tabs)/ansitze");
              } else if (item.kind === "fallwild") {
                router.push({ pathname: "/(tabs)/fallwild", params: { view: "liste" } });
              } else {
                router.push("/(tabs)/benachrichtigungen" as Parameters<typeof router.push>[0]);
              }
            }}
          />

          {activeAnsitze.length > 0 ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Aktive Ansitze, ${activeAnsitze.length} Eintraege, oeffnen`}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push("/(tabs)/ansitze");
              }}
              style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
            >
              <Text style={styles.cardEyebrow}>Aktive Ansitze</Text>
              {activeAnsitze.slice(0, 4).map((entry) => (
                <View key={entry.id} style={styles.ansitzRow}>
                  <View style={styles.ansitzCopy}>
                    <Text style={styles.ansitzTitle}>{entry.standortName}</Text>
                    <Text style={styles.ansitzMeta}>
                      {entry.location.label ?? "Position laut Standort"}
                    </Text>
                  </View>
                  <View style={styles.ansitzBadge}>
                    <Text style={styles.ansitzBadgeText}>aktiv</Text>
                  </View>
                </View>
              ))}
              {activeAnsitze.length > 4 ? (
                <Text style={styles.ansitzOverflow}>
                  +{activeAnsitze.length - 4} weitere im Ansitze-Tab.
                </Text>
              ) : null}
            </Pressable>
          ) : null}

          {snapshot.overview.naechsteSitzung ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Naechste Sitzung: ${snapshot.overview.naechsteSitzung.title}, Mehr-Tab oeffnen`}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push("/(tabs)/protokolle");
              }}
              style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
            >
              <Text style={styles.cardEyebrow}>Nächste Sitzung</Text>
              <Text style={styles.cardValue}>{snapshot.overview.naechsteSitzung.title}</Text>
              <Text style={styles.cardCopy}>{snapshot.overview.naechsteSitzung.locationLabel}</Text>
            </Pressable>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Im Blick</Text>
            <View style={styles.metricGrid}>
              {roleDashboard.tiles.map((tile) => (
                <MetricTile
                  key={tile.label}
                  label={tile.label}
                  value={tile.value}
                  detail={tile.detail}
                />
              ))}
            </View>
          </View>

          {queueEntries.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Warteschlange</Text>
              {queueEntries.slice(0, 3).map((entry) => (
                <View key={entry.id} style={styles.queueRow}>
                  <View style={styles.queueRowCopy}>
                    <Text style={styles.queueRowTitle}>{entry.title}</Text>
                    <Text style={styles.queueRowMeta}>
                      {getOfflineQueueEntryStatusLine(entry)}
                    </Text>
                    <Text style={styles.queueRowMeta}>
                      {getOfflineQueueEntryAttachmentHint(entry)}
                    </Text>
                    {getOfflineQueueEntryRetryHint(entry) ? (
                      <Text style={styles.queueRowMeta}>{getOfflineQueueEntryRetryHint(entry)}</Text>
                    ) : null}
                    {entry.lastError ? (
                      <Text style={styles.queueRowMeta}>{entry.lastError}</Text>
                    ) : null}
                  </View>
                  <View style={styles.queueRowActions}>
                    <View
                      style={[
                        styles.queueBadge,
                        entry.status === "failed"
                          ? styles.queueBadgeFailed
                          : entry.status === "conflict"
                            ? styles.queueBadgeConflict
                            : entry.status === "uploading"
                              ? styles.queueBadgeUploading
                              : styles.queueBadgePending
                      ]}
                    >
                      <Text style={styles.queueBadgeText}>
                        {getOfflineQueueStatusLabel(entry.status)}
                      </Text>
                    </View>
                    {entry.status === "failed" || entry.status === "conflict" ? (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Eintrag ${entry.title} erneut versuchen`}
                          style={[
                            styles.retryButton,
                            retryingEntryId === entry.id ? styles.buttonDisabled : null
                          ]}
                          onPress={() => void handleRetryEntry(entry.id)}
                          disabled={retryingEntryId === entry.id}
                        >
                          <Text style={styles.retryButtonText}>
                            {retryingEntryId === entry.id ? "..." : "Erneut versuchen"}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Eintrag ${entry.title} verwerfen`}
                          style={[
                            styles.discardButton,
                            discardingEntryId === entry.id ? styles.buttonDisabled : null
                          ]}
                          onPress={() => void handleDiscardEntry(entry.id)}
                          disabled={discardingEntryId === entry.id}
                        >
                          <Text style={styles.discardButtonText}>
                            {discardingEntryId === entry.id ? "..." : "Verwerfen"}
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </ScreenShell>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    asideRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    toolbar: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 10
    },
    buttonDisabled: {
      opacity: 0.7
    },
    secondaryButton: {
      minWidth: 110,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.full,
      backgroundColor: theme.surfaceMuted
    },
    secondaryButtonText: {
      color: theme.ink,
      fontWeight: "600"
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    queueStateCard: {
      gap: 6,
      padding: 18,
      borderRadius: 22,
      backgroundColor: theme.warningSurface
    },
    queueStateTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.warning
    },
    queueStateCopy: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.warning
    },
    card: { ...cardSurface(theme), gap: 10 },
    cardPressed: {
      opacity: 0.85
    },
    cardEyebrow: { ...eyebrowText(theme) },
    cardValue: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.ink
    },
    cardCopy: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.muted
    },
    ansitzRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: spacing.xs
    },
    ansitzCopy: {
      flex: 1,
      gap: 2
    },
    ansitzTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.ink
    },
    ansitzMeta: {
      fontSize: 13,
      color: theme.muted
    },
    ansitzBadge: {
      paddingHorizontal: 10,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: theme.accent
    },
    ansitzBadgeText: {
      color: theme.onAccent,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8
    },
    ansitzOverflow: {
      fontSize: 13,
      color: theme.muted
    },
    queueRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start"
    },
    queueRowCopy: {
      flex: 1,
      gap: spacing.xs
    },
    queueRowTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.ink
    },
    queueRowMeta: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    },
    queueRowActions: {
      gap: spacing.sm,
      alignItems: "flex-end"
    },
    queueBadge: {
      paddingHorizontal: 12,
      paddingVertical: spacing.sm,
      borderRadius: radius.full
    },
    queueBadgePending: {
      backgroundColor: theme.successSurface
    },
    queueBadgeFailed: {
      backgroundColor: theme.dangerSurface
    },
    queueBadgeConflict: {
      backgroundColor: theme.conflictSurface
    },
    queueBadgeUploading: {
      backgroundColor: theme.infoSurface
    },
    queueBadgeText: {
      fontWeight: "600",
      color: theme.ink
    },
    discardButton: {
      paddingHorizontal: 12,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: theme.card
    },
    discardButtonText: {
      fontWeight: "600",
      color: theme.muted
    },
    retryButton: {
      paddingHorizontal: 12,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: theme.accent
    },
    retryButtonText: {
      fontWeight: "700",
      color: theme.onAccent
    }
  }) as const;

function formatRoleLabel(role: DashboardResponse["membership"]["role"]) {
  switch (role) {
    case "revier-admin":
      return "Admin";
    case "schriftfuehrer":
      return "Schriftführung";
    case "jaeger":
      return "Jäger";
    case "ausgeher":
      return "Ausgeher";
    case "platform-admin":
      return "Plattform";
    default:
      return role;
  }
}
