import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { canRoleAccess, type DashboardResponse, type RoleFeature } from "@hege/domain";

import { InitialsAvatar } from "../../components/initials-avatar";
import { ScreenShell } from "../../components/screen-shell";
import { fetchDashboardSnapshot } from "../../lib/api";
import { formatRoleLabel } from "../../lib/format";
import { countUnread, useReadNotificationIds } from "../../lib/notifications-read-state";
import { useSessionSnapshot } from "../../lib/session";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { cardSurface } from "../../lib/surfaces";
import { useThemedStyles } from "../../lib/use-themed-styles";
import { spacing, radius } from "@hege/tokens";

interface MehrLink {
  href: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  testID?: string;
  feature?: RoleFeature;
}

const MEHR_LINKS: ReadonlyArray<MehrLink> = [
  {
    href: "/(tabs)/benutzer",
    label: "Benutzerverwaltung",
    description: "Konten, Rollen und Impersonation verwalten.",
    icon: "people-outline",
    feature: "platform-users-manage",
    testID: "more-platform-users-link"
  },
  {
    href: "/(tabs)/benachrichtigungen",
    label: "Benachrichtigungen",
    description: "Push- und In-App-Meldungen mit Gelesen-Status.",
    icon: "notifications-outline"
  },
  {
    href: "/(tabs)/reviereinrichtungen",
    label: "Reviereinrichtungen",
    description: "Hochstände, Fütterungen und Wartungen.",
    icon: "map-outline",
    testID: "more-reviereinrichtungen-link"
  },
  {
    href: "/(tabs)/revierarbeit",
    label: "Meldungen",
    description: "Reviermeldungen erfassen, Aufgabenstatus pflegen.",
    icon: "checkbox-outline"
  },
  {
    href: "/(tabs)/kontakte",
    label: "Kontakte",
    description: "Mitglieder, Reviernachbarn und Notrufnummern.",
    icon: "call-outline",
    testID: "more-contacts-link"
  },
  {
    href: "/(tabs)/protokolle",
    label: "Protokolle",
    description: "Sitzungs- und Beschlussprotokolle nachlesen.",
    icon: "document-text-outline"
  },
  {
    href: "/ueber-hege",
    label: "Über hege",
    description: "Version, Build, Open-Source-Lizenzen.",
    icon: "information-circle-outline",
    testID: "more-about-link"
  }
];

export default function MehrScreen() {
  const router = useRouter();
  const session = useSessionSnapshot();
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [snapshot, setSnapshot] = useState<DashboardResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const readIds = useReadNotificationIds();
  const unreadCount = useMemo(() => {
    const notificationIds = snapshot?.overview.letzteBenachrichtigungen.map((entry) => entry.id) ?? [];
    return countUnread(notificationIds, readIds);
  }, [snapshot, readIds]);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    let isMounted = true;

    fetchDashboardSnapshot()
      .then((data) => {
        if (isMounted) {
          setSnapshot(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSnapshot(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.status, session.session?.user.id]);

  async function handleRefresh() {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      const data = await fetchDashboardSnapshot();
      setSnapshot(data);
    } catch {
      // Refresh-Fehler werden hier still verschluckt — der Profil-
      // Bereich zeigt im Fehlerfall die alten Werte weiter, was
      // weniger irritierend ist als ein Toast in einer reinen
      // Navigations-Liste.
    } finally {
      setIsRefreshing(false);
    }
  }

  const profileName = session.session?.user.name ?? "";
  const role = session.session?.membership.role;
  const visibleLinks = MEHR_LINKS.filter(
    (entry) => !entry.feature || (role ? canRoleAccess(role, entry.feature) : false)
  );

  return (
    <ScreenShell
      testID="more-screen"
      eyebrow="Mehr"
      title="Profil und weitere Bereiche"
      subtitle="Selten genutzte Aufgaben sind hier gebündelt, damit der Heute-Bildschirm fokussiert bleibt."
      refresh={{
        refreshing: isRefreshing,
        onRefresh: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void handleRefresh();
        }
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profil öffnen"
        onPress={() => router.push("/(tabs)/profil" as Parameters<typeof router.push>[0])}
        style={({ pressed }) => [styles.profileRow, pressed ? styles.profileRowPressed : null]}
      >
        <InitialsAvatar name={profileName} size={42} />
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{profileName || "Wird geladen..."}</Text>
          <Text style={styles.profileMeta}>
            {session.session
              ? `${formatRoleLabel(session.session.membership.role)} · ${session.session.revier.name}`
              : "Profil, Erscheinungsbild und Sicherheit"}
          </Text>
        </View>
        <Ionicons color={theme.muted} name="chevron-forward" size={20} />
      </Pressable>

      <View style={styles.linkList}>
        {visibleLinks.map((entry) => {
          // Nur der Benachrichtigungen-Link bekommt einen Unread-Badge.
          // Wir koennten das ueber ein generisches `badge`-Feld in
          // MehrLink loesen, aber bislang ist es nur eine Stelle —
          // direkter Check ist kuerzer + leichter zu lesen.
          const showUnreadBadge = entry.href === "/(tabs)/benachrichtigungen" && unreadCount > 0;
          const badgeLabel = unreadCount > 9 ? "9+" : `${unreadCount}`;
          const a11yLabel = showUnreadBadge
            ? `${entry.label}, ${unreadCount} ungelesen`
            : entry.label;

          return (
            <Pressable
              key={entry.href}
              accessibilityRole="link"
              accessibilityLabel={a11yLabel}
              testID={entry.testID}
              onPress={() => router.push(entry.href as Parameters<typeof router.push>[0])}
              style={({ pressed }) => [styles.linkRow, pressed ? styles.linkRowPressed : null]}
            >
              <View style={styles.linkIcon}>
                <Ionicons color={theme.ink} name={entry.icon} size={22} />
              </View>
              <View style={styles.linkCopy}>
                <Text style={styles.linkLabel}>{entry.label}</Text>
                <Text style={styles.linkDescription}>{entry.description}</Text>
              </View>
              {showUnreadBadge ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{badgeLabel}</Text>
                </View>
              ) : null}
              <Ionicons color={theme.muted} name="chevron-forward" size={20} />
            </Pressable>
          );
        })}
      </View>
    </ScreenShell>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
  profileRow: {
    ...cardSurface(theme),
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  profileRowPressed: {
    opacity: 0.85
  },
  profileCopy: {
    flex: 1,
    gap: 2
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.ink
  },
  profileMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted
  },
  linkList: {
    borderRadius: 22,
    backgroundColor: theme.card,
    overflow: "hidden"
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.inputBorder
  },
  linkRowPressed: {
    backgroundColor: "rgba(25, 57, 44, 0.04)"
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: theme.successSurface,
    alignItems: "center",
    justifyContent: "center"
  },
  linkCopy: {
    flex: 1,
    gap: spacing.xs
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.ink
  },
  linkDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: radius.full,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadBadgeText: {
    color: theme.onAccent,
    fontSize: 12,
    fontWeight: "700"
  }
}) as const;
