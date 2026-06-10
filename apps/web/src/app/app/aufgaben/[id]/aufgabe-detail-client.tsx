"use client";

import type {
  Aufgabe,
  AufgabePrioritaet,
  AufgabeStatus,
  Reviermeldung
} from "@hege/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";

import { readApiErrorMessage } from "../../../../lib/api-error";
import { formatRoleLabel } from "../../../../lib/labels";

interface EditFormState {
  title: string;
  description: string;
  priority: AufgabePrioritaet;
  dueAt: string;
  assigneeMembershipId: string;
}

/**
 * `dueAt` aus der API ist ISO mit Zeitzone, das HTML datetime-local-
 * Input erwartet aber `YYYY-MM-DDTHH:mm` ohne Zone. Wir konvertieren
 * hier waehrend des Initialisierens — die Zone bleibt impliziert die
 * Browser-Local-Zone (Europe/Vienna fuer unsere User).
 */
function formatDueAtForInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // YYYY-MM-DDTHH:mm — kein Sekunden-Teil
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

interface MembershipOption {
  membershipId: string;
  userName: string;
  role: string;
  jagdzeichen: string;
}

interface AufgabeDetailClientProps {
  aufgabe: Aufgabe;
  memberships: MembershipOption[];
  /** Optional, nur gesetzt wenn aufgabe.sourceType === "reviermeldung". */
  sourceMeldung?: Reviermeldung;
}

const PRIORITY_LABEL: Record<AufgabePrioritaet, string> = {
  dringend: "Dringend",
  hoch: "Hoch",
  normal: "Normal",
  niedrig: "Niedrig"
};

const STATUS_LABEL: Record<AufgabeStatus, string> = {
  offen: "Offen",
  angenommen: "Angenommen",
  in_arbeit: "In Arbeit",
  blockiert: "Blockiert",
  erledigt: "Erledigt",
  abgelehnt: "Abgelehnt",
  archiviert: "Archiviert"
};

