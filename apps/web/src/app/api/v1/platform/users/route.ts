import { getRequestContext } from "../../../../../server/auth/context";
import { jsonError, jsonOk } from "../../../../../server/http/responses";
import { listPlatformUsers } from "../../../../../server/modules/platform-users/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return jsonOk(await listPlatformUsers(await getRequestContext()));
  } catch (error) {
    return jsonError(error);
  }
}
