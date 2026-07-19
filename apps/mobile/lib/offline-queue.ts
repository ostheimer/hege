import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { PhotoAsset } from "@hege/domain";

import {
  isLocalPendingPhoto,
  limitFallwildPhotoAttachments,
  type LocalPendingPhoto
} from "./fallwild-photos";
import {
  createAnsitz,
  createFallwild,
  createReviereinrichtung,
  isRecoverableMutationError,
  type CreateAnsitzRequest,
  type CreateFallwildRequest,
  type CreateReviereinrichtungRequest
} from "./api";
import { limitReviereinrichtungPhotoAttachments } from "./reviereinrichtung-photos";

const LEGACY_STORAGE_KEY = "hege.offline-queue";
const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60] as const;

function scopedStorageKey(membershipId: string) {
  return `${LEGACY_STORAGE_KEY}.${membershipId}`;
}

let activeMembershipId: string | null = null;

function getActiveStorageKey() {
  return activeMembershipId ? scopedStorageKey(activeMembershipId) : LEGACY_STORAGE_KEY;
}

interface BindOfflineQueueOptions {
  migrateLegacy?: boolean;
}

export async function bindOfflineQueueToMembership(
  membershipId: string | null,
  options: BindOfflineQueueOptions = {}
) {
  if (membershipId === activeMembershipId) {
    return snapshot.entries;
  }

  activeMembershipId = membershipId;
  hydratePromise = null;
  syncPromise = null;
  setSnapshot({
    hydrated: false,
    entries: [],
    isSyncing: false,
    lastSuccessfulSyncCount: 0,
    lastSuccessfulSyncKinds: []
  });

  if (!membershipId) {
    return [];
  }

  if (options.migrateLegacy) {
    await migrateLegacyQueueIfNeeded(membershipId);
  }
  return ensureHydrated();
}

export type OfflineQueueStatus = "pending" | "syncing" | "uploading" | "failed" | "conflict";
export type { LocalPendingPhoto } from "./fallwild-photos";

interface OfflineQueueEntryBase {
  id: string;
  title: string;
  createdAt: string;
  status: OfflineQueueStatus;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  nextAttemptAt?: string;
}

interface QueuedFallwildCreatePayload extends CreateFallwildRequest {
  attachments?: LocalPendingPhoto[];
}

interface QueuedReviereinrichtungCreatePayload extends CreateReviereinrichtungRequest {
  attachments?: LocalPendingPhoto[];
}

export interface OfflineAnsitzOperation extends OfflineQueueEntryBase {
  kind: "ansitz-create";
  payload: CreateAnsitzRequest;
}

export interface OfflineFallwildOperation extends OfflineQueueEntryBase {
  kind: "fallwild-create";
  payload: QueuedFallwildCreatePayload;
}

export interface OfflineFallwildPhotoUploadOperation extends OfflineQueueEntryBase {
  kind: "fallwild-photo-upload";
  fallwildId: string;
  attachment: LocalPendingPhoto;
}

export interface OfflineReviereinrichtungOperation extends OfflineQueueEntryBase {
  kind: "reviereinrichtung-create";
  payload: QueuedReviereinrichtungCreatePayload;
}

export interface OfflineReviereinrichtungPhotoUploadOperation extends OfflineQueueEntryBase {
  kind: "reviereinrichtung-photo-upload";
  einrichtungId: string;
  attachment: LocalPendingPhoto;
}

export type OfflineOperation =
  | OfflineAnsitzOperation
  | OfflineFallwildOperation
  | OfflineFallwildPhotoUploadOperation
  | OfflineReviereinrichtungOperation
  | OfflineReviereinrichtungPhotoUploadOperation;

interface OfflineQueueSnapshot {
  hydrated: boolean;
  entries: OfflineOperation[];
  isSyncing: boolean;
  lastSuccessfulSyncAt?: string;
  lastSuccessfulSyncCount: number;
  lastSuccessfulSyncKinds: OfflineOperation["kind"][];
}

export interface SyncOfflineQueueOptions {
  retryFailed?: boolean;
}

export interface QueueMutationResult {
  mode: "sent" | "queued";
  id?: string;
  entry?: OfflineOperation;
}

const listeners = new Set<() => void>();

