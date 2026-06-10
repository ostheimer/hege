import { exportAnsitzeCsv } from "../../../../../server/modules/ansitze/queries";
import { jsonError } from "../../../../../server/http/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return new Response(await exportAnsitzeCsv(), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=ansitze.csv"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
