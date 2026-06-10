import { exportFallwildCsv } from "../../../../../server/modules/fallwild/queries";
import { jsonError } from "../../../../../server/http/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return new Response(await exportFallwildCsv(), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=fallwild.csv"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