let snapshot: OfflineQueueSnapshot = {
  hydrated: false,
  entries: [],
  isSyncing: false,
  lastSuccessfulSyncCount: 0,
  lastSuccessfulSyncKinds: []
};

let hydratePromise: Promise<OfflineOperation[]> | null = null;
let syncPromise: Promise<OfflineOperation[]> | null = null;

export function getOfflineQueueSnapshot(): OfflineQueueSnapshot {
  return snapshot;
}

export function subscribeOfflineQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOfflineQueueSnapshot() {
  return useSyncExternalStore(subscribeOfflineQueue, getOfflineQueueSnapshot, getOfflineQueueSnapshot);
}

export async function hydrateOfflineQueue() {
  await ensureHydrated();
  return snapshot;
}

export async function readOfflineQueue(): Promise<OfflineOperation[]> {
  return ensureHydrated();
}

export async function submitAnsitzWithOfflineFallback(payload: CreateAnsitzRequest): Promise<QueueMutationResult> {
  try {
    const result = await createAnsitz(payload);
    void syncOfflineQueue();
    return {
      mode: "sent",
      id: result.id
    };
  } catch (error) {
    if (!isRecoverableMutationError(error)) {
      throw error;
    }

    const entry: OfflineAnsitzOperation = {
      id: createQueueId("ansitz"),
      kind: "ansitz-create",
      title: `Ansitz ${payload.standortName}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      attemptCount: 0,
      payload
    };

    await appendEntry(entry);

    return {
      mode: "queued",
      entry
    };
  }
}

export async function submitFallwildWithOfflineFallback(
  payload: CreateFallwildRequest,
  attachments: LocalPendingPhoto[] = []
): Promise<QueueMutationResult> {
  try {
    const result = await createFallwild(payload);
    const queuedAttachments = limitFallwildPhotoAttachments(attachments);

    if (queuedAttachments.length > 0) {
      await queueFallwildPhotoUploads(result.id, queuedAttachments);
      void syncOfflineQueue();
    }

    return {
      mode: "sent",
      id: result.id
    };
  } catch (error) {
    if (!isRecoverableMutationError(error)) {
      throw error;
    }

    const entry = await queueFallwildCreate(payload, attachments);

    return {
      mode: "queued",
      entry
    };
  }
}

export async function queueFallwildCreate(
  payload: CreateFallwildRequest,
  attachments: LocalPendingPhoto[] = []
): Promise<OfflineFallwildOperation> {
  const queuedAttachments = limitFallwildPhotoAttachments(attachments);
  const entry: OfflineFallwildOperation = {
    id: createQueueId("fallwild"),
    kind: "fallwild-create",
    title:
      queuedAttachments.length > 0
        ? `${payload.wildart} / ${payload.gemeinde} (${formatPhotoCount(queuedAttachments.length)} vorgemerkt)`
        : `${payload.wildart} / ${payload.gemeinde}`,
    createdAt: new Date().toISOString(),
    status: "pending",
    attemptCount: 0,
    payload: {
      ...payload,
      attachments: queuedAttachments.length > 0 ? cloneAttachments(queuedAttachments) : undefined
    }
  };

  await appendEntry(entry);
  return entry;
}

export async function queueFallwildPhotoUploads(
  fallwildId: string,
  attachments: LocalPendingPhoto[]
): Promise<OfflineOperation[]> {
  await ensureHydrated();
  const queuedAttachments = limitFallwildPhotoAttachments(attachments);

  if (queuedAttachments.length === 0) {
    return snapshot.entries;
  }

  const nextEntries = [
    ...queuedAttachments.map<OfflineFallwildPhotoUploadOperation>((attachment) => ({
      id: createQueueId("fallwild-photo"),
      kind: "fallwild-photo-upload",
      title: attachment.title ?? attachment.fileName,
      createdAt: new Date().toISOString(),
      status: "pending",
      attemptCount: 0,
      fallwildId,
      attachment: cloneAttachment(attachment)
    })),
    ...snapshot.entries
  ];

  await persistEntries(nextEntries);
  return nextEntries;
}

export async function queueReviereinrichtungCreate(
  payload: CreateReviereinrichtungRequest,
  attachments: LocalPendingPhoto[] = []
): Promise<OfflineReviereinrichtungOperation> {
  const queuedAttachments = limitReviereinrichtungPhotoAttachments(attachments);
  const entry: OfflineReviereinrichtungOperation = {
    id: createQueueId("reviereinrichtung"),
    kind: "reviereinrichtung-create",
    title:
      queuedAttachments.length > 0
        ? `${payload.name} (${formatPhotoCount(queuedAttachments.length)} vorgemerkt)`
        : payload.name,
    createdAt: new Date().toISOString(),
    status: "pending",
    attemptCount: 0,
    payload: {
      ...payload,
      attachments: queuedAttachments.length > 0 ? cloneAttachments(queuedAttachments) : undefined
    }
  };

  await appendEntry(entry);
  return entry;
}

export async function queueReviereinrichtungPhotoUploads(
  einrichtungId: string,
  attachments: LocalPendingPhoto[]
): Promise<OfflineOperation[]> {
  await ensureHydrated();
  const queuedAttachments = limitReviereinrichtungPhotoAttachments(attachments);

  if (queuedAttachments.length === 0) {
    return snapshot.entries;
  }

  const nextEntries = [
    ...queuedAttachments.map<OfflineReviereinrichtungPhotoUploadOperation>((attachment) => ({
      id: createQueueId("reviereinrichtung-photo"),
      kind: "reviereinrichtung-photo-upload",
      title: attachment.title ?? attachment.fileName,
      createdAt: new Date().toISOString(),
      status: "pending",
      attemptCount: 0,
      einrichtungId,
      attachment: cloneAttachment(attachment)
    })),
    ...snapshot.entries
  ];

  await persistEntries(nextEntries);
  return nextEntries;
}

export async function discardOfflineQueueEntry(entryId: string): Promise<OfflineOperation[]> {
  await ensureHydrated();
  return removeEntry(entryId);
}

export async function retryOfflineQueueEntry(entryId: string): Promise<OfflineOperation[]> {
  await ensureHydrated();

  return patchEntry(entryId, (entry) => {
    if (entry.status !== "failed" && entry.status !== "conflict") {
      return {};
    }

    return {
      status: "pending",
      lastError: undefined,
      nextAttemptAt: undefined
    };
  });
}

export async function syncOfflineQueue(
  options: SyncOfflineQueueOptions = {}
): Promise<OfflineOperation[]> {
  if (!activeMembershipId) {
    return [];
  }

  await ensureHydrated();

  if (syncPromise) {
    return syncPromise;
  }

  if (options.retryFailed) {
    await resetRetryableFailures();
  }

  if (snapshot.entries.length === 0) {
    setSnapshot({
      ...snapshot,
      isSyncing: false
    });
    return snapshot.entries;
  }

  syncPromise = runQueueSync().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

async function resetRetryableFailures() {
  const hasRetryableFailures = snapshot.entries.some((entry) => entry.status === "failed");

  if (!hasRetryableFailures) {
    return;
  }

  await persistEntries(
    snapshot.entries.map((entry) =>
      entry.status === "failed"
        ? {
            ...entry,
            status: "pending" as const,
            lastError: undefined,
            nextAttemptAt: undefined
          }
        : entry
    )
  );
}

async function runQueueSync() {
  const initialEntries = snapshot.entries;

  setSnapshot({
    ...snapshot,
    isSyncing: true
  });

  let entry = getNextSyncableEntry();

  while (entry) {
    try {
      if (entry.kind === "ansitz-create") {
        await patchEntry(entry.id, syncPatch("syncing"));
        await createAnsitz(entry.payload);
        await removeEntry(entry.id);
      } else if (entry.kind === "fallwild-create") {
        await patchEntry(entry.id, syncPatch("syncing"));
        const created = await createFallwild(stripAttachments(entry.payload));

        await removeEntry(entry.id);

        const attachments = entry.payload.attachments ?? [];
        if (attachments.length > 0) {
          await queueFallwildPhotoUploads(created.id, attachments);
        }
      } else if (entry.kind === "fallwild-photo-upload") {
        await patchEntry(entry.id, syncPatch("uploading"));
        await uploadFallwildPhoto(entry.fallwildId, entry.attachment);
        await removeEntry(entry.id);
      } else if (entry.kind === "reviereinrichtung-create") {
        await patchEntry(entry.id, syncPatch("syncing"));
        const created = await createReviereinrichtung(stripReviereinrichtungAttachments(entry.payload));
        await removeEntry(entry.id);

        const attachments = entry.payload.attachments ?? [];
        if (attachments.length > 0) {
          await queueReviereinrichtungPhotoUploads(created.id, attachments);
        }
      } else {
        await patchEntry(entry.id, syncPatch("uploading"));
        await uploadReviereinrichtungPhoto(entry.einrichtungId, entry.attachment);
        await removeEntry(entry.id);
      }
    } catch (error) {
      await patchEntry(entry.id, failurePatch(entry.attemptCount + 1, error));
    }

    entry = getNextSyncableEntry();
  }

  const remainingEntryIds = new Set(snapshot.entries.map((entry) => entry.id));
  const successfulEntries = initialEntries.filter((entry) => !remainingEntryIds.has(entry.id));
  const successfulSyncKinds = [...new Set(successfulEntries.map((entry) => entry.kind))];

  setSnapshot({
    ...snapshot,
    isSyncing: false,
    lastSuccessfulSyncAt:
      successfulEntries.length > 0 ? new Date().toISOString() : snapshot.lastSuccessfulSyncAt,
    lastSuccessfulSyncCount: successfulEntries.length,
    lastSuccessfulSyncKinds: successfulSyncKinds
  });

  return snapshot.entries;
}

async function migrateLegacyQueueIfNeeded(membershipId: string) {
  const scopedKey = scopedStorageKey(membershipId);
  const [legacyRaw, scopedRaw] = await Promise.all([
    AsyncStorage.getItem(LEGACY_STORAGE_KEY),
    AsyncStorage.getItem(scopedKey)
  ]);

  if (!legacyRaw || scopedRaw) {
    return;
  }

  const legacyEntries = parseQueue(legacyRaw);
  if (legacyEntries.length === 0) {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(scopedKey, legacyRaw);
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

async function appendEntry(entry: OfflineOperation) {
  if (!activeMembershipId) {
    throw new Error("Offline queue is not bound to an authenticated membership.");
  }

  const entries = await ensureHydrated();
  const nextEntries = [entry, ...entries];
  await persistEntries(nextEntries);
  return nextEntries;
}

async function removeEntry(entryId: string) {
  const entries = await ensureHydrated();
  const nextEntries = entries.filter((entry) => entry.id !== entryId);
  await persistEntries(nextEntries);
  return nextEntries;
}

async function patchEntry(
  entryId: string,
  patch:
    | Partial<OfflineOperation>
    | ((entry: OfflineOperation) => Partial<OfflineOperation>)
) {
  const entries = await ensureHydrated();
  const nextEntries = entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    const nextPatch = typeof patch === "function" ? patch(entry) : patch;

    return {
      ...entry,
      ...nextPatch
    } as OfflineOperation;
  });

  await persistEntries(nextEntries);
  return nextEntries;
}

function syncPatch(status: "syncing" | "uploading") {
  return {
    status,
    lastAttemptAt: new Date().toISOString(),
    lastError: undefined,
    nextAttemptAt: undefined
  } satisfies Partial<OfflineOperation>;
}

function failurePatch(attemptCount: number, error: unknown): Partial<OfflineOperation> {
  const conflict = isConflictError(error);

  return {
    status: conflict ? "conflict" : "failed",
    attemptCount,
    lastAttemptAt: new Date().toISOString(),
    nextAttemptAt: conflict ? undefined : calculateNextAttemptAt(attemptCount),
    lastError: error instanceof Error ? error.message : "Synchronisierung fehlgeschlagen."
  } satisfies Partial<OfflineOperation>;
}

function getNextSyncableEntry() {
  const now = Date.now();

  return [...snapshot.entries]
    .reverse()
    .find((entry) => isEntrySyncable(entry, now));
}

function isEntrySyncable(entry: OfflineOperation, now: number) {
  if (entry.status === "pending") {
    return true;
  }

  if (entry.status !== "failed") {
    return false;
  }

  if (!entry.nextAttemptAt) {
    return true;
  }

  const nextAttemptAt = Date.parse(entry.nextAttemptAt);

  return Number.isNaN(nextAttemptAt) || nextAttemptAt <= now;
}

function calculateNextAttemptAt(attemptCount: number) {
  const retryDelayMinutes = RETRY_BACKOFF_MINUTES[Math.min(attemptCount - 1, RETRY_BACKOFF_MINUTES.length - 1)] ?? 60;
  return new Date(Date.now() + retryDelayMinutes * 60 * 1000).toISOString();
}

async function ensureHydrated(): Promise<OfflineOperation[]> {
  if (snapshot.hydrated) {
    return snapshot.entries;
  }

  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
    const raw = await AsyncStorage.getItem(getActiveStorageKey());
    const entries = parseQueue(raw);

    setSnapshot({
      entries,
      hydrated: true,
      isSyncing: false,
      lastSuccessfulSyncCount: 0,
      lastSuccessfulSyncKinds: []
    });

    return entries;
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}

async function persistEntries(entries: OfflineOperation[]) {
  if (!activeMembershipId) {
    return;
  }

  await AsyncStorage.setItem(scopedStorageKey(activeMembershipId), JSON.stringify(entries));
  setSnapshot({
    ...snapshot,
    hydrated: true,
    entries
  });
}

function parseQueue(raw: string | null): OfflineOperation[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeOfflineOperation).filter(isOfflineOperation);
  } catch {
    return [];
  }
}

function normalizeOfflineOperation(value: unknown): OfflineOperation | null {
  if (!isOfflineOperation(value)) {
    return null;
  }

  const base = {
    ...value,
    status: normalizeHydratedStatus(value.status),
    nextAttemptAt: normalizeOptionalString(value.nextAttemptAt)
  };

  if (base.kind === "fallwild-create") {
    const attachments = base.payload.attachments
      ? limitFallwildPhotoAttachments(base.payload.attachments)
      : undefined;

    return {
      ...base,
      payload: {
        ...base.payload,
        attachments: attachments && attachments.length > 0 ? attachments : undefined
      }
    };
  }

  if (base.kind === "fallwild-photo-upload") {
    return {
      ...base,
      attachment: cloneAttachment(base.attachment)
    };
  }

  if (base.kind === "reviereinrichtung-create") {
    const attachments = base.payload.attachments
      ? limitReviereinrichtungPhotoAttachments(base.payload.attachments)
      : undefined;

    return {
      ...base,
      payload: {
        ...base.payload,
        attachments: attachments && attachments.length > 0 ? attachments : undefined
      }
    };
  }

  if (base.kind === "reviereinrichtung-photo-upload") {
    return {
      ...base,
      attachment: cloneAttachment(base.attachment)
    };
  }

  return base;
}

function normalizeHydratedStatus(status: OfflineQueueStatus): OfflineQueueStatus {
  return status === "syncing" || status === "uploading" ? "pending" : status;
}

function isOfflineOperation(value: unknown): value is OfflineOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const entry = value as Partial<OfflineOperation>;

  const hasValidPayload =
    entry.kind === "ansitz-create"
      ? isCreateAnsitzPayload(entry.payload)
      : entry.kind === "fallwild-create"
        ? isQueuedFallwildCreatePayload(entry.payload)
        : entry.kind === "fallwild-photo-upload"
          ? isOfflineFallwildPhotoUploadPayload(entry)
          : entry.kind === "reviereinrichtung-create"
            ? isQueuedReviereinrichtungCreatePayload(entry.payload)
            : isOfflineReviereinrichtungPhotoUploadPayload(entry);

  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.attemptCount === "number" &&
    (entry.nextAttemptAt == null || typeof entry.nextAttemptAt === "string") &&
    (entry.status === "pending" || entry.status === "syncing" || entry.status === "uploading" || entry.status === "failed" || entry.status === "conflict") &&
    (entry.kind === "ansitz-create" ||
      entry.kind === "fallwild-create" ||
      entry.kind === "fallwild-photo-upload" ||
      entry.kind === "reviereinrichtung-create" ||
      entry.kind === "reviereinrichtung-photo-upload") &&
    hasValidPayload
  );
}

function createQueueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneAttachment(attachment: LocalPendingPhoto): LocalPendingPhoto {
  return {
    ...attachment
  };
}

function cloneAttachments(attachments: LocalPendingPhoto[]): LocalPendingPhoto[] {
  return attachments.map(cloneAttachment);
}

function stripAttachments(payload: QueuedFallwildCreatePayload): CreateFallwildRequest {
  const { attachments: _attachments, ...createPayload } = payload;
  return createPayload;
}

function stripReviereinrichtungAttachments(
  payload: QueuedReviereinrichtungCreatePayload
): CreateReviereinrichtungRequest {
  const { attachments: _attachments, ...createPayload } = payload;
  return createPayload;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function uploadFallwildPhoto(fallwildId: string, attachment: LocalPendingPhoto) {
  const api = await import("./api");
  const uploader = (api as typeof api & {
    uploadFallwildPhoto?: (fallwildId: string, attachment: LocalPendingPhoto) => Promise<{ photo: PhotoAsset }>;
  }).uploadFallwildPhoto;

  if (!uploader) {
    throw Object.assign(new Error("Foto-Upload ist nicht verfügbar."), {
      status: 503,
      code: "service-unavailable"
    });
  }

  await uploader(fallwildId, attachment);
}

async function uploadReviereinrichtungPhoto(
  einrichtungId: string,
  attachment: LocalPendingPhoto
) {
  const api = await import("./api");
  const uploader = (api as typeof api & {
    uploadReviereinrichtungPhoto?: (
      einrichtungId: string,
      attachment: LocalPendingPhoto
    ) => Promise<{ photo: PhotoAsset }>;
  }).uploadReviereinrichtungPhoto;

  if (!uploader) {
    throw Object.assign(new Error("Foto-Upload ist nicht verfügbar."), {
      status: 503,
      code: "service-unavailable"
    });
  }

  await uploader(einrichtungId, attachment);
}

function isConflictError(error: unknown) {
  if (error instanceof Error) {
    const status = typeof (error as { status?: number }).status === "number" ? (error as { status?: number }).status : undefined;
    const code = typeof (error as { code?: string }).code === "string" ? (error as { code?: string }).code : undefined;

    return status === 409 || code === "conflict";
  }

  return false;
}

function isCreateAnsitzPayload(value: unknown): value is CreateAnsitzRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Partial<CreateAnsitzRequest>;

  return typeof payload.standortName === "string" && payload.location != null;
}

function isQueuedFallwildCreatePayload(value: unknown): value is QueuedFallwildCreatePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Partial<QueuedFallwildCreatePayload>;

  return (
    typeof payload.wildart === "string" &&
    typeof payload.geschlecht === "string" &&
    typeof payload.altersklasse === "string" &&
    typeof payload.bergungsStatus === "string" &&
    typeof payload.gemeinde === "string" &&
    payload.location != null &&
    (payload.attachments == null || (Array.isArray(payload.attachments) && payload.attachments.every(isLocalPendingPhoto)))
  );
}

function isOfflineFallwildPhotoUploadPayload(value: unknown): value is OfflineFallwildPhotoUploadOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Partial<OfflineFallwildPhotoUploadOperation>;

  return (
    typeof payload.fallwildId === "string" &&
    isLocalPendingPhoto(payload.attachment)
  );
}

function isQueuedReviereinrichtungCreatePayload(
  value: unknown
): value is QueuedReviereinrichtungCreatePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Partial<QueuedReviereinrichtungCreatePayload>;

  return (
    typeof payload.type === "string" &&
    typeof payload.name === "string" &&
    payload.location != null &&
    (payload.attachments == null ||
      (Array.isArray(payload.attachments) && payload.attachments.every(isLocalPendingPhoto)))
  );
}

function isOfflineReviereinrichtungPhotoUploadPayload(
  value: unknown
): value is OfflineReviereinrichtungPhotoUploadOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Partial<OfflineReviereinrichtungPhotoUploadOperation>;

  return typeof payload.einrichtungId === "string" && isLocalPendingPhoto(payload.attachment);
}

function setSnapshot(nextSnapshot: OfflineQueueSnapshot) {
  snapshot = nextSnapshot;

  for (const listener of listeners) {
    listener();
  }
}

function formatPhotoCount(count: number) {
  return count === 1 ? "1 Foto" : `${count} Fotos`;
}
