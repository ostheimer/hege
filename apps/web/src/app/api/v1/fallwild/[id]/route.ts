import { getRequestContext } from "../../../../../server/auth/context";
import { assertRole } from "../../../../../server/auth/service";
import { RouteError } from "../../../../../server/http/errors";
import { jsonError, jsonOk } from "../../../../../server/http/responses";
import {
  FALLWILD_ALLOWED_ROLES,
  FALLWILD_MANAGE_ALLOWED_ROLES
} from "../../../../../server/modules/fallwild/media";
import { getFallwildById } from "../../../../../server/modules/fallwild/queries";
import { deleteFallwildVorgang } from "../../../../../server/modules/fallwild/service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { role } = await getRequestContext();
    assertRole(role, [...FALLWILD_ALLOWED_ROLES]);

    const { id } = await context.params;
    const entry = await getFallwildById(id);

    if (!entry) {
      throw new RouteError("Fallwild-Vorgang wurde nicht gefunden.", 404, "not-found");
    }

    return jsonOk(entry);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { role, revierId } = await getRequestContext();
    assertRole(role, FALLWILD_MANAGE_ALLOWED_ROLES);

    const { id } = await context.params;

    return jsonOk(
      await deleteFallwildVorgang({
        fallwildId: id,
        revierId
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}
