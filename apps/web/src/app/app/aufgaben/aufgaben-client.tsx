"use client";

import type { Aufgabe, AufgabePrioritaet, AufgabeStatus } from "@hege/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";

import { ListFilterChips } from "../../../components/list-filter-chips";
import { ListSearchBar } from "../../../components/list-search-bar";
import { StateView } from "../../../components/state-view";
import { readApiErrorMessage } from "../../../lib/api-error";
import { formatRoleLabel } from "../../../lib/labels";
import { filterBySearch, hasActiveSearch } from "../../../lib/list-search";

interface MembershipOption {
  membershipId: string;
  userName: string;
  role: string;
  jagdzeichen: string;
}

interface CreateFormState {
  title: string;
  description: string;
  priority: AufgabePrioritaet;
  dueAt: string;
  assigneeMembershipId: string;
}

const DEFAULT_CREATE_FORM: CreateFormState = {
  title: "",
  description: "",
  priority: "normal",
  dueAt: "",
  assigneeMembershipId: ""
};

/**
 * Web-Pendant zur Mobile-Aufgaben-Sicht in `revierarbeit.tsx`. Spiegelt
 * Filter-Buckets + Sort-Optionen, damit User mit beiden Oberflaechen
 * nichts neu lernen.
 *
 * Status-Bucket statt feinkoernige AufgabeStatus-Liste — der primaere
 * Use-Case ist "abarbeiten", nicht "browsen". Default `offen` versteckt
 * Erledigtes; ein Klick auf "Alle" oeffnet die volle Sicht.
 */

type StatusFilter = "alle" | "offen" | "erledigt";
type PrioritaetFilter = "alle" | AufgabePrioritaet;
type SortKey = "faellig-zuerst" | "prioritaet-hoch" | "neueste-zuerst" | "alphabetisch";

// WICHTIG: Diese Liste muss synchron zu `OFFEN_STATUSES` in
// `apps/mobile/lib/aufgabe-filter.helpers.ts` bleiben — sonst zeigen
// Web und Mobile bei identischen Daten unterschiedliche Counts und
// Filter-Reduktionen. Wenn ein neuer Status zum AufgabeStatus-Enum
// kommt, beide Stellen anpassen.
const OFFEN_STATUSES: ReadonlyArray<AufgabeStatus> = [
  "offen",
  "angenommen",
  "in_arbeit",
  "blockiert"
];

const PRIORITAET_RANK: Record<AufgabePrioritaet, number> = {
  dringend: 0,
  hoch: 1,
  normal: 2,
  niedrig: 3
};

function matchesStatusBucket(status: AufgabeStatus, filter: StatusFilter): boolean {
  if (filter === "alle") return true;
  if (filter === "erledigt") return status === "erledigt";
  return OFFEN_STATUSES.includes(status);
}

function compareAufgaben(left: Aufgabe, right: Aufgabe, key: SortKey): number {
  switch (key) {
    case "faellig-zuerst": {
      const leftHasDue = Boolean(left.dueAt);
      const rightHasDue = Boolean(right.dueAt);
      if (leftHasDue && !rightHasDue) return -1;
      if (!leftHasDue && rightHasDue) return 1;
      if (leftHasDue && rightHasDue) {
        const cmp = left.dueAt!.localeCompare(right.dueAt!);
        if (cmp !== 0) return cmp;
      }
      return PRIORITAET_RANK[left.priority] - PRIORITAET_RANK[right.priority];
    }
    case "prioritaet-hoch": {
      const cmp = PRIORITAET_RANK[left.priority] - PRIORITAET_RANK[right.priority];
      if (cmp !== 0) return cmp;
      return right.createdAt.localeCompare(left.createdAt);
    }
    case "neueste-zuerst":
      return right.createdAt.localeCompare(left.createdAt);
    case "alphabetisch":
      return left.title.localeCompare(right.title, "de-AT");
    default:
      return 0;
  }
}

interface AufgabenClientProps {
  aufgaben: Aufgabe[];
  memberships: MembershipOption[];
}

