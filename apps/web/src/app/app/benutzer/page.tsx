import { rolesForFeature } from "@hege/domain";

import { getRequestContext } from "../../../server/auth/context";
import { requirePageRoles } from "../../../server/auth/guards";
import { listPlatformUsers } from "../../../server/modules/platform-users/service";

import { BenutzerClient } from "./benutzer-client";

export const dynamic = "force-dynamic";

export default async function BenutzerPage() {
  await requirePageRoles(rolesForFeature("platform-users-manage"), { next: "/app/benutzer" });
  const context = await getRequestContext();
  return <BenutzerClient initialData={await listPlatformUsers(context)} viewerUserId={context.userId} />;
}
