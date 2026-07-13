import { Buffer } from "node:buffer";

import { getRequestContext } from "../../../../../../server/auth/context";
import { assertRole } from "../../../../../../server/auth/service";
import { parseImageUploadFormData } from "../../../../../../server/http/image-upload";
import { jsonCreated, jsonError } from "../../../../../../server/http/responses";
import {
  REVIEREINRICHTUNG_CREATE_ROLES,
  REVIEREINRICHTUNG_MAX_PHOTO_SIZE_BYTES,
  REVIEREINRICHTUNG_PHOTO_CONTENT_TYPES
} from "../../../../../../server/modules/reviereinrichtungen/media";
import { uploadReviereinrichtungPhoto } from "../../../../../../server/modules/reviereinrichtungen/service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { role, membershipId, revierId } = await getRequestContext();
    assertRole(role, REVIEREINRICHTUNG_CREATE_ROLES);
    const { id } = await context.params;
    const { file, title } = await parseImageUploadFormData(request, {
      allowedContentTypes: REVIEREINRICHTUNG_PHOTO_CONTENT_TYPES,
      maxSizeBytes: REVIEREINRICHTUNG_MAX_PHOTO_SIZE_BYTES
    });

    return jsonCreated({
      photo: await uploadReviereinrichtungPhoto({
        body: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        einrichtungId: id,
        fileName: file.name,
        uploadedByMembershipId: membershipId,
        revierId,
        title
      })
    });
  } catch (error) {
    return jsonError(error);
  }
}
