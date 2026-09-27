import { jsonError, jsonOk } from "../../../../server/http/responses";
import { getDashboardSnapshot } from "../../../../server/modules/dashboard/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Dieselbe authentifizierte Reviergrenze wie beim Dashboard; keine Revier-ID vom Client.
    const snapshot = await getDashboardSnapshot({ activityHistory: true });
    return jsonOk({
      activeAnsitze: snapshot.activeAnsitze,
      recentFallwild: snapshot.recentFallwild,
      overview: { letzteBenachrichtigungen: snapshot.overview.letzteBenachrichtigungen }
    });
  } catch (error) {
    return jsonError(error);
  }
}
