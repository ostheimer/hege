import { eq } from "drizzle-orm";
import { canRoleAccess, createGpsBoundary } from "@hege/domain";
import { RouteError } from "../../../../server/http/errors";
import { getCurrentAuthContext } from "../../../../server/auth/context";
import { getDb } from "../../../../server/db/client";
import { revierMaps } from "../../../../server/db/schema";
import { getServerEnv } from "../../../../server/env";
import { jsonError, jsonOk } from "../../../../server/http/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getCurrentAuthContext();
    if (getServerEnv().useDemoStore) return jsonOk({ map: null });
    const [row] = await getDb().select().from(revierMaps)
      .where(eq(revierMaps.revierId, context.activeRevierId)).limit(1);
    return jsonOk({ map: row?.data ?? null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentAuthContext();
    if (!canRoleAccess(context.membership.role, "revier-map-manage")) throw new RouteError("Keine Berechtigung zur Grenzerfassung.", 403, "forbidden");
    if (getServerEnv().useDemoStore) throw new RouteError("Grenzerfassung benötigt eine Datenbank.", 409, "conflict");
    const text = await request.text();
    if (text.length > 300000) throw new RouteError("Aufzeichnung ist zu groß.", 400, "validation-error");
    let map;
    try { map = createGpsBoundary(JSON.parse(text).samples); }
    catch (error) { throw new RouteError(error instanceof Error ? error.message : "Ungültige Aufzeichnung.", 400, "validation-error"); }
    const rows = await getDb().insert(revierMaps).values({ revierId: context.activeRevierId, data: map, updatedAt: new Date().toISOString() })
      .onConflictDoNothing().returning();
    if (!rows.length) throw new RouteError("Eine Reviergrenze ist bereits vorhanden. Dein lokaler Entwurf bleibt erhalten; die bestehende Karte wird nicht überschrieben.", 409, "conflict");
    return jsonOk({ map });
  } catch (error) { return jsonError(error); }
}
