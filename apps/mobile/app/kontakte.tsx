import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { ContactDirectoryResponse, ContactEntry, ContactList, RegisteredContact } from "@hege/domain";

import { ScreenShell } from "../components/screen-shell";
import { SearchInput } from "../components/search-input";
import { SelectField } from "../components/select-field";
import { StateView } from "../components/state-view";
import {
  createContactEntry,
  createContactList,
  deleteContactEntry,
  deleteContactList,
  fetchContactDirectory,
  updateContactEntry,
  updateContactList
} from "../lib/api";
import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

type EntryMode = "member" | "external";

interface EntryFormState {
  listId: string;
  mode: EntryMode;
  membershipId: string;
  name: string;
  phone: string;
  revier: string;
  funktion: string;
  note: string;
}

const EMPTY_ENTRY_FORM: EntryFormState = {
  listId: "",
  mode: "member",
  membershipId: "",
  name: "",
  phone: "",
  revier: "",
  funktion: "",
  note: ""
};

export default function KontakteScreen() {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [directory, setDirectory] = useState<ContactDirectoryResponse | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState("");
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [entryForm, setEntryForm] = useState<EntryFormState>(EMPTY_ENTRY_FORM);
  const [editingEntry, setEditingEntry] = useState<{ listId: string; entryId: string } | null>(null);
  const [editingForm, setEditingForm] = useState<EntryFormState>(EMPTY_ENTRY_FORM);

  useEffect(() => {
    void loadContacts();
  }, []);

  useEffect(() => {
    if (!directory) return;

    setEntryForm((current) => ensureFormDefaults(current, directory));
    setEditingForm((current) => ensureFormDefaults(current, directory));
  }, [directory]);

  const visibleMembers = useMemo(() => {
    if (!directory) return [];
    return directory.registeredMembers.filter((entry) =>
      matchesSearch(search, [entry.name, entry.phone, entry.role, entry.jagdzeichen])
    );
  }, [directory, search]);

  const visibleLists = useMemo(() => {
    if (!directory) return [];
    return directory.lists
      .map((list) => {
        if (!search.trim()) return list;
        const entries = list.entries.filter((entry) =>
          matchesSearch(search, [
            list.title,
            entry.name,
            entry.phone,
            entry.revier,
            entry.funktion,
            entry.note,
            entry.linkedMember?.jagdzeichen,
            entry.linkedMember?.role
          ])
        );
        return list.title.toLocaleLowerCase("de-AT").includes(search.trim().toLocaleLowerCase("de-AT"))
          ? list
          : { ...list, entries };
      })
      .filter((list) => !search.trim() || list.entries.length > 0 || list.title.toLocaleLowerCase("de-AT").includes(search.trim().toLocaleLowerCase("de-AT")));
  }, [directory, search]);

  async function loadContacts(options?: { refreshing?: boolean }) {
    const refreshing = options?.refreshing ?? false;
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const next = await fetchContactDirectory();
      setDirectory(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kontakte konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleCreateList() {
    if (!newListTitle.trim() || isSubmitting) return;

    await runSubmit(async () => {
      await createContactList({ title: newListTitle });
      setNewListTitle("");
      setMessage("Kontaktliste angelegt.");
    });
  }

  async function handleRenameList() {
    if (!renamingListId || !renameTitle.trim() || isSubmitting) return;

    await runSubmit(async () => {
      await updateContactList(renamingListId, { title: renameTitle });
      setRenamingListId(null);
      setRenameTitle("");
      setMessage("Kontaktliste umbenannt.");
    });
  }

  function confirmDeleteList(list: ContactList) {
    Alert.alert("Kontaktliste löschen", `„${list.title}" mit ${list.entries.length} Einträgen löschen?`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => {
          void runSubmit(async () => {
            await deleteContactList(list.id);
            setMessage("Kontaktliste gelöscht.");
          });
        }
      }
    ]);
  }

  async function handleCreateEntry() {
    if (!directory || isSubmitting || !entryForm.listId) return;

    await runSubmit(async () => {
      await createContactEntry(entryForm.listId, toCreateEntryPayload(entryForm));
      setEntryForm(ensureFormDefaults(EMPTY_ENTRY_FORM, directory));
      setMessage("Kontakt gespeichert.");
    });
  }

  async function handleUpdateEntry() {
    if (!directory || !editingEntry || isSubmitting) return;

    await runSubmit(async () => {
      await updateContactEntry(editingEntry.listId, editingEntry.entryId, toUpdateEntryPayload(editingForm));
      setEditingEntry(null);
      setEditingForm(ensureFormDefaults(EMPTY_ENTRY_FORM, directory));
      setMessage("Kontakt aktualisiert.");
    });
  }

  function confirmDeleteEntry(listId: string, entry: ContactEntry) {
    Alert.alert("Kontakt löschen", `„${entry.name}" aus der Liste entfernen?`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => {
          void runSubmit(async () => {
            await deleteContactEntry(listId, entry.id);
            setMessage("Kontakt gelöscht.");
          });
        }
      }
    ]);
  }

  async function runSubmit(callback: () => Promise<void>) {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await callback();
      await loadContacts({ refreshing: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Aktion konnte nicht ausgeführt werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startRenameList(list: ContactList) {
    setRenamingListId(list.id);
    setRenameTitle(list.title);
  }

  function startEditEntry(list: ContactList, entry: ContactEntry) {
    setEditingEntry({ listId: list.id, entryId: entry.id });
    setEditingForm({
      listId: list.id,
      mode: entry.membershipId ? "member" : "external",
      membershipId: entry.membershipId ?? directory?.registeredMembers[0]?.membershipId ?? "",
      name: entry.membershipId ? "" : entry.name,
      phone: entry.membershipId ? "" : entry.phone,
      revier: entry.revier ?? "",
      funktion: entry.funktion ?? "",
      note: entry.note ?? ""
    });
  }

  if (isLoading) {
    return (
      <ScreenShell compactHero topSafeArea={false} eyebrow="Kontakte" title="Telefonlisten" subtitle="Kontakte werden geladen.">
        <StateView mode="loading" title="Kontakte werden geladen" />
      </ScreenShell>
    );
  }

  if (!directory) {
    return (
      <ScreenShell compactHero topSafeArea={false} eyebrow="Kontakte" title="Telefonlisten" subtitle="Kontakte im Revier.">
        <StateView
          mode="error"
          title="Kontakte nicht verfügbar"
          description={error ?? "Bitte versuche es erneut."}
          action={{ label: "Erneut laden", onPress: () => void loadContacts() }}
        />
      </ScreenShell>
    );
  }

  const listOptions = directory.lists.map((list) => ({ value: list.id, label: list.title }));
  const memberOptions = directory.registeredMembers.map((member) => ({
    value: member.membershipId,
    label: `${member.name} · ${formatRoleLabel(member.role)}`
  }));
  const canCreateEntry =
    directory.canManage &&
    entryForm.listId &&
    (entryForm.mode === "member"
      ? entryForm.membershipId
      : entryForm.name.trim() && entryForm.phone.trim());

  return (
    <ScreenShell
      compactHero
      eyebrow="Kontakte"
      topSafeArea={false}
      title="Telefonlisten"
      subtitle="Mitglieder, Reviernachbarn und Notrufnummern griffbereit."
      refresh={{
        refreshing: isRefreshing,
        onRefresh: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void loadContacts({ refreshing: true });
        }
      }}
    >
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Suche Name, Nummer, Funktion oder Revier"
      />

      {message ? <Text style={styles.successText}>{message}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Automatisch</Text>
            <Text style={styles.sectionTitle}>Mitglieder der Jagdgesellschaft</Text>
          </View>
          <Text style={styles.countBadge}>{visibleMembers.length}</Text>
        </View>
        {visibleMembers.length === 0 ? (
          <StateView mode="empty" title="Keine Mitglieder gefunden" bare />
        ) : (
          <View style={styles.cardList}>
            {visibleMembers.map((member) => (
              <ContactCard key={member.membershipId} contact={member} />
            ))}
          </View>
        )}
      </View>

      {directory.canManage ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.eyebrow}>Pflege</Text>
              <Text style={styles.sectionTitle}>Listen und Kontakte</Text>
            </View>
          </View>

          <View style={styles.formBlock}>
            <LabeledInput
              label="Neue Liste"
              onChangeText={setNewListTitle}
              placeholder="z. B. Tierärzte"
              value={newListTitle}
            />
            <PrimaryButton
              disabled={!newListTitle.trim() || isSubmitting}
              icon="add"
              label={isSubmitting ? "Speichert..." : "Liste anlegen"}
              onPress={() => void handleCreateList()}
            />
          </View>

          {listOptions.length === 0 ? (
            <StateView
              mode="empty"
              title="Noch keine Liste"
              description="Lege zuerst eine Kontaktliste an."
              bare
            />
          ) : (
            <View style={styles.formBlock}>
              <SelectField label="Kontaktliste" options={listOptions} value={entryForm.listId} onChange={(listId) => setEntryForm((current) => ({ ...current, listId }))} />
              <SelectField
                label="Kontaktart"
                options={[
                  { value: "member", label: "Registriertes Mitglied" },
                  { value: "external", label: "Freier Kontakt" }
                ]}
                value={entryForm.mode}
                onChange={(mode) => setEntryForm((current) => ({ ...current, mode }))}
              />
              {entryForm.mode === "member" ? (
                <SelectField
                  label="Mitglied"
                  options={memberOptions}
                  value={entryForm.membershipId}
                  onChange={(membershipId) => setEntryForm((current) => ({ ...current, membershipId }))}
                />
              ) : (
                <>
                  <LabeledInput label="Name" value={entryForm.name} onChangeText={(name) => setEntryForm((current) => ({ ...current, name }))} />
                  <LabeledInput label="Telefonnummer" value={entryForm.phone} keyboardType="phone-pad" onChangeText={(phone) => setEntryForm((current) => ({ ...current, phone }))} />
                </>
              )}
              <LabeledInput label="Revier" value={entryForm.revier} onChangeText={(revier) => setEntryForm((current) => ({ ...current, revier }))} />
              <LabeledInput label="Funktion" value={entryForm.funktion} onChangeText={(funktion) => setEntryForm((current) => ({ ...current, funktion }))} />
              <LabeledInput label="Notiz" value={entryForm.note} multiline onChangeText={(note) => setEntryForm((current) => ({ ...current, note }))} />
              <PrimaryButton
                disabled={!canCreateEntry || isSubmitting}
                icon="save-outline"
                label={isSubmitting ? "Speichert..." : "Kontakt speichern"}
                onPress={() => void handleCreateEntry()}
              />
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Freie Listen</Text>
            <Text style={styles.sectionTitle}>Revierkontakte</Text>
          </View>
          <Text style={styles.countBadge}>{visibleLists.length}</Text>
        </View>
        {visibleLists.length === 0 ? (
          <StateView mode="empty" title="Keine Kontaktliste gefunden" bare />
        ) : (
          <View style={styles.cardList}>
            {visibleLists.map((list) => (
              <View key={list.id} style={styles.listCard}>
                {renamingListId === list.id ? (
                  <View style={styles.formBlock}>
                    <LabeledInput label="Listenname" value={renameTitle} onChangeText={setRenameTitle} />
                    <View style={styles.actionRow}>
                      <PrimaryButton disabled={!renameTitle.trim() || isSubmitting} label="Speichern" icon="save-outline" onPress={() => void handleRenameList()} />
                      <SecondaryButton label="Abbrechen" onPress={() => setRenamingListId(null)} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.eyebrow}>{list.entries.length} Einträge</Text>
                      <Text style={styles.listTitle}>{list.title}</Text>
                    </View>
                    {directory.canManage ? (
                      <View style={styles.iconActions}>
                        <IconButton icon="create-outline" label="Liste umbenennen" onPress={() => startRenameList(list)} />
                        <IconButton icon="trash-outline" label="Liste löschen" danger onPress={() => confirmDeleteList(list)} />
                      </View>
                    ) : null}
                  </View>
                )}

                {list.entries.length === 0 ? (
                  <Text style={styles.emptyInline}>Noch keine Kontakte in dieser Liste.</Text>
                ) : (
                  list.entries.map((entry) =>
                    editingEntry?.entryId === entry.id ? (
                      <View key={entry.id} style={styles.editCard}>
                        <SelectField
                          label="Kontaktart"
                          options={[
                            { value: "member", label: "Registriertes Mitglied" },
                            { value: "external", label: "Freier Kontakt" }
                          ]}
                          value={editingForm.mode}
                          onChange={(mode) => setEditingForm((current) => ({ ...current, mode }))}
                        />
                        {editingForm.mode === "member" ? (
                          <SelectField
                            label="Mitglied"
                            options={memberOptions}
                            value={editingForm.membershipId}
                            onChange={(membershipId) => setEditingForm((current) => ({ ...current, membershipId }))}
                          />
                        ) : (
                          <>
                            <LabeledInput label="Name" value={editingForm.name} onChangeText={(name) => setEditingForm((current) => ({ ...current, name }))} />
                            <LabeledInput label="Telefonnummer" value={editingForm.phone} keyboardType="phone-pad" onChangeText={(phone) => setEditingForm((current) => ({ ...current, phone }))} />
                          </>
                        )}
                        <LabeledInput label="Revier" value={editingForm.revier} onChangeText={(revier) => setEditingForm((current) => ({ ...current, revier }))} />
                        <LabeledInput label="Funktion" value={editingForm.funktion} onChangeText={(funktion) => setEditingForm((current) => ({ ...current, funktion }))} />
                        <LabeledInput label="Notiz" value={editingForm.note} multiline onChangeText={(note) => setEditingForm((current) => ({ ...current, note }))} />
                        <View style={styles.actionRow}>
                          <PrimaryButton disabled={isSubmitting} icon="save-outline" label="Aktualisieren" onPress={() => void handleUpdateEntry()} />
                          <SecondaryButton label="Abbrechen" onPress={() => setEditingEntry(null)} />
                        </View>
                      </View>
                    ) : (
                      <ContactCard
                        key={entry.id}
                        contact={entry}
                        actions={
                          directory.canManage ? (
                            <View style={styles.iconActions}>
                              <IconButton icon="create-outline" label="Kontakt bearbeiten" onPress={() => startEditEntry(list, entry)} />
                              <IconButton icon="trash-outline" label="Kontakt löschen" danger onPress={() => confirmDeleteEntry(list.id, entry)} />
                            </View>
                          ) : null
                        }
                      />
                    )
                  )
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {isSubmitting ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : null}
    </ScreenShell>
  );
}

function ContactCard({
  contact,
  actions
}: {
  contact: ContactEntry | RegisteredContact;
  actions?: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  const roleOrFunction =
    "funktion" in contact && contact.funktion
      ? contact.funktion
      : "role" in contact
        ? `${formatRoleLabel(contact.role)} · ${contact.jagdzeichen}`
        : contact.linkedMember
          ? `${formatRoleLabel(contact.linkedMember.role)} · ${contact.linkedMember.jagdzeichen}`
          : "Kontakt";

  return (
    <View style={styles.contactCard}>
      <View style={styles.contactMain}>
        <View style={styles.contactIcon}>
          <Ionicons name="call-outline" size={18} color="#fff8ec" />
        </View>
        <View style={styles.contactCopy}>
          <Text style={styles.contactMeta}>{roleOrFunction}</Text>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          {"revier" in contact && contact.revier ? <Text style={styles.contactMuted}>Revier: {contact.revier}</Text> : null}
          {"note" in contact && contact.note ? <Text style={styles.contactMuted}>{contact.note}</Text> : null}
        </View>
      </View>
      <View style={styles.contactActions}>
        <IconButton accent icon="call-outline" label={`Anrufen: ${contact.name}`} onPress={() => void Linking.openURL(toTelHref(contact.phone))} />
        {actions}
      </View>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad";
}) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();

  return (
    <View style={styles.inputField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        style={[styles.input, multiline ? styles.textArea : null]}
        value={value}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  icon
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      {icon ? <Ionicons color="#fff8ec" name={icon} size={17} /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  icon
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
    >
      {icon ? <Ionicons color="#19392c" name={icon} size={16} /> : null}
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function IconButton({
  label,
  icon,
  onPress,
  danger,
  accent
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        accent ? styles.iconButtonAccent : null,
        danger ? styles.iconButtonDanger : null,
        pressed ? styles.pressed : null
      ]}
    >
      <Ionicons color={accent ? "#fff8ec" : danger ? "#9d4a3f" : "#19392c"} name={icon} size={18} />
    </Pressable>
  );
}

function ensureFormDefaults(form: EntryFormState, directory: ContactDirectoryResponse): EntryFormState {
  return {
    ...form,
    listId: form.listId || directory.lists[0]?.id || "",
    membershipId: form.membershipId || directory.registeredMembers[0]?.membershipId || "",
    mode: directory.registeredMembers.length > 0 ? form.mode : "external"
  };
}

function toCreateEntryPayload(form: EntryFormState) {
  if (form.mode === "member") {
    return {
      membershipId: form.membershipId,
      revier: form.revier.trim() || undefined,
      funktion: form.funktion.trim() || undefined,
      note: form.note.trim() || undefined
    };
  }

  return {
    name: form.name,
    phone: form.phone,
    revier: form.revier.trim() || undefined,
    funktion: form.funktion.trim() || undefined,
    note: form.note.trim() || undefined
  };
}

function toUpdateEntryPayload(form: EntryFormState) {
  if (form.mode === "member") {
    return toCreateEntryPayload(form);
  }

  return {
    membershipId: null,
    name: form.name,
    phone: form.phone,
    revier: form.revier.trim() || undefined,
    funktion: form.funktion.trim() || undefined,
    note: form.note.trim() || undefined
  };
}

function matchesSearch(search: string, values: Array<string | undefined>) {
  const normalized = search.trim().toLocaleLowerCase("de-AT");
  if (!normalized) return true;

  return values.some((value) => value?.toLocaleLowerCase("de-AT").includes(normalized));
}

function toTelHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "tel:";
}

function formatRoleLabel(role: RegisteredContact["role"]) {
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

const createStyles = (theme: ThemeColors) =>
  ({
    sectionCard: {
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: theme.card
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12
    },
    eyebrow: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      color: theme.muted
    },
    sectionTitle: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: "700",
      color: theme.ink
    },
    countBadge: {
      overflow: "hidden",
      minWidth: 30,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: "rgba(157, 179, 111, 0.2)",
      color: theme.ink,
      fontWeight: "700",
      textAlign: "center"
    },
    cardList: {
      gap: 10
    },
    listCard: {
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.54)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(25, 57, 44, 0.12)"
    },
    listTitle: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: "700",
      color: theme.ink
    },
    contactCard: {
      gap: 10,
      padding: 12,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(25, 57, 44, 0.1)"
    },
    contactMain: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12
    },
    contactIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.accent
    },
    contactCopy: {
      flex: 1,
      gap: 3
    },
    contactMeta: {
      fontSize: 12,
      color: theme.muted
    },
    contactName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.ink
    },
    contactPhone: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.accent
    },
    contactMuted: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    },
    contactActions: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      alignSelf: "flex-start"
    },
    iconActions: {
      flexDirection: "row",
      gap: 6
    },
    formBlock: {
      gap: 12,
      paddingTop: 4
    },
    inputField: {
      gap: 6
    },
    inputLabel: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      color: theme.muted
    },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#d9d2c4",
      backgroundColor: theme.surface,
      color: theme.ink,
      fontSize: 16
    },
    textArea: {
      minHeight: 92,
      textAlignVertical: "top"
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    primaryButton: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: theme.accent
    },
    primaryButtonText: {
      color: "#fff8ec",
      fontSize: 14,
      fontWeight: "700"
    },
    secondaryButton: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: "#e3dccd"
    },
    secondaryButtonText: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: "700"
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#e3dccd"
    },
    iconButtonAccent: {
      backgroundColor: theme.accent
    },
    iconButtonDanger: {
      backgroundColor: "rgba(157, 74, 63, 0.12)"
    },
    disabled: {
      opacity: 0.55
    },
    pressed: {
      opacity: 0.82
    },
    editCard: {
      gap: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: "rgba(255, 255, 255, 0.7)"
    },
    emptyInline: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    successText: {
      padding: 12,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "rgba(157, 179, 111, 0.18)",
      color: theme.ink,
      fontWeight: "700"
    },
    errorText: {
      padding: 12,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "rgba(157, 74, 63, 0.12)",
      color: theme.danger,
      fontWeight: "700"
    },
    savingOverlay: {
      alignItems: "center",
      padding: 12
    }
  }) as const;
