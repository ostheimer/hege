import { getRequestContext } from "../../../../../server/auth/context";
import { assertRole } from "../../../../../server/auth/service";
import { jsonError, jsonOk } from "../../../../../server/http/responses";
import { REVIEREINRICHTUNG_READ_ROLES } from "../../../../../server/modules/reviereinrichtungen/media";
import { getLocationWeather } from "../../../../../server/modules/weather/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { role } = await getRequestContext();
    assertRole(role, REVIEREINRICHTUNG_READ_ROLES);
    const url = new URL(request.url);
    const latParam = url.searchParams.get("lat");
    const lngParam = url.searchParams.get("lng");
    const lat = latParam === null ? Number.NaN : Number(latParam);
    const lng = lngParam === null ? Number.NaN : Number(lngParam);

    return jsonOk(await getLocationWeather({ lat, lng }), {
      headers: {
        "cache-control": "private, max-age=300"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
