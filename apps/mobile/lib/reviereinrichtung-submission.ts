import {
  createReviereinrichtung,
  isRecoverableMutationError,
  MobileApiError,
  type CreateReviereinrichtungRequest,
  uploadReviereinrichtungPhoto
} from "./api";
import {
  assertOfflineQueueMembershipActive,
  getBoundOfflineQueueMembershipId,
  queueReviereinrichtungCreate,
  queueReviereinrichtungPhotoUploads
} from "./offline-queue";
import {
  limitReviereinrichtungPhotoAttachments,
  type LocalPendingPhoto
} from "./reviereinrichtung-photos";

export type ReviereinrichtungSubmissionResult =
  | {
      mode: "sent";
      createdId: string;
      uploadedCount: number;
      queuedCount: number;
    }
  | {
      mode: "queued";
      uploadedCount: number;
      queuedCount: number;
    }
  | {
      mode: "partial";
      createdId: string;
      uploadedCount: number;
      queuedCount: number;
    };

export async function submitReviereinrichtung(
  payload: CreateReviereinrichtungRequest,
  attachments: LocalPendingPhoto[]
): Promise<ReviereinrichtungSubmissionResult> {
  const membershipId = getBoundOfflineQueueMembershipId();
  const normalizedAttachments = limitReviereinrichtungPhotoAttachments(attachments);

  try {
    const created = await createReviereinrichtung(payload);
    let uploadedCount = 0;

    for (let index = 0; index < normalizedAttachments.length; index += 1) {
      const attachment = normalizedAttachments[index];

      try {
        assertOfflineQueueMembershipActive(membershipId);
        await uploadReviereinrichtungPhoto(created.id, attachment);
        uploadedCount += 1;
      } catch (error) {
        if (!isRecoverablePhotoUploadError(error)) {
          throw error;
        }

        const remaining = normalizedAttachments.slice(index);
        await queueReviereinrichtungPhotoUploads(created.id, remaining, membershipId);

        return {
          mode: "partial",
          createdId: created.id,
          uploadedCount,
          queuedCount: remaining.length
        };
      }
    }

    return {
      mode: "sent",
      createdId: created.id,
      uploadedCount,
      queuedCount: 0
    };
  } catch (error) {
    if (!isRecoverableMutationError(error)) {
      throw error;
    }

    await queueReviereinrichtungCreate(payload, normalizedAttachments, membershipId);

    return {
      mode: "queued",
      uploadedCount: 0,
      queuedCount: normalizedAttachments.length
    };
  }
}

function isRecoverablePhotoUploadError(error: unknown) {
  if (isRecoverableMutationError(error)) {
    return true;
  }

  return error instanceof MobileApiError && [404, 408, 429].includes(error.status);
}