export function AufgabeDetailClient({
  aufgabe,
  memberships,
  sourceMeldung
}: AufgabeDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit-Mode: standardmaessig aus, der Detail-View zeigt die Werte
  // erst nur read-only. "Bearbeiten" toggle-button macht den Form-State
  // sichtbar. Beim Toggle wird das Form-State frisch aus aufgabe-Props
  // initialisiert — kein stale-state-Problem wenn router.refresh() im
  // Hintergrund neue Daten holt.
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(() =>
    buildEditForm(aufgabe)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Tracking, ob der User die Assignee-Auswahl beruehrt hat. Wichtig
  // bei Multi-Assignee-Aufgaben: der Form-State haelt nur den ersten
  // Assignee, also wuerde Speichern ohne diese Pruefung die anderen
  // Zuweisungen loeschen. Wenn der User das Feld nicht angefasst hat,
  // schicken wir `assigneeMembershipIds` einfach nicht mit — die
  // PATCH-Schema behandelt fehlende Felder als "unveraendert lassen".
  const [assigneeTouched, setAssigneeTouched] = useState(false);
  const hasMultipleAssignees = aufgabe.assigneeMembershipIds.length > 1;

  function startEdit() {
    setEditForm(buildEditForm(aufgabe));
    setEditError(null);
    setAssigneeTouched(false);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditError(null);
    setAssigneeTouched(false);
  }

  function updateEditField<Key extends keyof EditFormState>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      if (key === "assigneeMembershipId") {
        setAssigneeTouched(true);
      }
      setEditForm((current) => ({ ...current, [key]: value }));
    };
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      setEditError("Titel darf nicht leer sein.");
      return;
    }

    setIsSaving(true);
    setEditError(null);

    const trimmedDescription = editForm.description.trim();
    const dueAt = editForm.dueAt ? new Date(editForm.dueAt).toISOString() : null;

    // Body bauen wir feldweise, damit assigneeMembershipIds NUR mit-
    // geschickt wird, wenn der User die Auswahl tatsaechlich beruehrt
    // hat. Sonst wuerde eine Aufgabe mit mehreren Assignees beim
    // Speichern silently auf einen reduziert (Form haelt nur den
    // ersten — siehe assigneeTouched-Hintergrund weiter oben).
    const body: Record<string, unknown> = {
      title: trimmedTitle,
      // nullable: leer-String -> null, damit der Server die Beschreibung
      // tatsaechlich loescht. Sonst koennte man die Beschreibung nie
      // wieder los werden, sobald sie einmal gesetzt ist.
      description: trimmedDescription.length > 0 ? trimmedDescription : null,
      priority: editForm.priority,
      dueAt
    };
    if (assigneeTouched) {
      body.assigneeMembershipIds = editForm.assigneeMembershipId
        ? [editForm.assigneeMembershipId]
        : [];
    }

    const response = await fetch(`/api/v1/aufgaben/${aufgabe.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setEditError(readApiErrorMessage(body, "Aufgabe konnte nicht gespeichert werden."));
      return;
    }

    setIsEditing(false);
    startTransition(() => {
      router.refresh();
    });
  }

  // Memberships sind eine flache Lookup-Tabelle membershipId -> Name.
  // Wir resolven die IDs aus aufgabe.assigneeMembershipIds zu Namen
  // (Fallback: raw-ID, wenn das Membership nicht mehr existiert —
  // z.B. weil der User das Revier verlassen hat).
  const assigneeNames = aufgabe.assigneeMembershipIds.map((membershipId) => {
    const entry = memberships.find((m) => m.membershipId === membershipId);
    return entry ? `${entry.userName} (${formatRoleLabel(entry.role)} · ${entry.jagdzeichen})` : membershipId;
  });

  async function updateStatus(status: AufgabeStatus) {
    setIsUpdating(true);
    setError(null);

    const response = await fetch(`/api/v1/aufgaben/${aufgabe.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });

    setIsUpdating(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(readApiErrorMessage(body, "Status konnte nicht geändert werden."));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="page-stack">
      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">
              <Link href="/app/aufgaben">← Aufgaben</Link>
            </p>
            <h1>{aufgabe.title}</h1>
            <p className="hero-copy">
              {PRIORITY_LABEL[aufgabe.priority]} · {STATUS_LABEL[aufgabe.status]} ·{" "}
              Angelegt {formatDateTime(aufgabe.createdAt)}
            </p>
          </div>
          <div className="section-actions">
            <span className={statusPillClass(aufgabe.status)}>
              {STATUS_LABEL[aufgabe.status]}
            </span>
            {!isEditing ? (
              <button
                className="button-control button-control-secondary"
                disabled={isUpdating || isPending}
                onClick={startEdit}
                type="button"
              >
                Bearbeiten
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <p aria-live="polite" className="feedback feedback-error">
            {error}
          </p>
        ) : null}

        {isEditing ? (
          <form className="ansitz-form" onSubmit={(event) => void handleSave(event)}>
            <label className="field field-full" htmlFor="edit-title">
              <span>Titel</span>
              <input
                id="edit-title"
                maxLength={120}
                onChange={updateEditField("title")}
                required
                value={editForm.title}
              />
            </label>

            <label className="field field-full" htmlFor="edit-description">
              <span>Details</span>
              <textarea
                id="edit-description"
                onChange={updateEditField("description")}
                rows={4}
                value={editForm.description}
              />
            </label>

            <label className="field" htmlFor="edit-priority">
              <span>Priorität</span>
              <select
                id="edit-priority"
                onChange={updateEditField("priority")}
                value={editForm.priority}
              >
                <option value="niedrig">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="hoch">Hoch</option>
                <option value="dringend">Dringend</option>
              </select>
            </label>

            <label className="field" htmlFor="edit-due-at">
              <span>Fällig (optional)</span>
              <input
                id="edit-due-at"
                onChange={updateEditField("dueAt")}
                type="datetime-local"
                value={editForm.dueAt}
              />
            </label>

            <label className="field field-full" htmlFor="edit-assignee">
              <span>Zugewiesen an</span>
              <select
                id="edit-assignee"
                onChange={updateEditField("assigneeMembershipId")}
                value={editForm.assigneeMembershipId}
              >
                <option value="">— Niemand zugewiesen —</option>
                {memberships.map((entry) => (
                  <option key={entry.membershipId} value={entry.membershipId}>
                    {entry.userName} ({formatRoleLabel(entry.role)} · {entry.jagdzeichen})
                  </option>
                ))}
              </select>
              {hasMultipleAssignees ? (
                <span className="feedback feedback-warning">
                  Diese Aufgabe hat aktuell mehrere Zugewiesene. Wenn du diese
                  Auswahl änderst, ersetzt die neue Zuweisung alle anderen.
                  Lass das Feld unberührt, um die bestehende Mehrfach-Zuweisung
                  beizubehalten.
                </span>
              ) : null}
            </label>

            <div className="form-footer field-full">
              <div aria-live="polite" className="form-messages">
                {editError ? <p className="feedback feedback-error">{editError}</p> : null}
              </div>
              <button
                className="button-control button-control-secondary"
                disabled={isSaving}
                onClick={cancelEdit}
                type="button"
              >
                Abbrechen
              </button>
              <button className="button-control" disabled={isSaving} type="submit">
                {isSaving ? "Speichert …" : "Änderungen speichern"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="simple-list">
          <div>
            <strong>Beschreibung</strong>
            <span>{aufgabe.description ?? "Keine Beschreibung hinterlegt."}</span>
          </div>
          <div>
            <strong>Fällig</strong>
            <span>{aufgabe.dueAt ? formatDateTime(aufgabe.dueAt) : "Kein Fälligkeitsdatum"}</span>
          </div>
          <div>
            <strong>Zugewiesen an</strong>
            <span>
              {assigneeNames.length > 0 ? assigneeNames.join(", ") : "Keine Zuweisung"}
            </span>
          </div>
          {aufgabe.completionNote ? (
            <div>
              <strong>Erledigungs-Notiz</strong>
              <span>{aufgabe.completionNote}</span>
            </div>
          ) : null}
          {aufgabe.completedAt ? (
            <div>
              <strong>Erledigt am</strong>
              <span>{formatDateTime(aufgabe.completedAt)}</span>
            </div>
          ) : null}
        </div>

        {aufgabe.sourceType ? (
          <div className="simple-list">
            <div>
              <strong>Bezug</strong>
              <span>
                {aufgabe.sourceType === "reviermeldung" && sourceMeldung ? (
                  <>
                    Reviermeldung „{sourceMeldung.title}" —{" "}
                    <Link href="/app/reviermeldungen">zur Übersicht</Link>
                  </>
                ) : (
                  // Fallback: sourceMeldung nicht resolved (z.B. geloescht
                  // oder nicht-reviermeldung-Typ). Zeigen wir raw, damit
                  // wenigstens die Spur sichtbar bleibt.
                  `${aufgabe.sourceType} · ${aufgabe.sourceId ?? "ohne Id"}`
                )}
              </span>
            </div>
          </div>
        ) : null}

        <div className="form-footer">
          {aufgabe.status !== "in_arbeit" && aufgabe.status !== "erledigt" ? (
            <button
              className="button-control button-control-secondary"
              disabled={isUpdating || isPending}
              onClick={() => void updateStatus("in_arbeit")}
              type="button"
            >
              In Arbeit setzen
            </button>
          ) : null}
          {aufgabe.status !== "erledigt" ? (
            <button
              className="button-control"
              disabled={isUpdating || isPending}
              onClick={() => void updateStatus("erledigt")}
              type="button"
            >
              Erledigen
            </button>
          ) : (
            <button
              className="button-control button-control-secondary"
              disabled={isUpdating || isPending}
              onClick={() => void updateStatus("offen")}
              type="button"
            >
              Wieder öffnen
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function buildEditForm(aufgabe: Aufgabe): EditFormState {
  return {
    title: aufgabe.title,
    description: aufgabe.description ?? "",
    priority: aufgabe.priority,
    dueAt: formatDueAtForInput(aufgabe.dueAt),
    // Multi-Assignee in der API, aber UI exponiert v1 nur einen.
    // Wenn mehrere zugewiesen sind, nehmen wir den ersten — der User
    // kann das speichern und damit die anderen entfernen. Spaeter
    // koennen wir auf eine echte Mehrfach-Auswahl umstellen.
    assigneeMembershipId: aufgabe.assigneeMembershipIds[0] ?? ""
  };
}

function statusPillClass(status: AufgabeStatus): string {
  if (status === "erledigt") return "status-pill status-ok";
  if (status === "blockiert" || status === "abgelehnt") return "status-pill status-warning";
  return "status-pill";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Vienna"
  }).format(new Date(value));
}
