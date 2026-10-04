import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  canRoleAccess,
  type Aufgabe,
  type Reviermeldung,
  type ReviereinrichtungListItem,
} from "@hege/domain";
import {
  createAufgabe,
  createReviermeldung,
  fetchAufgabenList,
  fetchReviermeldungenList,
  updateAufgabe,
} from "../lib/api";
import { useSessionSnapshot } from "../lib/session";
import { formatDateTime } from "../lib/format";
import { useThemeColors } from "../lib/theme";
import { cardSurface } from "../lib/surfaces";
import { Badge } from "./badge";
import { Disclosure } from "./disclosure";
import { FeedbackBanner } from "./feedback-banner";

export function FacilityWork({
  entry,
  refreshKey,
}: {
  entry: ReviereinrichtungListItem;
  refreshKey: number;
}) {
  const theme = useThemeColors();
  const session = useSessionSnapshot().session;
  const [tasks, setTasks] = useState<Aufgabe[]>([]);
  const [notes, setNotes] = useState<Reviermeldung[]>([]);
  const [mode, setMode] = useState<"task" | "note" | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [allTasks, allNotes] = await Promise.all([
        fetchAufgabenList(),
        fetchReviermeldungenList(),
      ]);
      setTasks(
        allTasks.filter(
          (task) =>
            task.sourceType === "reviereinrichtung" &&
            task.sourceId === entry.id,
        ),
      );
      setNotes(
        allNotes
          .filter(
            (note) =>
              note.relatedType === "reviereinrichtung" &&
              note.relatedId === entry.id &&
              note.status !== "archiviert",
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Einträge konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, [entry.id]);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  const canWrite =
    session && canRoleAccess(session.membership.role, "revierarbeit-read");
  const openTasks = tasks.filter(
    (task) => !["erledigt", "archiviert", "abgelehnt"].includes(task.status),
  );
  const completedTasks = tasks.filter((task) => task.status === "erledigt");
  const legacy = entry.wartung.filter((task) => task.status === "offen");
  async function save() {
    if (
      busy ||
      !canWrite ||
      !mode ||
      !(mode === "task" ? title.trim() : text.trim())
    )
      return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "task")
        await createAufgabe({
          title: title.trim(),
          description: text.trim() || undefined,
          sourceType: "reviereinrichtung",
          sourceId: entry.id,
        });
      else
        await createReviermeldung({
          title: text.trim().split("\n")[0]!.slice(0, 120),
          description: text.trim(),
          category: "reviereinrichtung",
          relatedType: "reviereinrichtung",
          relatedId: entry.id,
        });
      setMessage(
        mode === "task"
          ? "Arbeit bei der Einrichtung gespeichert."
          : "Notiz gespeichert.",
      );
      setTitle("");
      setText("");
      setMode(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function complete(task: Aufgabe) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateAufgabe(task.id, { status: "erledigt" });
      setMessage("Arbeit als erledigt markiert.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Aktualisierung fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  const copy = { color: theme.ink, lineHeight: 22 };
  const input = {
    color: theme.ink,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
  };
  return (
    <View style={{ gap: 12 }} testID="facility-work">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text
          style={{ color: theme.ink, fontSize: 22, fontWeight: "700", flex: 1 }}
        >
          Notizen & Arbeiten
        </Text>
        <Badge
          tone={openTasks.length + legacy.length > 0 ? "warning" : "neutral"}
        >{`${openTasks.length + legacy.length} offen`}</Badge>
      </View>
      {canWrite ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(
            [
              { value: "note", label: "Notiz", icon: "create-outline" },
              { value: "task", label: "Arbeit", icon: "construct-outline" },
            ] as const
          ).map((action) => (
            <Pressable
              key={action.value}
              testID={`facility-add-${action.value}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setMode(action.value);
                setMessage(null);
              }}
              style={{
                ...cardSurface(theme),
                flex: 1,
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 52,
              }}
            >
              <Ionicons name={action.icon} color={theme.ink} size={20} />
              <Text
                style={{
                  color: theme.ink,
                  fontWeight: "700",
                  fontSize: 14,
                  flexShrink: 1,
                }}
              >
                {action.label} hinzufügen
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {mode ? (
        <View style={{ ...cardSurface(theme), gap: 12 }}>
          <Text style={{ ...copy, fontWeight: "700" }}>
            {mode === "task" ? "Was ist zu tun?" : "Notiz zur Einrichtung"}
          </Text>
          {mode === "task" ? (
            <TextInput
              testID="facility-task-title"
              accessibilityLabel="Arbeit"
              placeholder="z. B. Leitersprosse ersetzen"
              placeholderTextColor={theme.muted}
              style={input}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              editable={!busy}
            />
          ) : null}
          <TextInput
            testID={mode === "note" ? "facility-note-input" : "facility-task-description"}
            accessibilityLabel={
              mode === "note" ? "Notiz" : "Details zur Arbeit"
            }
            placeholder={
              mode === "note"
                ? "Beobachtung oder Hinweis …"
                : "Weitere Details (optional)"
            }
            placeholderTextColor={theme.muted}
            multiline
            style={[input, { minHeight: 100, textAlignVertical: "top" }]}
            value={text}
            onChangeText={setText}
            maxLength={4000}
            editable={!busy}
          />
          <Pressable
            testID="facility-work-save"
            accessibilityRole="button"
            disabled={busy || !(mode === "task" ? title.trim() : text.trim())}
            onPress={() => void save()}
            style={{
              minHeight: 48,
              backgroundColor: theme.accent,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.onAccent, fontWeight: "700" }}>
              {busy ? "Wird gespeichert …" : "Speichern"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setMode(null);
              setTitle("");
              setText("");
            }}
            style={{
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={copy}>Abbrechen</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <FeedbackBanner
          tone="danger"
          title="Einträge nicht verfügbar"
          description={error}
        />
      ) : null}
      {message ? <FeedbackBanner tone="success" title={message} /> : null}
      {loading ? (
        <Text style={{ color: theme.muted }}>Einträge werden geladen …</Text>
      ) : !error && openTasks.length + legacy.length === 0 ? (
        <Text style={{ color: theme.muted }}>
          Keine offenen Arbeiten eingetragen.
        </Text>
      ) : null}
      {legacy.map((task) => (
        <View key={task.id} style={{ ...cardSurface(theme), gap: 6 }}>
          <Text style={{ ...copy, fontWeight: "700" }}>{task.title}</Text>
          {task.note ? <Text style={copy}>{task.note}</Text> : null}
          <Text style={{ color: theme.muted }}>
            Wartung · fällig {formatDateTime(task.dueAt)}
          </Text>
        </View>
      ))}
      {openTasks.map((task) => (
        <View key={task.id} style={{ ...cardSurface(theme), gap: 8 }}>
          <Text style={{ ...copy, fontWeight: "700" }}>{task.title}</Text>
          {task.description ? (
            <Text style={copy}>{task.description}</Text>
          ) : null}
          {session &&
          (canRoleAccess(session.membership.role, "revierarbeit-manage") ||
            task.createdByMembershipId === session.membership.id ||
            task.assigneeMembershipIds.includes(session.membership.id)) ? (
            <Pressable
              testID={`facility-task-complete-${task.id}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void complete(task)}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons
                name="checkmark-circle-outline"
                color={theme.accent}
                size={22}
              />
              <Text style={{ color: theme.ink }}>Als erledigt markieren</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Disclosure title={`Notizen (${notes.length})`} testID="facility-notes">
        {notes.length === 0 ? (
          <Text style={{ color: theme.muted }}>Noch keine Notizen.</Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={{ ...cardSurface(theme), gap: 6 }}>
              <Text style={copy}>{note.description ?? note.title}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {formatDateTime(note.createdAt)}
              </Text>
            </View>
          ))
        )}
      </Disclosure>
      {completedTasks.length ? (
        <Disclosure title={`Erledigte Arbeiten (${completedTasks.length})`} testID="facility-completed-tasks">
          {completedTasks.map((task) => (
            <Text key={task.id} style={copy}>
              ✓ {task.title}
            </Text>
          ))}
        </Disclosure>
      ) : null}
    </View>
  );
}
