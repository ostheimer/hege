"use client";

import type { Sitzung } from "@hege/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useRef, useState, useTransition } from "react";

import { readApiErrorMessage } from "../../../lib/api-error";
import { buildVersionTimeline } from "../../../lib/version-timeline";

interface MembershipOption {
  membershipId: string;
  userName: string;
  role: string;
  jagdzeichen: string;
}

interface SitzungDetailClientProps {
  sitzung: Sitzung;
  memberships: MembershipOption[];
  canApprove: boolean;
}

interface BeschlussDraft {
  key: string;
  title: string;
  decision: string;
  owner: string;
  dueAt: string;
}

interface FormFeedback {
  error: string | null;
  success: string | null;
}

const EMPTY_FEEDBACK: FormFeedback = { error: null, success: null };

export function SitzungDetailClient({ sitzung, memberships, canApprove }: SitzungDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const latestVersion = sitzung.versions[0];
  const isFreigegeben = sitzung.status === "freigegeben";

  const timeline = useMemo(
    () => buildVersionTimeline(sitzung.versions, memberships),
    [sitzung.versions, memberships]
  );
  // Feedback getrennt pro Formular, damit eine Meldung nur dort erscheint,
  // wo die Aktion ausgeloest wurde (nicht gleichzeitig unter Stammdaten und
  // Protokollversion).
  const [metaFeedback, setMetaFeedback] = useState<FormFeedback>(EMPTY_FEEDBACK);
  const [versionFeedback, setVersionFeedback] = useState<FormFeedback>(EMPTY_FEEDBACK);
  // Freigabe ist eine Aktion im Kopfbereich (nur Revier-Admin) und bekommt
  // dort eine eigene Rueckmeldung, getrennt von den Formularen darunter.
  const [actionFeedback, setActionFeedback] = useState<FormFeedback>(EMPTY_FEEDBACK);
  const [title, setTitle] = useState(sitzung.title);
  const [scheduledAt, setScheduledAt] = useState(toDateTimeLocalValue(sitzung.scheduledAt));
  const [locationLabel, setLocationLabel] = useState(sitzung.locationLabel);
  const [participants, setParticipants] = useState<Record<string, boolean>>(
    Object.fromEntries(
      memberships.map((entry) => [
        entry.membershipId,
        sitzung.participants.some((participant) => participant.membershipId === entry.membershipId && participant.anwesend)
      ])
    )
  );
  const [summary, setSummary] = useState(latestVersion?.summary ?? "");
  const [agendaText, setAgendaText] = useState((latestVersion?.agenda ?? []).join("\n"));
  const initialBeschluesse = useMemo<BeschlussDraft[]>(
    () =>
      latestVersion?.beschluesse.map((entry, index) => ({
        key: entry.id ?? `beschluss-${index}`,
        title: entry.title,
        decision: entry.decision,
        owner: entry.owner ?? "",
        dueAt: entry.dueAt ? toDateTimeLocalValue(entry.dueAt) : ""
      })) ?? [{ key: "beschluss-0", title: "", decision: "", owner: "", dueAt: "" }],
    [latestVersion]
  );
  const [beschluesse, setBeschluesse] = useState<BeschlussDraft[]>(initialBeschluesse);
  const nextBeschlussKey = useRef(initialBeschluesse.length);

  async function handleSaveMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMetaFeedback(EMPTY_FEEDBACK);

    const response = await fetch(`/api/v1/sitzungen/${sitzung.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title,
        scheduledAt: new Date(scheduledAt).toISOString(),
        locationLabel,
        participants: memberships.map((entry) => ({
          membershipId: entry.membershipId,
          anwesend: participants[entry.membershipId] ?? false
        }))
      })
    });

    await handleResponse(response, "Sitzung gespeichert.", setMetaFeedback);
  }

  async function handleSaveVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVersionFeedback(EMPTY_FEEDBACK);

    const trimmedSummary = summary.trim();
    const agenda = agendaText
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const { complete, incompletePositions } = categorizeBeschluesse(beschluesse);

    // Halb ausgefuellte Beschluesse nicht stillschweigend verwerfen, sondern
    // klar zurueckmelden — sonst verschwindet ein notierter Titel ohne Hinweis.
    if (incompletePositions.length > 0) {
      const positions = incompletePositions.join(", ");
      setVersionFeedback({
        error:
          incompletePositions.length === 1
            ? `Beschluss ${positions} ist unvollständig — bitte Titel und Beschluss ausfüllen oder den Eintrag entfernen.`
            : `Die Beschlüsse ${positions} sind unvollständig — bitte Titel und Beschluss ausfüllen oder die Einträge entfernen.`,
        success: null
      });
      return;
    }

    if (trimmedSummary.length === 0 && agenda.length === 0 && complete.length === 0) {
      setVersionFeedback({
        error: "Bitte zumindest eine Zusammenfassung, einen Agenda-Punkt oder einen Beschluss erfassen.",
        success: null
      });
      return;
    }

    const response = await fetch(`/api/v1/sitzungen/${sitzung.id}/versionen`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        summary: trimmedSummary,
        agenda,
        beschluesse: complete.map((entry) => ({
          title: entry.title.trim(),
          decision: entry.decision.trim(),
          owner: entry.owner.trim() || undefined,
          dueAt: entry.dueAt ? new Date(entry.dueAt).toISOString() : undefined
        }))
      })
    });

    await handleResponse(response, "Neue Protokollversion gespeichert.", setVersionFeedback);
  }

  async function handleFreigeben() {
    setActionFeedback(EMPTY_FEEDBACK);

    const response = await fetch(`/api/v1/sitzungen/${sitzung.id}/freigeben`, {
      method: "PATCH"
    });

    await handleResponse(response, "Sitzung wurde freigegeben.", setActionFeedback);
  }

  async function handleResponse(
    response: Response,
    successMessage: string,
    setFeedback: (feedback: FormFeedback) => void
  ) {
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setFeedback({ error: readApiErrorMessage(payload, "Aktion fehlgeschlagen."), success: null });
      return;
    }

    setFeedback({ error: null, success: successMessage });
    startTransition(() => {
      router.refresh();
    });
  }

  function updateParticipant(membershipId: string) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const checked = event.currentTarget.checked;
      setParticipants((current) => ({
        ...current,
        [membershipId]: checked
      }));
    };
  }

  function updateBeschluss(index: number, key: keyof Omit<BeschlussDraft, "key">) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.currentTarget.value;
      setBeschluesse((current) =>
        current.map((entry, currentIndex) =>
          currentIndex === index
            ? {
                ...entry,
                [key]: value
              }
            : entry
        )
      );
    };
  }

  function addBeschluss() {
    setBeschluesse((current) => [
      ...current,
      { key: `beschluss-neu-${nextBeschlussKey.current++}`, title: "", decision: "", owner: "", dueAt: "" }
    ]);
  }

  function removeBeschluss(key: string) {
    setBeschluesse((current) => (current.length <= 1 ? current : current.filter((entry) => entry.key !== key)));
  }

  return (
    <div className="page-stack">
      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Sitzungsdetail</p>
            <h1>{sitzung.title}</h1>
          </div>
          <div className="section-actions">
            <Link className="button-link" href="/app/sitzungen">
              Zur Liste
            </Link>
            {sitzung.publishedDocument ? (
              <a className="button-link" href={sitzung.publishedDocument.url}>
                PDF laden
              </a>
            ) : null}
            {canApprove && sitzung.status !== "freigegeben" ? (
              <button className="button-control" disabled={isPending} onClick={() => void handleFreigeben()} type="button">
                Freigeben
              </button>
            ) : null}
          </div>
        </header>

        {actionFeedback.error || actionFeedback.success ? (
          <div aria-live="polite" className="form-messages">
            {actionFeedback.error ? <p className="feedback feedback-error">{actionFeedback.error}</p> : null}
            {actionFeedback.success ? <p className="feedback feedback-success">{actionFeedback.success}</p> : null}
          </div>
        ) : null}

        <div className="split-panel">
          <article className="panel-card">
            <p className="eyebrow">Status</p>
            <strong>{sitzung.status}</strong>
            <span>{formatDateTime(sitzung.scheduledAt)}</span>
            <span>{sitzung.locationLabel}</span>
          </article>

          <article className="panel-card">
            <p className="eyebrow">Versionen</p>
            <strong>{sitzung.versions.length}</strong>
            <span>Teilnehmer: {sitzung.participants.length}</span>
            <span>{sitzung.publishedDocument ? "PDF veröffentlicht" : "Noch kein PDF"}</span>
          </article>
        </div>
      </section>

      {timeline.length > 0 ? (
        <section className="section-card">
          <header className="section-header">
            <div>
              <p className="eyebrow">Protokoll-Historie</p>
              <h2>Versions-Timeline</h2>
            </div>
            <div className="section-actions">
              <span className="badge">{timeline.length} {timeline.length === 1 ? "Version" : "Versionen"}</span>
            </div>
          </header>

          <ol className="version-timeline">
            {timeline.map((entry) => (
              <li key={entry.id} className={`version-timeline-item${entry.index === 0 ? " version-timeline-item-current" : ""}`}>
                <div className="version-timeline-marker" aria-hidden="true" />
                <div className="version-timeline-body">
                  <div className="version-timeline-header">
                    <strong>
                      v{entry.versionNumber}
                      {entry.index === 0 ? " · aktuell" : ""}
                    </strong>
                    <time>{formatDateTime(entry.createdAt)}</time>
                  </div>
                  <p className="version-timeline-author">
                    publiziert von <strong>{entry.authorName}</strong>
                  </p>
                  {entry.summary ? (
                    <p className="version-timeline-summary">{entry.summary}</p>
                  ) : null}
                  <p className="version-timeline-meta">
                    {entry.agendaCount} {entry.agendaCount === 1 ? "Agenda-Punkt" : "Agenda-Punkte"} ·{" "}
                    {entry.beschluesseCount} {entry.beschluesseCount === 1 ? "Beschluss" : "Beschlüsse"} ·{" "}
                    {entry.attachmentsCount} {entry.attachmentsCount === 1 ? "Anhang" : "Anhänge"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Stammdaten</p>
            <h2>Titel, Termin, Ort und Teilnehmer</h2>
          </div>
        </header>

        {isFreigegeben ? (
          <p className="feedback feedback-success" role="note">
            <strong>Sitzung freigegeben.</strong> Stammdaten sind gesperrt. Eine neue Protokollversion
            öffnet die Sitzung wieder als Entwurf zur Nachfreigabe.
          </p>
        ) : null}

        <form className="ansitz-form" onSubmit={(event) => void handleSaveMeta(event)}>
          <label className="field" htmlFor="detail-title">
            <span>Titel</span>
            <input
              id="detail-title"
              onChange={(event) => setTitle(event.currentTarget.value)}
              readOnly={isFreigegeben}
              required
              value={title}
            />
          </label>

          <label className="field" htmlFor="detail-date">
            <span>Termin</span>
            <input
              id="detail-date"
              onChange={(event) => setScheduledAt(event.currentTarget.value)}
              readOnly={isFreigegeben}
              required
              type="datetime-local"
              value={scheduledAt}
            />
          </label>

          <label className="field field-full" htmlFor="detail-location">
            <span>Ort</span>
            <input
              id="detail-location"
              onChange={(event) => setLocationLabel(event.currentTarget.value)}
              readOnly={isFreigegeben}
              required
              value={locationLabel}
            />
          </label>

          <div className="field field-full">
            <span>Teilnehmer</span>
            <div className="checkbox-grid">
              {memberships.map((entry) => (
                <label key={entry.membershipId} className="checkbox-card">
                  <input
                    checked={participants[entry.membershipId] ?? false}
                    disabled={isFreigegeben}
                    onChange={updateParticipant(entry.membershipId)}
                    type="checkbox"
                  />
                  <div>
                    <strong>{entry.userName}</strong>
                    <span>{`${entry.role} · ${entry.jagdzeichen}`}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-footer field-full">
            <div aria-live="polite" className="form-messages">
              {metaFeedback.error ? <p className="feedback feedback-error">{metaFeedback.error}</p> : null}
              {metaFeedback.success ? <p className="feedback feedback-success">{metaFeedback.success}</p> : null}
            </div>
            {isFreigegeben ? null : (
              <button className="button-control" disabled={isPending} type="submit">
                Stammdaten speichern
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Protokollversion</p>
            <h2>Zusammenfassung, Agenda und Beschlüsse</h2>
          </div>
        </header>

        <p className="form-hint">
          Eine Version braucht zumindest eine Zusammenfassung, einen Agenda-Punkt oder einen Beschluss.
          Jedes Speichern legt einen neuen Stand an.
        </p>

        {isFreigegeben ? (
          <p className="feedback feedback-success" role="note">
            Eine neue Protokollversion <strong>öffnet die Sitzung als Entwurf</strong>. Nach der Korrektur
            kann sie erneut freigegeben werden.
          </p>
        ) : null}

        <form className="page-stack" onSubmit={(event) => void handleSaveVersion(event)}>
          <label className="field" htmlFor="version-summary">
            <span>Zusammenfassung</span>
            <textarea
              id="version-summary"
              onChange={(event) => setSummary(event.currentTarget.value)}
              rows={6}
              value={summary}
            />
          </label>

          <label className="field" htmlFor="version-agenda">
            <span>Agenda, eine Zeile pro Punkt</span>
            <textarea
              id="version-agenda"
              onChange={(event) => setAgendaText(event.currentTarget.value)}
              rows={6}
              value={agendaText}
            />
          </label>

          <div className="page-stack">
            {beschluesse.map((entry, index) => (
              <article key={entry.key} className="detail-card">
                <div className="detail-card-header">
                  <p className="eyebrow">Beschluss {index + 1}</p>
                  {beschluesse.length > 1 ? (
                    <button
                      className="button-control button-control-secondary button-control-small"
                      onClick={() => removeBeschluss(entry.key)}
                      type="button"
                    >
                      Entfernen
                    </button>
                  ) : null}
                </div>
                <label className="field">
                  <span>Beschlusstitel</span>
                  <input onChange={updateBeschluss(index, "title")} value={entry.title} />
                </label>
                <label className="field">
                  <span>Beschluss</span>
                  <textarea onChange={updateBeschluss(index, "decision")} rows={4} value={entry.decision} />
                </label>
                <label className="field">
                  <span>Verantwortlich</span>
                  <input onChange={updateBeschluss(index, "owner")} value={entry.owner} />
                </label>
                <label className="field">
                  <span>Fälligkeit</span>
                  <input onChange={updateBeschluss(index, "dueAt")} type="datetime-local" value={entry.dueAt} />
                </label>
              </article>
            ))}
            <button
              className="button-control button-control-secondary"
              onClick={addBeschluss}
              type="button"
            >
              Weiteren Beschluss hinzufügen
            </button>
          </div>

          <div className="form-footer">
            <div aria-live="polite" className="form-messages">
              {versionFeedback.error ? <p className="feedback feedback-error">{versionFeedback.error}</p> : null}
              {versionFeedback.success ? <p className="feedback feedback-success">{versionFeedback.success}</p> : null}
            </div>
            <button className="button-control" disabled={isPending} type="submit">
              {isFreigegeben ? "Neue Version öffnen" : "Neue Version speichern"}
            </button>
          </div>
        </form>
      </section>

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Historie</p>
            <h2>Bisherige Protokollstände</h2>
          </div>
        </header>
        <div className="card-grid">
          {sitzung.versions.map((entry, index) => (
            <article key={entry.id} className="detail-card">
              <div className="detail-card-header">
                <div>
                  <p className="eyebrow">Version {sitzung.versions.length - index}</p>
                  <h2>{formatDateTime(entry.createdAt)}</h2>
                </div>
                <span className="status-pill status-ok">
                  {entry.beschluesse.length} {entry.beschluesse.length === 1 ? "Beschluss" : "Beschlüsse"}
                </span>
              </div>
              <p>{entry.summary || "Keine Zusammenfassung hinterlegt."}</p>
              <div className="simple-list">
                {entry.beschluesse.length > 0 ? (
                  entry.beschluesse.map((beschluss) => (
                    <div key={beschluss.id}>
                      <strong>{beschluss.title}</strong>
                      <span>{beschluss.decision}</span>
                    </div>
                  ))
                ) : (
                  <div>
                    <strong>Keine Beschlüsse</strong>
                    <span>Diese Version enthält noch keine Beschlüsse.</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function categorizeBeschluesse(drafts: BeschlussDraft[]): {
  complete: BeschlussDraft[];
  incompletePositions: number[];
} {
  const complete: BeschlussDraft[] = [];
  const incompletePositions: number[] = [];

  drafts.forEach((entry, index) => {
    const title = entry.title.trim();
    const decision = entry.decision.trim();
    const owner = entry.owner.trim();
    const dueAt = entry.dueAt.trim();

    // Komplett leere Zeile: als ungenutzt ignorieren.
    if (!title && !decision && !owner && !dueAt) {
      return;
    }

    if (title && decision) {
      complete.push(entry);
      return;
    }

    incompletePositions.push(index + 1);
  });

  return { complete, incompletePositions };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Vienna"
  }).format(new Date(value));
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