export function AufgabenClient({ aufgaben, memberships }: AufgabenClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Feedback-States bewusst aufgeteilt: Status-Mutation und Create-Form
  // sind getrennte Flows, der Erfolg/Fehler der einen darf den der
  // anderen nicht ueberschreiben. Frueherer Shared-State hat den
  // Create-Success-Banner verschwinden lassen, sobald jemand danach
  // eine Status-Aktion gestartet hat.
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("offen");
  const [prioritaetFilter, setPrioritaetFilter] = useState<PrioritaetFilter>("alle");
  const [sortKey, setSortKey] = useState<SortKey>("faellig-zuerst");

  const [createForm, setCreateForm] = useState<CreateFormState>(DEFAULT_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);

  // Counts pro Status-Bucket. Wir zeigen sie als Chip-Counts, damit der
  // User sieht, dass z.B. unter "Alle" mehr Eintraege liegen als unter
  // "Offen" + "Erledigt" zusammen — das sind die abgelehnten/
  // archivierten, die sonst unsichtbar bleiben.
  const statusCounts = useMemo(() => {
    let offen = 0;
    let erledigt = 0;
    for (const entry of aufgaben) {
      if (entry.status === "erledigt") {
        erledigt += 1;
      } else if (OFFEN_STATUSES.includes(entry.status)) {
        offen += 1;
      }
    }
    return { offen, erledigt, alle: aufgaben.length };
  }, [aufgaben]);

  const filteredByChips = useMemo(
    () =>
      aufgaben.filter((entry) => {
        if (!matchesStatusBucket(entry.status, statusFilter)) return false;
        if (prioritaetFilter !== "alle" && entry.priority !== prioritaetFilter) return false;
        return true;
      }),
    [aufgaben, statusFilter, prioritaetFilter]
  );

  const visibleAufgaben = useMemo(
    () =>
      [
        ...filterBySearch(filteredByChips, search, (entry) =>
          [entry.title, entry.description ?? "", entry.completionNote ?? ""].join(" ")
        )
      ].sort((left, right) => compareAufgaben(left, right, sortKey)),
    [filteredByChips, search, sortKey]
  );

  const searchActive = hasActiveSearch(search);
  const filterActive =
    statusFilter !== "offen" ||
    prioritaetFilter !== "alle" ||
    sortKey !== "faellig-zuerst";
  const resultLabel =
    searchActive || filterActive
      ? `${visibleAufgaben.length} von ${aufgaben.length}`
      : `${aufgaben.length} Aufgaben`;

  function resetAllFilters() {
    setSearch("");
    setStatusFilter("offen");
    setPrioritaetFilter("alle");
    setSortKey("faellig-zuerst");
  }

  async function updateStatus(aufgabeId: string, status: AufgabeStatus) {
    setUpdatingId(aufgabeId);
    setUpdateError(null);

    const response = await fetch(`/api/v1/aufgaben/${aufgabeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });

    setUpdatingId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setUpdateError(readApiErrorMessage(body, "Aufgabe konnte nicht aktualisiert werden."));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  function updateCreateField<Key extends keyof CreateFormState>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.currentTarget.value;
      setCreateForm((current) => ({ ...current, [key]: value }));
    };
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) {
      setCreateError("Bitte einen Titel angeben.");
      setIsCreating(false);
      return;
    }

    // dueAt ist im Form als datetime-local-Inputs (ohne Zeitzone). Wir
    // konvertieren es zu ISO mit lokaler Zeitzone, damit der Server die
    // gleiche Zeit wieder anzeigt wie der Nutzer eingegeben hat.
    const dueAt = createForm.dueAt
      ? new Date(createForm.dueAt).toISOString()
      : undefined;

    const response = await fetch("/api/v1/aufgaben", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: trimmedTitle,
        description: createForm.description.trim() || undefined,
        priority: createForm.priority,
        dueAt,
        assigneeMembershipIds: createForm.assigneeMembershipId
          ? [createForm.assigneeMembershipId]
          : undefined
      })
    });

    setIsCreating(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setCreateError(readApiErrorMessage(body, "Aufgabe konnte nicht angelegt werden."));
      return;
    }

    setCreateForm(DEFAULT_CREATE_FORM);
    setCreateSuccess("Aufgabe wurde angelegt.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="page-stack">
      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Aufgaben</p>
            <h1>Revierarbeit, geordnet nach Fälligkeit</h1>
            <p className="hero-copy">
              Aufgaben aus Sichtungen, Wartungen und manuellen Einträgen — direkt aus dem Backoffice
              bearbeitbar. Mobil bleibt die Liste in „Revierarbeit" gespiegelt.
            </p>
          </div>
          <div className="section-actions">
            <button
              className="button-control button-control-secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(() => {
                  router.refresh();
                })
              }
              type="button"
            >
              Aktualisieren
            </button>
          </div>
        </header>

        <ListSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Suche Titel, Beschreibung oder Notiz"
          resultLabel={resultLabel}
        />

        <ListFilterChips<StatusFilter>
          eyebrow="Status"
          ariaLabel="Aufgaben-Status filtern"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: "offen", label: "Offen", count: statusCounts.offen },
            { key: "erledigt", label: "Erledigt", count: statusCounts.erledigt },
            { key: "alle", label: "Alle", count: statusCounts.alle }
          ]}
        />

        <ListFilterChips<PrioritaetFilter>
          eyebrow="Priorität"
          ariaLabel="Priorität filtern"
          value={prioritaetFilter}
          onChange={setPrioritaetFilter}
          options={[
            { key: "alle", label: "Alle" },
            { key: "dringend", label: "Dringend" },
            { key: "hoch", label: "Hoch" },
            { key: "normal", label: "Normal" },
            { key: "niedrig", label: "Niedrig" }
          ]}
        />

        <ListFilterChips<SortKey>
          eyebrow="Sortierung"
          ariaLabel="Aufgaben sortieren"
          value={sortKey}
          onChange={setSortKey}
          options={[
            { key: "faellig-zuerst", label: "Fällig zuerst" },
            { key: "prioritaet-hoch", label: "Wichtig zuerst" },
            { key: "neueste-zuerst", label: "Neueste zuerst" },
            { key: "alphabetisch", label: "A–Z" }
          ]}
        />

        {updateError ? (
          <p aria-live="polite" className="feedback feedback-error">
            {updateError}
          </p>
        ) : null}

        {aufgaben.length === 0 ? (
          <StateView
            mode="empty"
            title="Noch keine Aufgaben"
            description="Sobald jemand eine Aufgabe anlegt oder eine Reviermeldung in eine Aufgabe ueberfuehrt wird, taucht sie hier auf."
            bare
          />
        ) : visibleAufgaben.length === 0 ? (
          <StateView
            mode="empty"
            title="Keine Treffer"
            description={
              searchActive
                ? `Mit der aktuellen Suche („${search}") und den gesetzten Filtern findet sich keine Aufgabe.`
                : "Mit den aktuellen Filtern findet sich keine Aufgabe."
            }
            action={{ label: "Filter zurücksetzen", onClick: resetAllFilters }}
            bare
          />
        ) : (
          <div className="card-grid">
            {visibleAufgaben.map((entry) => (
              <article key={entry.id} className="detail-card">
                <div className="detail-card-header">
                  <div>
                    <p className="eyebrow">
                      {formatPriorityLabel(entry.priority)} · {formatStatusLabel(entry.status)}
                    </p>
                    <h2>{entry.title}</h2>
                  </div>
                  <span className={statusPillClass(entry.status)}>
                    {formatStatusLabel(entry.status)}
                  </span>
                </div>

                {entry.description ? <p>{entry.description}</p> : null}
                {entry.dueAt ? <p>Fällig: {formatDateTime(entry.dueAt)}</p> : null}
                {entry.completionNote ? <p>Notiz: {entry.completionNote}</p> : null}

                <div className="form-footer">
                  {entry.status !== "in_arbeit" && entry.status !== "erledigt" ? (
                    <button
                      className="button-control button-control-secondary"
                      disabled={updatingId === entry.id}
                      onClick={() => void updateStatus(entry.id, "in_arbeit")}
                      type="button"
                    >
                      In Arbeit
                    </button>
                  ) : null}
                  {entry.status !== "erledigt" ? (
                    <button
                      className="button-control"
                      disabled={updatingId === entry.id}
                      onClick={() => void updateStatus(entry.id, "erledigt")}
                      type="button"
                    >
                      Erledigen
                    </button>
                  ) : (
                    <button
                      className="button-control button-control-secondary"
                      disabled={updatingId === entry.id}
                      onClick={() => void updateStatus(entry.id, "offen")}
                      type="button"
                    >
                      Wieder öffnen
                    </button>
                  )}
                  <Link className="button-link" href={`/app/aufgaben/${entry.id}`}>
                    Detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Neue Aufgabe</p>
            <h2>Aufgabe für das Revier anlegen</h2>
            <p className="hero-copy">
              Direkter Weg zur API. Erstellt eine Aufgabe ohne Bezug zu einer Reviermeldung —
              für Routinearbeiten, Begehungen oder Aufträge an einzelne Mitglieder.
            </p>
          </div>
          {isCreating ? <span className="badge">Wird angelegt …</span> : null}
        </header>

        <form className="ansitz-form" onSubmit={(event) => void handleCreate(event)}>
          <label className="field field-full" htmlFor="aufgabe-title">
            <span>Titel</span>
            <input
              id="aufgabe-title"
              maxLength={120}
              onChange={updateCreateField("title")}
              placeholder="z. B. Zaun nachspannen am Westhang"
              required
              value={createForm.title}
            />
          </label>

          <label className="field field-full" htmlFor="aufgabe-description">
            <span>Details</span>
            <textarea
              id="aufgabe-description"
              onChange={updateCreateField("description")}
              placeholder="Was muss gemacht werden? Wer hat es gemeldet?"
              rows={3}
              value={createForm.description}
            />
          </label>

          <label className="field" htmlFor="aufgabe-priority">
            <span>Priorität</span>
            <select
              id="aufgabe-priority"
              onChange={updateCreateField("priority")}
              value={createForm.priority}
            >
              <option value="niedrig">Niedrig</option>
              <option value="normal">Normal</option>
              <option value="hoch">Hoch</option>
              <option value="dringend">Dringend</option>
            </select>
          </label>

          <label className="field" htmlFor="aufgabe-due-at">
            <span>Fällig (optional)</span>
            <input
              id="aufgabe-due-at"
              onChange={updateCreateField("dueAt")}
              type="datetime-local"
              value={createForm.dueAt}
            />
          </label>

          <label className="field field-full" htmlFor="aufgabe-assignee">
            <span>Zuweisen an (optional)</span>
            <select
              id="aufgabe-assignee"
              onChange={updateCreateField("assigneeMembershipId")}
              value={createForm.assigneeMembershipId}
            >
              <option value="">— Nicht zuweisen —</option>
              {memberships.map((entry) => (
                <option key={entry.membershipId} value={entry.membershipId}>
                  {entry.userName} ({formatRoleLabel(entry.role)} · {entry.jagdzeichen})
                </option>
              ))}
            </select>
          </label>

          <div className="form-footer field-full">
            <div aria-live="polite" className="form-messages">
              {createError ? <p className="feedback feedback-error">{createError}</p> : null}
              {createSuccess ? (
                <p className="feedback feedback-success">{createSuccess}</p>
              ) : null}
            </div>
            <button className="button-control" disabled={isCreating} type="submit">
              Aufgabe anlegen
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function formatPriorityLabel(priority: AufgabePrioritaet): string {
  switch (priority) {
    case "dringend":
      return "Dringend";
    case "hoch":
      return "Hoch";
    case "normal":
      return "Normal";
    case "niedrig":
      return "Niedrig";
    default:
      return priority;
  }
}

function formatStatusLabel(status: AufgabeStatus): string {
  switch (status) {
    case "offen":
      return "Offen";
    case "angenommen":
      return "Angenommen";
    case "in_arbeit":
      return "In Arbeit";
    case "blockiert":
      return "Blockiert";
    case "erledigt":
      return "Erledigt";
    case "abgelehnt":
      return "Abgelehnt";
    case "archiviert":
      return "Archiviert";
    default:
      return status;
  }
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
