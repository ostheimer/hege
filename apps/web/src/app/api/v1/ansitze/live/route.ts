import { listLiveAnsitze } from "../../../../../server/modules/ansitze/queries";
import { jsonError, jsonOk } from "../../../../../server/http/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return jsonOk(await listLiveAnsitze());
  } catch (error) {
    // Ohne Catch wuerde ein 401 aus getRequestContext als generischer
    // Next-500 enden statt als sauberes ApiError-JSON fuer die App.
    return jsonError(error);
  }
}
