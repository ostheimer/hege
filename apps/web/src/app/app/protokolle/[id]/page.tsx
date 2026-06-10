import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePageAuth } from "../../../../server/auth/guards";
import { getProtokollDetail } from "../../../../server/modules/protokolle/queries";

export const dynamic = "force-dynamic";

interface ProtokollDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProtokollDetailPage({ params }: ProtokollDetailPageProps) {
  const { id } = await params;
  await requirePageAuth({ next: `/app/protokolle/${id}` });
  const protokoll = await getProtokollDetail(id);

  if (!protokoll) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Freigegebenes Protokoll</p>
            <h1>{protokoll.title}</h1>
          </div>
          <span className="status-pill status-ok">{protokoll.status}</span>
        </header>

        <div className="split-panel">
          <article className="panel-card">
            <p className="eyebrow">Termin</p>
            <h2>{formatDateTime(protokoll.scheduledAt)}</h2>
            <p>{protokoll.locationLabel}</p>
            <p>{protokoll.summaryPreview ?? "Keine Zusammenfassung vorhanden."}</p>
          </article>

          <article className="panel-card">
            <p className="eyebrow">Dokument</p>
            {protokoll.publishedDocument ? (
              <>
                <h2>{protokoll.publishedDocument.title}</h2>
                <p>{protokoll.publishedDocument.fileName}</p>
                <Link className="button-link" href={protokoll.publishedDocument.downloadUrl}>
                  PDF öffnen
                </Link>
              </>
            ) : (
              <>
                <h2>Kein Dokument verfügbar</h2>
                <p>Das Protokoll ist freigegeben, aber noch nicht mit einem Download verknüpft.</p>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Versionen</p>
            <h2>
              {protokoll.versions.length === 1
                ? "1 gespeicherte Version"
                : `${protokoll.versions.length} gespeicherte Versionen`}
            </h2>
          </div>
        </header>

        <div className="card-grid">
          {protokoll.versions.map((version) => (
            <article key={version.id} className="detail-card">
              <div className="detail-card-header">
                <div>
                  <p className="eyebrow">{formatDateTime(version.createdAt)}</p>
                  <h2>Version</h2>
                </div>
                <span className="status-pill status-ok">{version.beschluesse.length} Beschlüsse</span>
              </div>

              <p>{version.summary}</p>

              <div className="simple-list">
                <div>
                  <strong>Tagesordnung</strong>
                  <span>{version.agenda.join(" | ")}</span>
                </div>
                {version.beschluesse.map((beschluss) => (
                  <div key={beschluss.id}>
                    <strong>{beschluss.title}</strong>
                    <span>{beschluss.decision}</span>
                    {beschluss.owner ? <span>Zuständig: {beschluss.owner}</span> : null}
                  </div>
                ))}
                {version.attachments.length > 0 ? (
                  <div>
                    <strong>Anhänge</strong>
                    <span>{version.attachments.map((attachment) => attachment.title).join(" | ")}</span>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card">
        <header className="section-header">
          <div>
            <p className="eyebrow">Teilnehmer</p>
            <h2>Anwesenheit im Protokoll</h2>
          </div>
        </header>

        <div className="simple-list">
          {protokoll.participants.map((participant) => (
            <div key={participant.membershipId}>
              <strong>{participant.membershipId}</strong>
              <span>{participant.anwesend ? "Anwesend" : "Abwesend"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Vienna"
  }).format(new Date(value));
}
