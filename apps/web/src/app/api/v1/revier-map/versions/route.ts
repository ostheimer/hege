import { getCurrentAuthContext } from "../../../../../server/auth/context";
import { getServerEnv } from "../../../../../server/env";
import { listMapVersions } from "../../../../../server/modules/revier-map";
import { jsonError, jsonOk } from "../../../../../server/http/responses";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const context = await getCurrentAuthContext();
    return jsonOk({
      versions: getServerEnv().useDemoStore
        ? []
        : await listMapVersions(context.activeRevierId),
    });
  } catch (error) {
    return jsonError(error);
  }
}
