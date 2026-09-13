import { getRequestContext } from "../../../../../../../server/auth/context";
import { assertRole } from "../../../../../../../server/auth/service";
import {
  parseDirectPhotoUploadCompletion,
  parseDirectPhotoUploadRequest,
  readJsonBody
} from "../../../../../../../server/http/direct-photo-upload";
import { jsonCreated, jsonError, jsonOk } from "../../../../../../../server/http/responses";
import {
  FALLWILD_ALLOWED_ROLES,
  FALLWILD_MAX_PHOTO_SIZE_BYTES,
  FALLWILD_PHOTO_CONTENT_TYPES
} from "../../../../../../../server/modules/fallwild/media";
import {
  completeFallwildPhotoUpload,
  prepareFallwildPhotoUpload
} from "../../../../../../../server/modules/fallwild/service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { role, membershipId, revierId } = await getRequestContext();
    assertRole(role, [...FALLWILD_ALLOWED_ROLES]);
    const { id } = await context.params;
    const payload = parseDirectPhotoUploadRequest(await readJsonBody(request), {
      allowedContentTypes: FALLWILD_PHOTO_CONTENT_TYPES,
      maxSizeBytes: FALLWILD_MAX_PHOTO_SIZE_BYTES
    });

    return jsonOk(
      await prepareFallwildPhotoUpload({
        ...payload,
        fallwildId: id,
        reportedByMembershipId: membershipId,
        revierId
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { role, membershipId, revierId } = await getRequestContext();
    assertRole(role, [...FALLWILD_ALLOWED_ROLES]);
    const { id } = await context.params;
    const { uploadToken } = parseDirectPhotoUploadCompletion(await readJsonBody(request));

    return jsonCreated({
      photo: await completeFallwildPhotoUpload({
        fallwildId: id,
        reportedByMembershipId: membershipId,
        revierId,
        uploadToken
      })
    });
  } catch (error) {
    return jsonError(error);
  }
}
