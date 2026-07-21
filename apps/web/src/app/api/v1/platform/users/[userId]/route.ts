import { getRequestContext } from "../../../../../../server/auth/context";
import { jsonError, jsonOk } from "../../../../../../server/http/responses";
import { updatePlatformUser } from "../../../../../../server/modules/platform-users/service";
import { parseUpdatePlatformUserPayload } from "../../../../../../server/modules/platform-users/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, props: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await props.params;
    const payload = parseUpdatePlatformUserPayload(await request.json());
    return jsonOk(await updatePlatformUser(await getRequestContext(), userId, payload));
  } catch (error) {
    return jsonError(error);
  }
}
