import { getRequestContext } from "../../../../../../../server/auth/context";
import { assertRole } from "../../../../../../../server/auth/service";
import {
  parseDirectPhotoUploadCompletion,
  parseDirectPhotoUploadRequest,
  readJsonBody
} from "../../../../../../../server/http/direct-photo-upload";
import { jsonCreated, jsonError, jsonOk } from "../../../../../../../server/http/responses";
import {
  REVIEREINRICHTUNG_CREATE_ROLES,
  REVIEREINRICHTUNG_MAX_PHOTO_SIZE_BYTES,
  REVIEREINRICHTUNG_PHOTO_CONTENT_TYPES
} from "../../../../../../../server/modules/reviereinrichtungen/media";
import {
  completeReviereinrichtungPhotoUpload,
  prepareReviereinrichtungPhotoUpload
} from "../../../../../../../server/modules/reviereinrichtungen/service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { role, membershipId, revierId } = await getRequestContext();
    assertRole(role, REVIEREINRICHTUNG_CREATE_ROLES);
    const { id } = await context.params;
    const payload = parseDirectPhotoUploadRequest(await readJsonBody(request), {
      allowedContentTypes: REVIEREINRICHTUNG_PHOTO_CONTENT_TYPES,
      maxSizeBytes: REVIEREINRICHTUNG_MAX_PHOTO_SIZE_BYTES
    });

    return jsonOk(
      await prepareReviereinrichtungPhotoUpload({
        ...payload,
        einrichtungId: id,
        uploadedByMembershipId: membershipId,
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
    assertRole(role, REVIEREINRICHTUNG_CREATE_ROLES);
    const { id } = await context.params;
    const { uploadToken } = parseDirectPhotoUploadCompletion(await readJsonBody(request));

    return jsonCreated({
      photo: await completeReviereinrichtungPhotoUpload({
        einrichtungId: id,
        uploadedByMembershipId: membershipId,
        revierId,
        uploadToken
      })
    });
  } catch (error) {
    return jsonError(error);
  }
}
