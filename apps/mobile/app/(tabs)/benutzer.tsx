import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ASSIGNABLE_MEMBER_ROLES,
  type MembershipSummary,
  type PlatformAuditAction,
  type PlatformUserListResponse,
  type PlatformUserSummary,
  type Role
} from "@hege/domain";
import { spacing } from "@hege/tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

import { Badge } from "../../components/badge";
import { FeedbackBanner } from "../../components/feedback-banner";
import { FilterChipRow } from "../../components/filter-chip-row";
import { ScreenShell } from "../../components/screen-shell";
import { SearchInput } from "../../components/search-input";
import {
  fetchPlatformUsers,
  startImpersonation,
  updatePlatformMembership,
  updatePlatformUser
} from "../../lib/api";
import { formatRoleLabel } from "../../lib/format";
import { useSessionSnapshot } from "../../lib/session";
import { cardSurface } from "../../lib/surfaces";
import { type ThemeColors, useThemeColors } from "../../lib/theme";
import { eyebrowText } from "../../lib/typography";
import { useThemedStyles } from "../../lib/use-themed-styles";

export default function BenutzerScreen() {
  const router = useRouter();
  const session = useSessionSnapshot().session;
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState<PlatformUserListResponse | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      setData(await fetchPlatformUsers());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Benutzer konnten nicht geladen werden.");
    } finally {
      if (refresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleUsers = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLocaleLowerCase("de-AT");
    if (!query) return data.users;
    return data.users.filter((entry) =>
      [
        entry.user.name,
        entry.user.email,
        entry.user.username ?? "",
        ...entry.memberships.flatMap((membership) => [
          membership.revierName,
          membership.jagdzeichen,
          formatRoleLabel(membership.role)
        ])
      ]
        .join(" ")
        .toLocaleLowerCase("de-AT")
        .includes(query)
    );
  }, [data, search]);

  function replaceUser(updated: PlatformUserSummary) {
    setData((current) =>
      current
        ? { ...current, users: current.users.map((entry) => (entry.user.id === updated.user.id ? updated : entry)) }
        : current
    );
  }

  async function saveUser(userId: string, payload: Parameters<typeof updatePlatformUser>[1]) {
    const key = `user:${userId}`;
    setBusyKey(key);
    setError(null);
    try {
      replaceUser(await updatePlatformUser(userId, payload));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Benutzer konnte nicht gespeichert werden.");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveMembership(userId: string, membershipId: string, role: Role, jagdzeichen: string) {
    const key = `membership:${membershipId}`;
    setBusyKey(key);
    setError(null);
    try {
      const updated = await updatePlatformMembership(userId, membershipId, { role, jagdzeichen });
      setData((current) =>
        current
          ? {
              ...current,
              users: current.users.map((entry) =>
                entry.user.id === userId
                  ? { ...entry, memberships: entry.memberships.map((item) => (item.id === membershipId ? updated : item)) }
                  : entry
              )
            }
          : current
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mitgliedschaft konnte nicht gespeichert werden.");
    } finally {
      setBusyKey(null);
    }
  }

  async function impersonate(membershipId: string) {
    const key = `impersonate:${membershipId}`;
    setBusyKey(key);
    setError(null);
    try {
      await startImpersonation(membershipId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impersonation konnte nicht gestartet werden.");
      setBusyKey(null);
    }
  }

  return (
    <ScreenShell
      eyebrow="Plattform-Administration"
      title="Benutzer verwalten"
      subtitle="Konten, Rollen und Mitgliedschaften über alle Reviere hinweg."
      refresh={{ refreshing, onRefresh: () => void load(true) }}
      testID="platform-users-screen"
    >
      {error ? <FeedbackBanner tone="danger" title="Benutzerverwaltung nicht verfügbar" description={error} /> : null}
      <SearchInput
        accessibilityLabel="Benutzer suchen"
        onChangeText={setSearch}
        placeholder="Name, E-Mail, Rolle oder Revier"
        value={search}
      />
      <Text style={styles.resultCount}>{visibleUsers.length} von {data?.users.length ?? 0} Konten</Text>

      {!data && !error ? <ActivityIndicator color={styles.loading.color} size="large" /> : null}
      {visibleUsers.map((entry) => (
        <PlatformUserCard
          busy={busyKey !== null}
          entry={entry}
          key={entry.user.id}
          onImpersonate={(membershipId) => void impersonate(membershipId)}
          onSaveMembership={(membershipId, role, jagdzeichen) => void saveMembership(entry.user.id, membershipId, role, jagdzeichen)}
          onSaveUser={(payload) => void saveUser(entry.user.id, payload)}
          viewerUserId={session?.user.id}
        />
      ))}

      {data ? <AuditList audit={data.audit.slice(0, 8)} /> : null}
    </ScreenShell>
  );
}

function PlatformUserCard({
  entry,
  viewerUserId,
  busy,
  onSaveUser,
  onSaveMembership,
  onImpersonate
}: {
  entry: PlatformUserSummary;
  viewerUserId?: string;
  busy: boolean;
  onSaveUser: (payload: Parameters<typeof updatePlatformUser>[1]) => void;
  onSaveMembership: (membershipId: string, role: Role, jagdzeichen: string) => void;
  onImpersonate: (membershipId: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(entry.user.name);
  const [email, setEmail] = useState(entry.user.email);
  const [username, setUsername] = useState(entry.user.username ?? "");
  const [phone, setPhone] = useState(entry.user.phone);

  useEffect(() => {
    setName(entry.user.name);
    setEmail(entry.user.email);
    setUsername(entry.user.username ?? "");
    setPhone(entry.user.phone);
  }, [entry]);

  return (
    <View style={styles.userCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.userHeader, pressed ? styles.pressed : null]}
      >
        <View style={styles.userHeaderCopy}>
          <View style={styles.nameRow}>
            <Text numberOfLines={2} style={styles.userName}>{entry.user.name}</Text>
            <Badge tone={entry.disabledAt ? "danger" : "success"}>{entry.disabledAt ? "Deaktiviert" : "Aktiv"}</Badge>
          </View>
          <Text numberOfLines={2} style={styles.meta}>{entry.user.email}</Text>
          <Text numberOfLines={2} style={styles.meta}>{entry.memberships.map((item) => formatRoleLabel(item.role)).join(" · ")}</Text>
        </View>
        <Ionicons color={theme.muted} name={expanded ? "chevron-up" : "chevron-down"} size={21} />
      </Pressable>

      {expanded ? (
        <View style={styles.userDetail}>
          <InputField label="Name" onChangeText={setName} value={name} />
          <InputField autoCapitalize="none" keyboardType="email-address" label="E-Mail" onChangeText={setEmail} value={email} />
          <InputField autoCapitalize="none" label="Benutzername" onChangeText={setUsername} value={username} />
          <InputField keyboardType="phone-pad" label="Telefon" onChangeText={setPhone} value={phone} />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onSaveUser({ name, email, username, phone })}
            style={({ pressed }) => [styles.primaryButton, busy ? styles.disabled : null, pressed ? styles.pressed : null]}
          ><Ionicons color={theme.onAccent} name="save-outline" size={18} /><Text style={styles.primaryButtonText}>Stammdaten speichern</Text></Pressable>

          <View style={styles.statusRow}>
            <View style={styles.grow}><Text style={styles.fieldLabel}>Kontostatus</Text><Text style={styles.meta}>{entry.disabledAt ? "Anmeldung gesperrt" : "Anmeldung möglich"}</Text></View>
            <Switch
              accessibilityLabel="Konto aktiv"
              disabled={busy || entry.user.id === viewerUserId}
              onValueChange={(active) => onSaveUser({ disabled: !active })}
              value={!entry.disabledAt}
            />
          </View>

          <Text style={styles.sectionLabel}>Mitgliedschaften</Text>
          {entry.memberships.map((membership) => (
            <MembershipEditor
              busy={busy}
              disabled={Boolean(entry.disabledAt) || entry.user.id === viewerUserId || membership.role === "platform-admin"}
              key={membership.id}
              membership={membership}
              onImpersonate={() => onImpersonate(membership.id)}
              onSave={(role, jagdzeichen) => onSaveMembership(membership.id, role, jagdzeichen)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MembershipEditor({ membership, busy, disabled, onSave, onImpersonate }: {
  membership: MembershipSummary;
  busy: boolean;
  disabled: boolean;
  onSave: (role: Role, jagdzeichen: string) => void;
  onImpersonate: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [role, setRole] = useState<Role>(membership.role);
  const [jagdzeichen, setJagdzeichen] = useState(membership.jagdzeichen);
  useEffect(() => { setRole(membership.role); setJagdzeichen(membership.jagdzeichen); }, [membership]);

  return (
    <View style={styles.membershipSection}>
      <Text style={styles.membershipName}>{membership.revierName}</Text>
      <Text style={styles.fieldLabel}>Rolle</Text>
      <FilterChipRow
        accessibilityLabel="Rolle wählen"
        onChange={setRole}
        options={ASSIGNABLE_MEMBER_ROLES.map((value) => ({ key: value, label: formatRoleLabel(value) }))}
        value={role}
      />
      <InputField label="Jagdzeichen" onChangeText={setJagdzeichen} value={jagdzeichen} />
      <View style={styles.actionRow}>
        <Pressable disabled={busy} onPress={() => onSave(role, jagdzeichen)} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.ink} name="save-outline" size={17} /><Text style={styles.secondaryButtonText}>Speichern</Text>
        </Pressable>
        <Pressable disabled={busy || disabled} onPress={onImpersonate} style={({ pressed }) => [styles.primaryButton, (busy || disabled) ? styles.disabled : null, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.onAccent} name="log-in-outline" size={17} /><Text style={styles.primaryButtonText}>Impersonieren</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InputField({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor={theme.muted} style={styles.input} {...props} /></View>;
}

function AuditList({ audit }: { audit: PlatformUserListResponse["audit"] }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.auditCard}><Text style={styles.sectionLabel}>Letzte Admin-Aktionen</Text>{audit.map((entry) => <View key={entry.id} style={styles.auditRow}><Text style={styles.auditAction}>{formatAuditAction(entry.action)}</Text><Text style={styles.meta}>{entry.actorName}{entry.targetName ? ` · ${entry.targetName}` : ""}</Text><Text style={styles.meta}>{new Intl.DateTimeFormat("de-AT", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}</Text></View>)}{audit.length === 0 ? <Text style={styles.meta}>Noch keine Admin-Aktionen protokolliert.</Text> : null}</View>;
}

function formatAuditAction(action: PlatformAuditAction) {
  const labels: Record<PlatformAuditAction, string> = {
    "impersonation-started": "Impersonation gestartet",
    "impersonation-ended": "Impersonation beendet",
    "user-updated": "Benutzer geändert",
    "user-disabled": "Benutzer deaktiviert",
    "user-enabled": "Benutzer aktiviert",
    "membership-updated": "Mitgliedschaft geändert"
  };
  return labels[action];
}

const createStyles = (theme: ThemeColors) => ({
  loading: { color: theme.accent },
  resultCount: { color: theme.muted, fontSize: 13 },
  userCard: { ...cardSurface(theme), padding: 0, overflow: "hidden" as const },
  userHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, padding: spacing.md },
  userHeaderCopy: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: spacing.sm },
  userName: { flex: 1, color: theme.ink, fontSize: 17, fontWeight: "700" as const },
  meta: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  userDetail: { gap: spacing.md, padding: spacing.md, borderTopWidth: 1, borderTopColor: theme.inputBorder },
  field: { gap: 6 },
  fieldLabel: { ...eyebrowText(theme), fontSize: 11 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.inputBorder, paddingHorizontal: 13, backgroundColor: theme.surface, color: theme.ink, fontSize: 15 },
  primaryButton: { minHeight: 46, flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 7, paddingHorizontal: 13, borderRadius: 14, backgroundColor: theme.accent },
  primaryButtonText: { color: theme.onAccent, fontSize: 14, fontWeight: "700" as const },
  secondaryButton: { minHeight: 46, flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 7, paddingHorizontal: 13, borderRadius: 14, backgroundColor: theme.surfaceMuted },
  secondaryButtonText: { color: theme.ink, fontSize: 14, fontWeight: "700" as const },
  statusRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: theme.inputBorder },
  grow: { flex: 1, gap: 2 },
  sectionLabel: { ...eyebrowText(theme) },
  membershipSection: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.inputBorder },
  membershipName: { color: theme.ink, fontSize: 16, fontWeight: "700" as const },
  actionRow: { flexDirection: "row" as const, gap: spacing.sm },
  auditCard: { ...cardSurface(theme), gap: spacing.sm },
  auditRow: { gap: 2, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: theme.inputBorder },
  auditAction: { color: theme.ink, fontSize: 14, fontWeight: "700" as const },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.72 }
});
