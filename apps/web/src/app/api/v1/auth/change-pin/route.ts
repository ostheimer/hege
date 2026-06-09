import { getRequestContext } from "../../../../../server/auth/context";
import { parseChangePinPayload } from "../../../../../server/auth/schemas";
import { changePin } from "../../../../../server/auth/service";
import { jsonError, jsonOk } from "../../../../../server/http/responses";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const payload = parseChangePinPayload(await readJsonBody(request));

    await changePin(context.userId, payload);

    return jsonOk({ ok: true });
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
