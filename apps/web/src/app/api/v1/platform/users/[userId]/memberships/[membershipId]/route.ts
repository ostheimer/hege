import { getRequestContext } from "../../../../../../../../server/auth/context";
import { jsonError, jsonOk } from "../../../../../../../../server/http/responses";
import { updatePlatformMembership } from "../../../../../../../../server/modules/platform-users/service";
import { parseUpdatePlatformMembershipPayload } from "../../../../../../../../server/modules/platform-users/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ userId: string; membershipId: string }> }
) {
  try {
    const { userId, membershipId } = await props.params;
    const payload = parseUpdatePlatformMembershipPayload(await request.json());
    return jsonOk(
      await updatePlatformMembership(await getRequestContext(), userId, membershipId, payload)
    );
  } catch (error) {
    return jsonError(error);
  }
}
