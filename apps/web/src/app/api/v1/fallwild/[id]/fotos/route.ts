import { Buffer } from "node:buffer";

import { getRequestContext } from "../../../../../../server/auth/context";
import { assertRole } from "../../../../../../server/auth/service";
import { jsonCreated, jsonError } from "../../../../../../server/http/responses";
import { parseImageUploadFormData } from "../../../../../../server/http/image-upload";
import {
  FALLWILD_ALLOWED_ROLES,
  FALLWILD_MAX_PHOTO_SIZE_BYTES,
  FALLWILD_PHOTO_CONTENT_TYPES
} from "../../../../../../server/modules/fallwild/media";
import { uploadFallwildPhoto } from "../../../../../../server/modules/fallwild/service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { role, membershipId, revierId } = await getRequestContext();
    assertRole(role, [...FALLWILD_ALLOWED_ROLES]);

    const { id } = await context.params;
    const { file, title } = await parseImageUploadFormData(request, {
      allowedContentTypes: FALLWILD_PHOTO_CONTENT_TYPES,
      maxSizeBytes: FALLWILD_MAX_PHOTO_SIZE_BYTES
    });

    return jsonCreated({
      photo: await uploadFallwildPhoto({
        body: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        fallwildId: id,
        fileName: file.name,
        reportedByMembershipId: membershipId,
        revierId,
        title
      })
    });
  } catch (error) {
    return jsonError(error);
  }
}
