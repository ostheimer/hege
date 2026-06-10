"use client";

import type {
  ContactDirectoryResponse,
  ContactEntry,
  ContactList,
  RegisteredContact
} from "@hege/domain";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";

import { ListSearchBar } from "../../../components/list-search-bar";
import { StateView } from "../../../components/state-view";
import { readApiErrorMessage } from "../../../lib/api-error";
import { formatRoleLabel } from "../../../lib/labels";
import { filterBySearch, hasActiveSearch } from "../../../lib/list-search";

interface KontakteClientProps {
  directory: ContactDirectoryResponse;
}

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

export function KontakteClient({ directory }: KontakteClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [entryForm, setEntryForm] = useState<EntryFormState>(() => initialEntryForm(directory));
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState("");
  const [editingEntry, setEditingEntry] = useState<{ listId: string; entryId: string } | null>(null);
  const [editingForm, setEditingForm] = useState<EntryFormState>(() => initialEntryForm(directory));
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visibleMembers = useMemo(
    () =>
      filterBySearch(directory.registeredMembers, search, (entry) =>
        [entry.name, entry.phone, entry.jagdzeichen, entry.role].join(" ")
      ),
    [directory.registeredMembers, search]
  );

  const visibleLists = useMemo(
    () =>
      directory.lists
        .map((list) => {
          if (!hasActiveSearch(search)) {
            return list;
          }

          const entries = filterBySearch(list.entries, search, (entry) =>
            [
              list.title,
              entry.name,
              entry.phone,
              entry.revier ?? "",
              entry.funktion ?? "",
              entry.note ?? "",
              entry.linkedMember?.jagdzeichen ?? "",
              entry.linkedMember?.role ?? ""
            ].join(" ")
          );

          return list.title.toLocaleLowerCase("de-AT").includes(search.trim().toLocaleLowerCase("de-AT"))
            ? list
            : { ...list, entries };
        })
        .filter((list) => !hasActiveSearch(search) || list.entries.length > 0 || list.title.toLocaleLowerCase("de-AT").includes(search.trim().toLocaleLowerCase("de-AT"))),
    [directory.lists, search]
  );

  const totalEntries = directory.registeredMembers.length + directory.lists.reduce((sum, list) => sum + list.entries.length, 0);
  const visibleEntries = visibleMembers.length + visibleLists.reduce((sum, list) => sum + list.entries.length, 0);
  const resultLabel = hasActiveSearch(search) ? `${visibleEntries} von ${totalEntries}` : `${totalEntries} Einträge`;
  const canSubmitEntry =
    directory.canManage &&
    entryForm.listId &&
    (entryForm.mode === "member"
      ? entryForm.membershipId
      : entryForm.name.trim() && entryForm.phone.trim());
  const canSubmitEditingEntry =
    editingForm.mode === "member"
      ? Boolean(editingForm.membershipId)
      : Boolean(editingForm.name.trim() && editingForm.phone.trim());

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function updateEntryForm<Key extends keyof EntryFormState>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setEntryForm((current) => ({ ...current, [key]: event.currentTarget.value }));
    };
  }

  function updateEditingForm<Key extends keyof EntryFormState>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setEditingForm((current) => ({ ...current, [key]: event.currentTarget.value }));
    };
  }

  async function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction("create-list", async () => {
      await requestJson("/api/v1/contact-lists", {
        method: "POST",
        body: { title: newListTitle }
      });
      setNewListTitle("");
      setMessage("Kontaktliste angelegt.");
      refresh();
    });
  }

  async function handleCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction("create-entry", async () => {
      await requestJson(`/api/v1/contact-lists/${encodeURIComponent(entryForm.listId)}/entries`, {
        method: "POST",
        body: toEntryPayload(entryForm)
      });
      setEntryForm(initialEntryForm(directory));
      setMessage("Kontakt gespeichert.");
      refresh();
    });
  }

  async function handleRenameList(event: FormEvent<HTMLFormElement>, listId: string) {
    event.preventDefault();
    await runAction(`rename-list-${listId}`, async () => {
      await requestJson(`/api/v1/contact-lists/${encodeURIComponent(listId)}`, {
        method: "PATCH",
        body: { title: editingListTitle }
      });
      setEditingListId(null);
      setEditingListTitle("");
      setMessage("Kontaktliste umbenannt.");
      refresh();
    });
  }

  async function handleDeleteList(list: ContactList) {
    const confirmed = window.confirm(
      `Kontaktliste „${list.title}" mit ${list.entries.length} Einträgen löschen?`
    );
    if (!confirmed) return;

    await runAction(`delete-list-${list.id}`, async () => {
      await requestJson(`/api/v1/contact-lists/${encodeURIComponent(list.id)}`, {
        method: "DELETE"
      });
      setMessage("Kontaktliste gelöscht.");
      refresh();
    });
  }

  async function handleUpdateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEntry) return;

    await runAction(`update-entry-${editingEntry.entryId}`, async () => {
      await requestJson(
        `/api/v1/contact-lists/${encodeURIComponent(editingEntry.listId)}/entries/${encodeURIComponent(editingEntry.entryId)}`,
        {
          method: "PATCH",
          body: toEntryPayload(editingForm)
        }
      );
      setEditingEntry(null);
      setMessage("Kontakt aktualisiert.");
      refresh();
    });
  }

  async function handleDeleteEntry(listId: string, entry: ContactEntry) {
    const confirmed = window.confirm(`Kontakt „${entry.name}" löschen?`);
    if (!confirmed) return;

    await runAction(`delete-entry-${entry.id}`, async () => {
      await requestJson(
        `/api/v1/contact-lists/${encodeURIComponent(listId)}/entries/${encodeURIComponent(entry.id)}`,
        {
          method: "DELETE"
        }
      );
      setMessage("Kontakt gelöscht.");
      refresh();
    });
  }

  function startRenameList(list: ContactList) {
    setEditingListId(list.id);
    setEditingListTitle(list.title);
  }

  function startEditEntry(list: ContactList, entry: ContactEntry) {
    setEditingEntry({ listId: list.id, entryId: entry.id });
    setEditingForm({
      listId: list.id,
      mode: entry.membershipId ? "member" : "external",
      membershipId: entry.membershipId ?? directory.registeredMembers[0]?.membershipId ?? "",
      name: entry.membershipId ? "" : entry.name,
      phone: entry.membershipId ? "" : entry.phone,
      revier: entry.revier ?? "",
      funktion: entry.funktion ?? "",
      note: entry.note ?? ""
    });
  }

  async function runAction(action: string, callback: () => Promise<void>) {
    if (busyAction) return;

    setBusyAction(action);
    setError(null);
    setMessage(null);

    try {
      await callback();
    } catch (actionError) {
      setError(readApiErrorMessage(actionError, "Aktion konnte nicht ausgeführt werden."));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Suche</p>
            <h2>Alle Kontakte durchsuchen</h2>
          </div>
        </header>
        <ListSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Suche Name, Telefonnummer, Funktion oder Revier"
          resultLabel={resultLabel}
        />
        <div aria-live="polite" className="form-messages">
          {message ? <p className="feedback feedback-success">{message}</p> : null}
          {error ? <p className="feedback feedback-error">{error}</p> : null}
        </div>
      </section>

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Automatisch</p>
            <h2>Mitglieder der Jagdgesellschaft</h2>
          </div>
        </header>

        {visibleMembers.length === 0 ? (
          <StateView
            mode="empty"
            title="Keine Mitglieder gefunden"
            description="Mit der aktuellen Suche findet sich kein registriertes Mitglied."
            bare
          />
        ) : (
          <div className="contact-list-grid">
            {visibleMembers.map((member) => (
              <ContactCard key={member.membershipId} contact={member} />
            ))}
          </div>
        )}
      </section>

      {directory.canManage ? (
        <section className="section-card">
          <header className="section-header">
            <div>
              <p className="eyebrow">Pflege</p>
              <h2>Listen und Kontakte anlegen</h2>
            </div>
          </header>

          <form className="ansitz-form" onSubmit={(event) => void handleCreateList(event)}>
            <label className="field" htmlFor="contact-list-title">
              <span>Neue Liste</span>
              <input
                id="contact-list-title"
                onChange={(event) => setNewListTitle(event.currentTarget.value)}
                placeholder="z. B. Tierärzte"
                required
                value={newListTitle}
              />
            </label>
            <div className="form-footer field-full">
              <button
                className="button-control"
                disabled={busyAction === "create-list" || isPending}
                type="submit"
              >
                Liste anlegen
              </button>
            </div>
          </form>

          <form className="ansitz-form contact-entry-form" onSubmit={(event) => void handleCreateEntry(event)}>
            <label className="field" htmlFor="contact-entry-list">
              <span>Kontaktliste</span>
              <select id="contact-entry-list" required value={entryForm.listId} onChange={updateEntryForm("listId")}>
                {directory.lists.length === 0 ? <option value="">Keine Liste vorhanden</option> : null}
                {directory.lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="contact-entry-mode">
              <span>Kontaktart</span>
              <select
                id="contact-entry-mode"
                value={entryForm.mode}
                onChange={(event) =>
                  setEntryForm((current) =>
                    withEntryModeDefaults(current, event.currentTarget.value as EntryMode, directory)
                  )
                }
              >
                <option value="member">Registriertes Mitglied</option>
                <option value="external">Freier Kontakt</option>
              </select>
            </label>

            {entryForm.mode === "member" ? (
              <label className="field" htmlFor="contact-entry-member">
                <span>Mitglied</span>
                <select
                  id="contact-entry-member"
                  required
                  value={entryForm.membershipId}
                  onChange={updateEntryForm("membershipId")}
                >
                  {directory.registeredMembers.map((member) => (
                    <option key={member.membershipId} value={member.membershipId}>
                      {member.name} · {formatRoleLabel(member.role)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="field" htmlFor="contact-entry-name">
                  <span>Name</span>
                  <input id="contact-entry-name" required value={entryForm.name} onChange={updateEntryForm("name")} />
                </label>
                <label className="field" htmlFor="contact-entry-phone">
                  <span>Telefonnummer</span>
                  <input
                    autoComplete="tel"
                    id="contact-entry-phone"
                    required
                    type="tel"
                    value={entryForm.phone}
                    onChange={updateEntryForm("phone")}
                  />
                </label>
              </>
            )}

            <label className="field" htmlFor="contact-entry-revier">
              <span>Revier (optional)</span>
              <input id="contact-entry-revier" value={entryForm.revier} onChange={updateEntryForm("revier")} />
            </label>
            <label className="field" htmlFor="contact-entry-funktion">
              <span>Funktion (optional)</span>
              <input id="contact-entry-funktion" value={entryForm.funktion} onChange={updateEntryForm("funktion")} />
            </label>
            <label className="field field-full" htmlFor="contact-entry-note">
              <span>Notiz (optional)</span>
              <textarea id="contact-entry-note" value={entryForm.note} onChange={updateEntryForm("note")} />
            </label>

            <div className="form-footer field-full">
              <button
                className="button-control"
                disabled={!canSubmitEntry || busyAction === "create-entry" || isPending}
                type="submit"
              >
                Kontakt speichern
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Freie Listen</p>
            <h2>Reviernachbarn, Weidkameraden und Notrufnummern</h2>
          </div>
        </header>

        {visibleLists.length === 0 ? (
          <StateView
            mode="empty"
            title="Keine Kontaktliste gefunden"
            description="Mit der aktuellen Suche findet sich kein freier Kontakt."
            bare
          />
        ) : (
          <div className="contact-list-stack">
            {visibleLists.map((list) => (
              <article key={list.id} className="detail-card contact-list-card">
                <div className="detail-card-header">
                  {editingListId === list.id ? (
                    <form className="contact-inline-form" onSubmit={(event) => void handleRenameList(event, list.id)}>
                      <label className="field" htmlFor={`contact-list-edit-${list.id}`}>
                        <span>Listenname</span>
                        <input
                          id={`contact-list-edit-${list.id}`}
                          onChange={(event) => setEditingListTitle(event.currentTarget.value)}
                          required
                          value={editingListTitle}
                        />
                      </label>
                      <button className="button-control" disabled={busyAction === `rename-list-${list.id}`} type="submit">
                        Speichern
                      </button>
                      <button className="button-control button-control-secondary" onClick={() => setEditingListId(null)} type="button">
                        Abbrechen
                      </button>
                    </form>
                  ) : (
                    <div>
                      <p className="eyebrow">{list.entries.length} Einträge</p>
                      <h2>{list.title}</h2>
                    </div>
                  )}
                  {directory.canManage && editingListId !== list.id ? (
                    <div className="section-actions">
                      <button className="button-control button-control-secondary" onClick={() => startRenameList(list)} type="button">
                        Umbenennen
                      </button>
                      <button
                        className="button-control button-control-danger"
                        disabled={busyAction === `delete-list-${list.id}`}
                        onClick={() => void handleDeleteList(list)}
                        type="button"
                      >
                        Löschen
                      </button>
                    </div>
                  ) : null}
                </div>

                {list.entries.length === 0 ? (
                  <StateView mode="empty" title="Noch keine Kontakte" description="Neue Kontakte können oben in diese Liste eingetragen werden." bare />
                ) : (
                  <div className="contact-list-grid">
                    {list.entries.map((entry) => (
                      <div key={entry.id}>
                        {editingEntry?.entryId === entry.id ? (
                          <form className="contact-edit-card" onSubmit={(event) => void handleUpdateEntry(event)}>
                            <label className="field" htmlFor={`contact-edit-mode-${entry.id}`}>
                              <span>Kontaktart</span>
                              <select
                                id={`contact-edit-mode-${entry.id}`}
                                value={editingForm.mode}
                                onChange={(event) =>
                                  setEditingForm((current) =>
                                    withEntryModeDefaults(current, event.currentTarget.value as EntryMode, directory)
                                  )
                                }
                              >
                                <option value="member">Registriertes Mitglied</option>
                                <option value="external">Freier Kontakt</option>
                              </select>
                            </label>
                            {editingForm.mode === "member" ? (
                              <label className="field" htmlFor={`contact-edit-member-${entry.id}`}>
                                <span>Mitglied</span>
                                <select
                                  id={`contact-edit-member-${entry.id}`}
                                  required
                                  value={editingForm.membershipId}
                                  onChange={updateEditingForm("membershipId")}
                                >
                                  {directory.registeredMembers.map((member) => (
                                    <option key={member.membershipId} value={member.membershipId}>
                                      {member.name} · {formatRoleLabel(member.role)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <>
                                <label className="field" htmlFor={`contact-edit-name-${entry.id}`}>
                                  <span>Name</span>
                                  <input
                                    id={`contact-edit-name-${entry.id}`}
                                    required
                                    value={editingForm.name}
                                    onChange={updateEditingForm("name")}
                                  />
                                </label>
                                <label className="field" htmlFor={`contact-edit-phone-${entry.id}`}>
                                  <span>Telefonnummer</span>
                                  <input
                                    id={`contact-edit-phone-${entry.id}`}
                                    required
                                    type="tel"
                                    value={editingForm.phone}
                                    onChange={updateEditingForm("phone")}
                                  />
                                </label>
                              </>
                            )}
                            <label className="field" htmlFor={`contact-edit-revier-${entry.id}`}>
                              <span>Revier</span>
                              <input id={`contact-edit-revier-${entry.id}`} value={editingForm.revier} onChange={updateEditingForm("revier")} />
                            </label>
                            <label className="field" htmlFor={`contact-edit-funktion-${entry.id}`}>
                              <span>Funktion</span>
                              <input id={`contact-edit-funktion-${entry.id}`} value={editingForm.funktion} onChange={updateEditingForm("funktion")} />
                            </label>
                            <label className="field field-full" htmlFor={`contact-edit-note-${entry.id}`}>
                              <span>Notiz</span>
                              <textarea id={`contact-edit-note-${entry.id}`} value={editingForm.note} onChange={updateEditingForm("note")} />
                            </label>
                            <div className="form-footer field-full">
                              <button className="button-control" disabled={!canSubmitEditingEntry || busyAction === `update-entry-${entry.id}`} type="submit">
                                Kontakt aktualisieren
                              </button>
                              <button className="button-control button-control-secondary" onClick={() => setEditingEntry(null)} type="button">
                                Abbrechen
                              </button>
                            </div>
                          </form>
                        ) : (
                          <ContactCard
                            contact={entry}
                            actions={
                              directory.canManage ? (
                                <>
                                  <button className="button-control button-control-secondary" onClick={() => startEditEntry(list, entry)} type="button">
                                    Bearbeiten
                                  </button>
                                  <button
                                    className="button-control button-control-danger"
                                    disabled={busyAction === `delete-entry-${entry.id}`}
                                    onClick={() => void handleDeleteEntry(list.id, entry)}
                                    type="button"
                                  >
                                    Löschen
                                  </button>
                                </>
                              ) : null
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function initialEntryForm(directory: ContactDirectoryResponse): EntryFormState {
  return {
    ...EMPTY_ENTRY_FORM,
    listId: directory.lists[0]?.id ?? "",
    membershipId: directory.registeredMembers[0]?.membershipId ?? "",
    mode: directory.registeredMembers.length > 0 ? "member" : "external"
  };
}

function withEntryModeDefaults(
  form: EntryFormState,
  mode: EntryMode,
  directory: ContactDirectoryResponse
): EntryFormState {
  return {
    ...form,
    mode,
    membershipId:
      mode === "member"
        ? form.membershipId || directory.registeredMembers[0]?.membershipId || ""
        : form.membershipId
  };
}

function toEntryPayload(form: EntryFormState) {
  if (form.mode === "member") {
    return {
      membershipId: form.membershipId,
      revier: form.revier.trim() || undefined,
      funktion: form.funktion.trim() || undefined,
      note: form.note.trim() || undefined
    };
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

function ContactCard({
  contact,
  actions
}: {
  contact: ContactEntry | RegisteredContact;
  actions?: React.ReactNode;
}) {
  const detail = "linkedMember" in contact && contact.linkedMember ? contact.linkedMember : contact;
  const funktion = "funktion" in contact ? contact.funktion : undefined;
  const revier = "revier" in contact ? contact.revier : undefined;
  const note = "note" in contact ? contact.note : undefined;
  const label = funktion ?? ("role" in detail ? `${formatRoleLabel(detail.role)} · ${detail.jagdzeichen}` : "Kontakt");

  return (
    <article className="contact-card">
      <div>
        <p className="eyebrow">{label}</p>
        <h3>{contact.name}</h3>
        <a href={toTelHref(contact.phone)}>{contact.phone}</a>
      </div>
      {revier ? <p>Revier: {revier}</p> : null}
      {note ? <p>{note}</p> : null}
      <div className="contact-card-actions">
        <a className="button-control button-control-secondary" href={toTelHref(contact.phone)}>
          Anrufen
        </a>
        {actions}
      </div>
    </article>
  );
}

async function requestJson(path: string, options: { method: string; body?: unknown }) {
  const response = await fetch(path, {
    method: options.method,
    headers: options.body === undefined ? undefined : { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw body;
  }

  return response.json();
}


function toTelHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "#";
}
