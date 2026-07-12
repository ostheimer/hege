import { canRoleAccess, rolesForFeature } from "@hege/domain";
import { notFound } from "next/navigation";

import { requirePageRoles } from "../../../../server/auth/guards";
import { getSitzungById, listRevierMemberships } from "../../../../server/modules/sitzungen/queries";
import { SitzungDetailClient } from "../../../sitzungen/[id]/sitzung-detail-client";

export const dynamic = "force-dynamic";

interface SitzungDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SitzungDetailPage({ params }: SitzungDetailPageProps) {
  const { id } = await params;
  const viewer = await requirePageRoles(rolesForFeature("sitzungen-manage"), {
    next: `/app/sitzungen/${id}`
  });
  const [sitzung, memberships] = await Promise.all([getSitzungById(id), listRevierMemberships()]);

  if (!sitzung) {
    notFound();
  }

  return (
    <SitzungDetailClient
      canApprove={canRoleAccess(viewer.membership.role, "sitzungen-approve")}
      memberships={memberships}
      sitzung={sitzung}
    />
  );
}
