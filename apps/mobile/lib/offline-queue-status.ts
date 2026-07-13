import type { OfflineOperation, OfflineQueueStatus } from "./offline-queue";

export function summarizeOfflineQueue(entries: OfflineOperation[]) {
  return {
    totalCount: entries.length,
    failedCount: entries.filter((entry) => entry.status === "failed" || entry.status === "conflict").length,
    activeCount: entries.filter((entry) => entry.status === "syncing" || entry.status === "uploading").length,
    pendingCount: entries.filter((entry) => entry.status === "pending").length
  };
}

export function getOfflineQueueEntryStatusLine(entry: OfflineOperation) {
  const visibleAttemptCount =
    entry.status === "failed" || entry.status === "conflict"
      ? Math.max(1, entry.attemptCount)
      : entry.attemptCount + 1;

  return `${getOfflineQueueEntryKindLabel(entry.kind)} / ${getOfflineQueueStatusLabel(entry.status)} / Versuch ${visibleAttemptCount}`;
}

export function getOfflineQueueEntryKindLabel(kind: OfflineOperation["kind"]) {
  switch (kind) {
    case "ansitz-create":
      return "Ansitz";
    case "fallwild-create":
      return "Fallwild";
    case "fallwild-photo-upload":
      return "Foto";
    case "reviereinrichtung-create":
      return "Reviereinrichtung";
    case "reviereinrichtung-photo-upload":
      return "Einrichtungsfoto";
    default:
      return kind;
  }
}

export function getOfflineQueueStatusLabel(status: OfflineQueueStatus) {
  switch (status) {
    case "pending":
      return "wartet";
    case "syncing":
      return "wird synchronisiert";
    case "uploading":
      return "wird hochgeladen";
    case "failed":
      return "fehlgeschlagen";
    case "conflict":
      return "Konflikt";
    default:
      return status;
  }
}

export function getOfflineQueueEntryAttachmentHint(entry: OfflineOperation) {
  switch (entry.kind) {
    case "fallwild-photo-upload":
    case "reviereinrichtung-photo-upload":
      return `Anhang: ${entry.attachment.fileName}`;
    case "fallwild-create":
    case "reviereinrichtung-create":
      return entry.payload.attachments && entry.payload.attachments.length > 0
        ? `${formatPhotoCount(entry.payload.attachments.length)} vorgemerkt`
        : "Ohne Foto";
    default:
      return "Ohne Foto";
  }
}

export function getOfflineQueueEntryRetryHint(entry: OfflineOperation) {
  if (entry.status === "conflict") {
    return "Konflikt wird nicht automatisch erneut versucht.";
  }

  if (entry.status !== "failed") {
    return null;
  }

  if (!entry.nextAttemptAt) {
    return "Bereit für den nächsten Sync.";
  }

  const nextAttemptAt = new Date(entry.nextAttemptAt);

  if (Number.isNaN(nextAttemptAt.getTime())) {
    return "Bereit für den nächsten Sync.";
  }

  return `Nächster Versuch ab ${nextAttemptAt.toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit"
  })}.`;
}

function formatPhotoCount(count: number) {
  return count === 1 ? "1 Foto" : `${count} Fotos`;
}
