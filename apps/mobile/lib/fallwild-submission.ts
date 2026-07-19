import {
  createFallwild,
  isRecoverableMutationError,
  MobileApiError,
  type CreateFallwildRequest,
  uploadFallwildPhoto
} from "./api";
import { limitFallwildPhotoAttachments, type LocalPendingPhoto } from "./fallwild-photos";
import {
  assertOfflineQueueMembershipActive,
  getBoundOfflineQueueMembershipId,
  queueFallwildCreate,
  queueFallwildPhotoUploads
} from "./offline-queue";

export type FallwildSubmissionResult =
  | {
      mode: "sent";
      createdId: string;
      uploadedCount: number;
      queuedCount: number;
    }
  | {
      mode: "queued";
      createdId?: string;
      uploadedCount: number;
      queuedCount: number;
    }
  | {
      mode: "partial";
      createdId: string;
      uploadedCount: number;
      queuedCount: number;
    };

export async function submitFallwildSubmission(
  payload: CreateFallwildRequest,
  attachments: LocalPendingPhoto[]
): Promise<FallwildSubmissionResult> {
  const membershipId = getBoundOfflineQueueMembershipId();
  const normalizedAttachments = limitFallwildPhotoAttachments(attachments);

  try {
    const created = await createFallwild(payload);

    if (normalizedAttachments.length === 0) {
      return {
        mode: "sent",
        createdId: created.id,
        uploadedCount: 0,
        queuedCount: 0
      };
    }

    const uploadResult = await uploadFallwildPhotos(
      created.id,
      normalizedAttachments,
      membershipId
    );

    if (uploadResult.queuedCount > 0) {
      return {
        mode: "partial",
        createdId: created.id,
        uploadedCount: uploadResult.uploadedCount,
        queuedCount: uploadResult.queuedCount
      };
    }

    return {
      mode: "sent",
      createdId: created.id,
      uploadedCount: uploadResult.uploadedCount,
      queuedCount: 0
    };
  } catch (error) {
    if (!isRecoverableMutationError(error)) {
      throw error;
    }

    await queueFallwildCreate(payload, normalizedAttachments, membershipId);

    return {
      mode: "queued",
      uploadedCount: 0,
      queuedCount: normalizedAttachments.length
    };
  }
}

async function uploadFallwildPhotos(
  fallwildId: string,
  attachments: LocalPendingPhoto[],
  membershipId: string | null
): Promise<{ uploadedCount: number; queuedCount: number }> {
  let uploadedCount = 0;

  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];

    try {
      assertOfflineQueueMembershipActive(membershipId);
      await uploadFallwildPhoto(fallwildId, attachment);
      uploadedCount += 1;
    } catch (error) {
      if (!isRecoverablePhotoUploadError(error)) {
        throw error;
      }

      const remaining = attachments.slice(index);

      if (remaining.length > 0) {
        await queueFallwildPhotoUploads(fallwildId, remaining, membershipId);
      }

      return {
        uploadedCount,
        queuedCount: remaining.length
      };
    }
  }

  return {
    uploadedCount,
    queuedCount: 0
  };
}

function isRecoverablePhotoUploadError(error: unknown) {
  if (isRecoverableMutationError(error)) {
    return true;
  }

  if (!(error instanceof MobileApiError)) {
    return false;
  }

  return error.status === 404 || error.status === 408 || error.status === 429;
}
