import { canRoleAccess } from "@hege/domain";
import { requirePageAuth } from "../../../server/auth/guards";
import { RevierBoundaryEditor } from "../../../components/revier-boundary-editor";
export const dynamic = "force-dynamic";
export default async function RevierkartePage() {
  const context = await requirePageAuth({ next: "/app/revierkarte" });
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Revierkarte</p>
          <h1>{context.revier.name}</h1>
          <p>Grenzen, Teilflächen und Ausschlüsse ansehen und bearbeiten.</p>
        </div>
      </section>
      <RevierBoundaryEditor
        key={context.membership.id}
        owner={`${context.user.id}:${context.membership.id}:${context.activeRevierId}`}
        canEdit={canRoleAccess(context.membership.role, "revier-map-manage")}
        center={{
          lat: context.revier.zentrum.lat,
          lng: context.revier.zentrum.lng,
        }}
      />
    </div>
  );
}
