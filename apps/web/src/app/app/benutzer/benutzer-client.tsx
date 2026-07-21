"use client";

import {
  ASSIGNABLE_MEMBER_ROLES,
  type MembershipSummary,
  type PlatformAuditAction,
  type PlatformUserListResponse,
  type PlatformUserSummary,
  type Role
} from "@hege/domain";
import { LogIn, Save, Search, ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { useMemo, useState } from "react";

import { readApiErrorMessage } from "../../../lib/api-error";
import { formatRoleLabel } from "../../../lib/labels";

interface BenutzerClientProps {
  initialData: PlatformUserListResponse;
  viewerUserId: string;
}

export function BenutzerClient({ initialData, viewerUserId }: BenutzerClientProps) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("de-AT");
    if (!query) return data.users;
    return data.users.filter((entry) =>
      [
        entry.user.name,
        entry.user.email,
        entry.user.username ?? "",
        entry.user.phone,
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
  }, [data.users, search]);

  async function saveUser(entry: PlatformUserSummary, form: HTMLFormElement) {
    const values = new FormData(form);
    await mutateUser(entry.user.id, {
      name: String(values.get("name") ?? ""),
      email: String(values.get("email") ?? ""),
      username: String(values.get("username") ?? ""),
      phone: String(values.get("phone") ?? "")
    }, `user:${entry.user.id}`);
  }

  async function mutateUser(userId: string, payload: Record<string, unknown>, key: string) {
    setBusyKey(key);
    setError(null);
    try {
      const response = await fetch(`/api/v1/platform/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readApiErrorMessage(body, "Benutzer konnte nicht gespeichert werden."));
      const updated = body as PlatformUserSummary;
      setData((current) => ({
        ...current,
        users: current.users.map((entry) => (entry.user.id === userId ? updated : entry))
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Benutzer konnte nicht gespeichert werden.");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveMembership(userId: string, membership: MembershipSummary, form: HTMLFormElement) {
    const key = `membership:${membership.id}`;
    const values = new FormData(form);
    setBusyKey(key);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/platform/users/${encodeURIComponent(userId)}/memberships/${encodeURIComponent(membership.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            role: String(values.get("role") ?? "") as Role,
            jagdzeichen: String(values.get("jagdzeichen") ?? "")
          })
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readApiErrorMessage(body, "Mitgliedschaft konnte nicht gespeichert werden."));
      const updated = body as MembershipSummary;
      setData((current) => ({
        ...current,
        users: current.users.map((entry) =>
          entry.user.id === userId
            ? {
                ...entry,
                memberships: entry.memberships.map((item) => (item.id === updated.id ? updated : item))
              }
            : entry
        )
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mitgliedschaft konnte nicht gespeichert werden.");
    } finally {
      setBusyKey(null);
    }
  }

  async function impersonate(membershipId: string) {
    setBusyKey(`impersonate:${membershipId}`);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/impersonation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ membershipId })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readApiErrorMessage(body, "Impersonation konnte nicht gestartet werden."));
      window.location.assign("/app");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impersonation konnte nicht gestartet werden.");
      setBusyKey(null);
    }
  }

  return (
    <div className="page-stack platform-users-page">
      <section className="section-card platform-users-heading">
        <div>
          <p className="eyebrow">Plattform-Administration</p>
          <h1>Benutzer verwalten</h1>
          <p className="hero-copy">Konten, Mitgliedschaften und Rollen über alle Reviere hinweg.</p>
        </div>
        <div className="platform-user-metrics" aria-label="Benutzerstatus">
          <span><strong>{data.users.length}</strong> Konten</span>
          <span><strong>{data.users.filter((entry) => entry.disabledAt).length}</strong> deaktiviert</span>
        </div>
      </section>

      {error ? <p className="feedback feedback-error" role="alert">{error}</p> : null}

      <section className="section-card">
        <label className="platform-user-search" htmlFor="platform-user-search">
          <Search aria-hidden="true" size={18} />
          <input
            id="platform-user-search"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Name, E-Mail, Rolle oder Revier"
            type="search"
            value={search}
          />
          <span>{visibleUsers.length} von {data.users.length}</span>
        </label>

        <div className="platform-user-list">
          {visibleUsers.map((entry) => (
            <details className="platform-user" key={entry.user.id}>
              <summary>
                <span className={entry.disabledAt ? "platform-user-status is-disabled" : "platform-user-status"}>
                  {entry.disabledAt ? <UserRoundX aria-hidden="true" size={18} /> : <UserRoundCheck aria-hidden="true" size={18} />}
                </span>
                <span className="platform-user-summary-copy">
                  <strong>{entry.user.name}</strong>
                  <span>{entry.user.email} · {entry.memberships.length} Mitgliedschaft(en)</span>
                </span>
                <span className="platform-user-role-summary">
                  {entry.disabledAt ? "Deaktiviert" : entry.memberships.map((item) => formatRoleLabel(item.role)).join(", ")}
                </span>
              </summary>

              <div className="platform-user-detail">
                <form
                  className="platform-user-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveUser(entry, event.currentTarget);
                  }}
                >
                  <label className="field"><span>Name</span><input defaultValue={entry.user.name} name="name" required /></label>
                  <label className="field"><span>E-Mail</span><input defaultValue={entry.user.email} name="email" required type="email" /></label>
                  <label className="field"><span>Benutzername</span><input defaultValue={entry.user.username} name="username" required /></label>
                  <label className="field"><span>Telefon</span><input defaultValue={entry.user.phone} name="phone" required /></label>
                  <div className="platform-user-actions field-full">
                    <button className="button-control button-control-secondary" disabled={busyKey !== null} type="submit">
                      <Save aria-hidden="true" size={17} /> Stammdaten speichern
                    </button>
                    <button
                      className={entry.disabledAt ? "button-control button-control-secondary" : "button-control button-control-danger"}
                      disabled={busyKey !== null || entry.user.id === viewerUserId}
                      onClick={() => void mutateUser(entry.user.id, { disabled: !entry.disabledAt }, `status:${entry.user.id}`)}
                      type="button"
                    >
                      {entry.disabledAt ? <UserRoundCheck aria-hidden="true" size={17} /> : <UserRoundX aria-hidden="true" size={17} />}
                      {entry.disabledAt ? "Aktivieren" : "Deaktivieren"}
                    </button>
                  </div>
                </form>

                <div className="platform-memberships">
                  <p className="eyebrow">Mitgliedschaften</p>
                  {entry.memberships.map((membership) => (
                    <form
                      className="platform-membership-row"
                      key={membership.id}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveMembership(entry.user.id, membership, event.currentTarget);
                      }}
                    >
                      <div className="platform-membership-name"><strong>{membership.revierName}</strong><span>{membership.id}</span></div>
                      <label className="field"><span>Rolle</span><select defaultValue={membership.role} name="role">
                        {ASSIGNABLE_MEMBER_ROLES.map((role) => <option key={role} value={role}>{formatRoleLabel(role)}</option>)}
                      </select></label>
                      <label className="field"><span>Jagdzeichen</span><input defaultValue={membership.jagdzeichen} name="jagdzeichen" required /></label>
                      <div className="platform-membership-actions">
                        <button className="icon-command" disabled={busyKey !== null} title="Mitgliedschaft speichern" type="submit"><Save aria-hidden="true" size={18} /><span className="sr-only">Mitgliedschaft speichern</span></button>
                        <button
                          className="button-control button-control-secondary"
                          disabled={busyKey !== null || Boolean(entry.disabledAt) || entry.user.id === viewerUserId || membership.role === "platform-admin"}
                          onClick={() => void impersonate(membership.id)}
                          type="button"
                        ><LogIn aria-hidden="true" size={17} /> Impersonieren</button>
                      </div>
                    </form>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="section-card">
        <header className="section-header"><div><p className="eyebrow">Audit</p><h2>Letzte Admin-Aktionen</h2></div><ShieldCheck aria-hidden="true" size={24} /></header>
        <div className="table-shell"><table><thead><tr><th>Zeitpunkt</th><th>Aktion</th><th>Admin</th><th>Ziel</th></tr></thead><tbody>
          {data.audit.map((entry) => <tr key={entry.id}><td>{new Intl.DateTimeFormat("de-AT", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}</td><td>{formatAuditAction(entry.action)}</td><td>{entry.actorName}</td><td>{entry.targetName ?? "-"}</td></tr>)}
          {data.audit.length === 0 ? <tr><td colSpan={4}>Noch keine Admin-Aktionen protokolliert.</td></tr> : null}
        </tbody></table></div>
      </section>
    </div>
  );
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
