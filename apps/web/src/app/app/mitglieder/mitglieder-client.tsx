"use client";

import type {
  CreateMemberInvitationPayload,
  CreateMemberInvitationResponse,
  MemberInvitation,
  Role
} from "@hege/domain";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";

import { ListFilterChips } from "../../../components/list-filter-chips";
import { ListSearchBar } from "../../../components/list-search-bar";
import { readApiErrorMessage } from "../../../lib/api-error";
import { formatRoleLabel } from "../../../lib/labels";
import { filterBySearch, hasActiveSearch } from "../../../lib/list-search";
import { StateView } from "../../../components/state-view";

type RoleFilter = "alle" | Role;
type StatusFilter = "alle" | "pending" | "accepted" | "expired" | "revoked";
type SortKey = "neueste-zuerst" | "aelteste-zuerst" | "name-az" | "name-za";

function compareInvitations(left: MemberInvitation, right: MemberInvitation, key: SortKey): number {
  switch (key) {
    case "neueste-zuerst":
      return right.createdAt.localeCompare(left.createdAt);
    case "aelteste-zuerst":
      return left.createdAt.localeCompare(right.createdAt);
    case "name-az":
      return (
        left.lastName.localeCompare(right.lastName, "de-AT") ||
        left.firstName.localeCompare(right.firstName, "de-AT")
      );
    case "name-za":
      return (
        right.lastName.localeCompare(left.lastName, "de-AT") ||
        right.firstName.localeCompare(left.firstName, "de-AT")
      );
    default:
      return 0;
  }
}

interface MitgliederClientProps {
  invitations: MemberInvitation[];
  mailEnabled: boolean;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  jagdzeichen: string;
  sendEmail: boolean;
}

const DEFAULT_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "jaeger",
  jagdzeichen: "",
  sendEmail: false
};

const ROLE_OPTIONS: ReadonlyArray<{ value: Role; label: string }> = [
  { value: "jaeger", label: "Jäger" },
  { value: "schriftfuehrer", label: "Schriftführung" },
  { value: "ausgeher", label: "Ausgeher" },
  { value: "revier-admin", label: "Admin" }
];

