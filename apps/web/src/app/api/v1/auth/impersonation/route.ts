import {
  getRequestContext,
  getSignedRequestContext
} from "../../../../../server/auth/context";
import { createCookieHeaders } from "../../../../../server/auth/tokens";
import { jsonError } from "../../../../../server/http/responses";
import {
  startPlatformImpersonation,
  stopPlatformImpersonation
} from "../../../../../server/modules/platform-users/service";
import { parseStartImpersonationPayload } from "../../../../../server/modules/platform-users/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    const payload = parseStartImpersonationPayload(await request.json());
    const session = await startPlatformImpersonation(context, payload.membershipId);
    return jsonWithCookies(session, createCookieHeaders(session.tokens));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE() {
  try {
    // Das Zielkonto darf den Rueckweg zum weiterhin validierten Admin nicht blockieren.
    const context = await getSignedRequestContext();
    const session = await stopPlatformImpersonation(context);
    return jsonWithCookies(session, createCookieHeaders(session.tokens));
  } catch (error) {
    return jsonError(error);
  }
}

function jsonWithCookies(data: unknown, cookieHeaders: string[]) {
  const headers = new Headers({ "content-type": "application/json" });
  for (const value of cookieHeaders) headers.append("set-cookie", value);
  return new Response(JSON.stringify(data), { status: 200, headers });
}
