import { exportReviereinrichtungenCsv } from "../../../../../server/modules/reviereinrichtungen/queries";
import { jsonError } from "../../../../../server/http/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return new Response(await exportReviereinrichtungenCsv(), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=reviereinrichtungen.csv"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
