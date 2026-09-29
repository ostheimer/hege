import { rolesForFeature } from "@hege/domain";
import { getRequestContext } from "../../../../../../server/auth/context";
import { assertRole } from "../../../../../../server/auth/service";
import { jsonError, jsonOk } from "../../../../../../server/http/responses";
import { validationError } from "../../../../../../server/http/validation";
import {
  parseFacilityOutlook,
  updateFacilityOutlook,
} from "../../../../../../server/modules/reviereinrichtungen/outlook";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getRequestContext();
    assertRole(context.role, rolesForFeature("reviereinrichtungen-manage"));
    const body = await request.json().catch(() => {
      throw validationError("Ungültiges JSON.");
    });
    return jsonOk(
      await updateFacilityOutlook(
        context.revierId,
        (await params).id,
        parseFacilityOutlook(body),
      ),
    );
  } catch (error) {
    return jsonError(error);
  }
}
