import { exportSitzungenCsv } from "../../../../../server/modules/sitzungen/queries";
import { jsonError } from "../../../../../server/http/responses";

export const dynamic = "force-dynamic";

/**
 * CSV-Export der Sitzungen-Index-Liste. Pendant zum Fallwild- und
 * Reviereinrichtungen-Export; gedacht fuer Schriftfuehrung-Workflows
 * (Jahresueberblick, Praesenz, Beschluss-Anzahl).
 */
export async function GET() {
  try {
    return new Response(await exportSitzungenCsv(), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=sitzungen.csv"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
