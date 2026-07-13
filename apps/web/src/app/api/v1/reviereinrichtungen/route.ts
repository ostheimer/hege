import { getRequestContext } from "../../../../server/auth/context";
import { assertRole } from "../../../../server/auth/service";
import { jsonError, jsonOk } from "../../../../server/http/responses";
import {
  REVIEREINRICHTUNG_CREATE_ROLES,
  REVIEREINRICHTUNG_READ_ROLES
} from "../../../../server/modules/reviereinrichtungen/media";
import { listReviereinrichtungen } from "../../../../server/modules/reviereinrichtungen/queries";
import { parseCreateReviereinrichtungInput } from "../../../../server/modules/reviereinrichtungen/schemas";
import { createReviereinrichtung } from "../../../../server/modules/reviereinrichtungen/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { role } = await getRequestContext();
    assertRole(role, REVIEREINRICHTUNG_READ_ROLES);
    return jsonOk(await listReviereinrichtungen());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { role, membershipId, revierId } = await getRequestContext();
    assertRole(role, REVIEREINRICHTUNG_CREATE_ROLES);
    const payload = parseCreateReviereinrichtungInput(await readJsonBody(request));

    return jsonOk(
      await createReviereinrichtung({
        ...payload,
        createdByMembershipId: membershipId,
        revierId
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw Object.assign(new Error("Der Request-Body muss gültiges JSON sein."), {
      status: 400,
      code: "validation-error"
    });
  }
}
