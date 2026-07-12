import { rolesForFeature } from "@hege/domain";

import { getRequestContext } from "../../../server/auth/context";
import { requirePageRoles } from "../../../server/auth/guards";
import { listMemberInvitations } from "../../../server/modules/invitations/service";
import { isMailEnabled } from "../../../server/modules/mail/service";

import { MitgliederClient } from "./mitglieder-client";

export const dynamic = "force-dynamic";

export default async function MitgliederPage() {
  await requirePageRoles(rolesForFeature("members-manage"), { next: "/app/mitglieder" });
  const requestContext = await getRequestContext();
  const invitations = await listMemberInvitations(requestContext);

  return <MitgliederClient invitations={invitations} mailEnabled={isMailEnabled()} />;
}