export function MitgliederClient({ invitations, mailEnabled }: MitgliederClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<CreateMemberInvitationResponse | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [sortKey, setSortKey] = useState<SortKey>("neueste-zuerst");

  const filteredByChips = useMemo(() => {
    return invitations.filter((entry) => {
      if (roleFilter !== "alle" && entry.role !== roleFilter) return false;
      if (statusFilter !== "alle" && entry.status !== statusFilter) return false;
      return true;
    });
  }, [invitations, roleFilter, statusFilter]);

  const visibleInvitations = useMemo(
    () =>
      // Pipeline: filter -> Volltextsuche -> sort. Wir kopieren das Array
      // VOR dem sortieren, weil filterBySearch zwar einen neuen Array
      // liefert, der Aufrufer aber Annahmen ueber Unveraenderlichkeit
      // treffen koennte — defensiv klonen ist billiger als ein subtiler
      // Bug.
      [...filterBySearch(filteredByChips, search, (entry) =>
        [
          entry.firstName,
          entry.lastName,
          entry.email ?? "",
          entry.jagdzeichen,
          entry.role,
          entry.status
        ].join(" ")
      )].sort((left, right) => compareInvitations(left, right, sortKey)),
    [filteredByChips, search, sortKey]
  );
  const searchActive = hasActiveSearch(search);
  const filterActive = roleFilter !== "alle" || statusFilter !== "alle" || sortKey !== "neueste-zuerst";
  const resultLabel =
    searchActive || filterActive
      ? `${visibleInvitations.length} von ${invitations.length}`
      : `${invitations.length} Einträge`;

  const pendingCount = invitations.filter((entry) => entry.status === "pending").length;
  const acceptedCount = invitations.filter((entry) => entry.status === "accepted").length;

  // Reset-Aktion: einziger Klick, statt manuell drei Chip-Reihen
  // zurueckzudrehen. Greift nur, wenn ueberhaupt etwas aktiv ist.
  function resetAllFilters() {
    setSearch("");
    setRoleFilter("alle");
    setStatusFilter("alle");
    setSortKey("neueste-zuerst");
  }

  function update<Key extends keyof FormState>(key: Key) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = event.currentTarget;
      const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
      setForm((current) => ({ ...current, [key]: value as FormState[Key] }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload: CreateMemberInvitationPayload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      role: form.role,
      jagdzeichen: form.jagdzeichen,
      sendEmail: form.sendEmail && Boolean(form.email.trim()) && mailEnabled
    };

    const response = await fetch("/api/v1/memberships/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(readApiErrorMessage(body, "Einladung konnte nicht angelegt werden."));
      return;
    }

    const result = (await response.json()) as CreateMemberInvitationResponse;
    setLatest(result);
    setForm(DEFAULT_FORM);

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleRevoke(invitationId: string) {
    setRevokingId(invitationId);
    setError(null);

    const response = await fetch(`/api/v1/memberships/invitations/${invitationId}`, {
      method: "DELETE"
    });

    setRevokingId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(readApiErrorMessage(body, "Einladung konnte nicht widerrufen werden."));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Mitglieder</p>
          <h1>Personen einladen und Rollen vergeben.</h1>
          <p className="hero-copy">
            Trage Vorname, Nachname und Rolle ein. Du bekommst einen kopierbaren Code, den die Person bei
            der Anmeldung eingibt. E-Mail-Versand ist optional und {mailEnabled ? "aktiv" : "noch nicht konfiguriert"}.
          </p>
        </div>
        <div className="hero-highlight">
          <span>Offene Einladungen</span>
          <strong>{invitations.filter((entry) => entry.status === "pending").length}</strong>
          <p>insgesamt {invitations.length} im Verlauf</p>
        </div>
      </section>

      {latest ? (
        <section className="section-card">
          <header className="section-header">
            <div>
              <p className="eyebrow">Einladung erstellt</p>
              <h2>
                Code für {latest.invitation.firstName} {latest.invitation.lastName}
              </h2>
            </div>
            <button
              className="button-control button-control-secondary"
              onClick={() => setLatest(null)}
              type="button"
            >
              Schließen
            </button>
          </header>

          <div className="invitation-code-display">
            <code>{latest.code}</code>
            <button
              className="button-control button-control-secondary"
              onClick={() => void navigator.clipboard.writeText(latest.code)}
              type="button"
            >
              Code kopieren
            </button>
          </div>

          <p className="hero-copy">
            Gib der Person diesen Code persönlich, per WhatsApp oder Telefon. Sie ruft anschließend
            <strong> hege.app/registrieren </strong>
            auf, gibt den Code ein und setzt eine vierstellige PIN.
          </p>

          <p className="hero-copy">
            Alternativ ist auch der Magic-Link nutzbar:{" "}
            <code>https://hege.app/einladung/{latest.token}</code>
          </p>

          {latest.mailSent ? (
            <p className="feedback feedback-success">
              Eine Einladungsmail wurde an <strong>{latest.invitation.email}</strong> gesendet.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Neue Einladung</p>
            <h2>Person eintragen</h2>
          </div>
        </header>

        <form className="ansitz-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field" htmlFor="invite-first-name">
            <span>Vorname</span>
            <input
              id="invite-first-name"
              onChange={update("firstName")}
              required
              value={form.firstName}
            />
          </label>

          <label className="field" htmlFor="invite-last-name">
            <span>Nachname</span>
            <input
              id="invite-last-name"
              onChange={update("lastName")}
              required
              value={form.lastName}
            />
          </label>

          <label className="field" htmlFor="invite-role">
            <span>Rolle</span>
            <select id="invite-role" onChange={update("role")} value={form.role}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor="invite-jagdzeichen">
            <span>Jagdzeichen</span>
            <input
              id="invite-jagdzeichen"
              onChange={update("jagdzeichen")}
              required
              value={form.jagdzeichen}
            />
          </label>

          <label className="field" htmlFor="invite-email">
            <span>E-Mail (optional)</span>
            <input
              autoComplete="email"
              id="invite-email"
              onChange={update("email")}
              type="email"
              value={form.email}
            />
          </label>

          <label className="field" htmlFor="invite-phone">
            <span>Telefon (optional)</span>
            <input
              autoComplete="tel"
              id="invite-phone"
              onChange={update("phone")}
              type="tel"
              value={form.phone}
            />
          </label>

          <div className="field field-full">
            <label className="checkbox-card">
              <input
                checked={form.sendEmail}
                disabled={!mailEnabled || !form.email.trim()}
                onChange={update("sendEmail")}
                type="checkbox"
              />
              <div>
                <strong>Per E-Mail senden</strong>
                <span>
                  {mailEnabled
                    ? form.email.trim()
                      ? "Versendet eine Einladungsmail mit Code und Magic-Link."
                      : "E-Mail-Adresse erforderlich."
                    : "Mail-Provider noch nicht konfiguriert."}
                </span>
              </div>
            </label>
          </div>

          <div className="form-footer field-full">
            <div aria-live="polite" className="form-messages">
              {error ? <p className="feedback feedback-error">{error}</p> : null}
            </div>
            <button className="button-control" disabled={isPending} type="submit">
              Einladung erstellen
            </button>
          </div>
        </form>
      </section>

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Verlauf</p>
            <h2>Bisherige Einladungen</h2>
          </div>
          <div className="section-actions">
            <a className="button-link" href="/api/v1/memberships/invitations/export.csv">
              CSV-Export
            </a>
          </div>
        </header>

        <ListSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Suche Name, E-Mail, Rolle oder Jagdzeichen"
          resultLabel={resultLabel}
        />

        <ListFilterChips<StatusFilter>
          eyebrow="Status"
          ariaLabel="Einladungs-Status filtern"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: "alle", label: "Alle" },
            { key: "pending", label: "Offen", count: pendingCount },
            { key: "accepted", label: "Angenommen", count: acceptedCount },
            { key: "expired", label: "Abgelaufen" },
            { key: "revoked", label: "Widerrufen" }
          ]}
        />

        <ListFilterChips<RoleFilter>
          eyebrow="Rolle"
          ariaLabel="Rolle filtern"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { key: "alle", label: "Alle" },
            { key: "jaeger", label: "Jäger" },
            { key: "schriftfuehrer", label: "Schriftführung" },
            { key: "ausgeher", label: "Ausgeher" },
            { key: "revier-admin", label: "Admin" }
          ]}
        />

        <ListFilterChips<SortKey>
          eyebrow="Sortierung"
          ariaLabel="Sortierung waehlen"
          value={sortKey}
          onChange={setSortKey}
          options={[
            { key: "neueste-zuerst", label: "Neueste zuerst" },
            { key: "aelteste-zuerst", label: "Älteste zuerst" },
            { key: "name-az", label: "Name A→Z" },
            { key: "name-za", label: "Name Z→A" }
          ]}
        />

        {invitations.length === 0 ? (
          <StateView
            mode="empty"
            title="Noch keine Einladungen versendet"
            description="Sobald du oben jemanden einträgst, taucht der Eintrag mit Code, Status und Ablaufdatum hier auf."
            bare
          />
        ) : visibleInvitations.length === 0 ? (
          <StateView
            mode="empty"
            title="Keine Treffer"
            description={
              searchActive
                ? `Mit der aktuellen Suche („${search}") und den gesetzten Filtern findet sich kein Mitglied.`
                : "Mit den aktuellen Filtern findet sich kein Mitglied."
            }
            action={{ label: "Filter zurücksetzen", onClick: resetAllFilters }}
            bare
          />
        ) : (
          <div className="card-grid">
            {visibleInvitations.map((entry) => (
              <article key={entry.id} className="detail-card">
                <div className="detail-card-header">
                  <div>
                    <p className="eyebrow">{formatRoleLabel(entry.role)}</p>
                    <h2>
                      {entry.firstName} {entry.lastName}
                    </h2>
                  </div>
                  <span className={`status-pill ${statusClassName(entry.status)}`}>
                    {formatStatus(entry.status)}
                  </span>
                </div>

                <p>{entry.email ?? "Ohne E-Mail"}</p>
                <p>Jagdzeichen: {entry.jagdzeichen}</p>
                <p>Erstellt: {formatDateTime(entry.createdAt)}</p>
                <p>Gültig bis: {formatDateTime(entry.expiresAt)}</p>

                {entry.status === "pending" ? (
                  <button
                    className="button-control button-control-danger"
                    disabled={revokingId === entry.id}
                    onClick={() => void handleRevoke(entry.id)}
                    type="button"
                  >
                    {revokingId === entry.id ? "Widerrufe..." : "Einladung widerrufen"}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function statusClassName(status: MemberInvitation["status"]): string {
  switch (status) {
    case "accepted":
      return "status-ok";
    case "expired":
    case "revoked":
      return "status-warning";
    default:
      return "status-warning";
  }
}

function formatStatus(status: MemberInvitation["status"]): string {
  switch (status) {
    case "pending":
      return "ausstehend";
    case "accepted":
      return "akzeptiert";
    case "expired":
      return "abgelaufen";
    case "revoked":
      return "widerrufen";
    default:
      return status;
  }
}


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Vienna"
  }).format(new Date(value));
}
