import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { reviereinrichtungen } from "../../db/schema";
import { getServerEnv } from "../../env";
import { validationError } from "../../http/validation";

export interface FacilityOutlookInput {
  orientationDegrees: number;
  additionalViewDirections: number[];
}
export function parseFacilityOutlook(body: unknown): FacilityOutlookInput {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw validationError("Blickrichtungen fehlen.");
  const data = body as Record<string, unknown>;
  const valid = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 360;
  if (!valid(data.orientationDegrees))
    throw validationError(
      "Die Hauptblickrichtung muss zwischen 0° und 359° liegen.",
    );
  if (
    !Array.isArray(data.additionalViewDirections) ||
    data.additionalViewDirections.length > 7 ||
    !data.additionalViewDirections.every(valid)
  )
    throw validationError(
      "Bis zu sieben weitere gültige Blickrichtungen sind möglich.",
    );
  return {
    orientationDegrees: data.orientationDegrees,
    additionalViewDirections: [
      ...new Set(data.additionalViewDirections),
    ].filter((value) => value !== data.orientationDegrees),
  };
}

export async function updateFacilityOutlook(
  revierId: string,
  id: string,
  input: FacilityOutlookInput,
) {
  if (getServerEnv().useDemoStore)
    throw Object.assign(
      new Error("Änderungen benötigen eine aktive Datenbank."),
      { status: 503 },
    );
  // Atomarer JSON-Merge erhält Zugang, Kapazität und andere Einrichtungsdetails.
  const [row] = await getDb()
    .update(reviereinrichtungen)
    .set({
      orientationDegrees: input.orientationDegrees,
      details: sql`coalesce(${reviereinrichtungen.details}, '{}'::jsonb) || ${JSON.stringify({ additionalViewDirections: input.additionalViewDirections })}::jsonb`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(reviereinrichtungen.id, id),
        eq(reviereinrichtungen.revierId, revierId),
      ),
    )
    .returning({ id: reviereinrichtungen.id });
  if (!row)
    throw Object.assign(new Error("Einrichtung wurde nicht gefunden."), {
      status: 404,
    });
  return { id: row.id, ...input };
}
