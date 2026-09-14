import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "../env";

const DIRECT_UPLOAD_GRANT_TTL_SECONDS = 15 * 60;

export type DirectPhotoEntityType = "fallwild" | "reviereinrichtung";

export interface DirectPhotoUploadGrant {
  version: 1;
  kind: "direct-photo-upload";
  entityType: DirectPhotoEntityType;
  entityId: string;
  photoId: string;
  objectKey: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png";
  sizeBytes: number;
  title: string;
  revierId: string;
  membershipId: string;
  issuedAt: number;
  expiresAt: number;
}

interface IssueDirectPhotoUploadGrantInput
  extends Omit<DirectPhotoUploadGrant, "version" | "kind" | "issuedAt" | "expiresAt"> {}

export function issueDirectPhotoUploadGrant(
  input: IssueDirectPhotoUploadGrantInput,
  nowInSeconds = currentTimeInSeconds()
) {
  const grant: DirectPhotoUploadGrant = {
    version: 1,
    kind: "direct-photo-upload",
    ...input,
    issuedAt: nowInSeconds,
    expiresAt: nowInSeconds + DIRECT_UPLOAD_GRANT_TTL_SECONDS
  };
  const encodedGrant = Buffer.from(JSON.stringify(grant)).toString("base64url");

  return {
    token: `${encodedGrant}.${sign(encodedGrant)}`,
    expiresAt: new Date(grant.expiresAt * 1000).toISOString()
  };
}

export function verifyDirectPhotoUploadGrant(
  token: string,
  expected: {
    entityType: DirectPhotoEntityType;
    entityId: string;
    revierId: string;
    membershipId: string;
  },
  nowInSeconds = currentTimeInSeconds()
): DirectPhotoUploadGrant {
  const [encodedGrant, encodedSignature] = token.split(".");

  if (!encodedGrant || !encodedSignature || !hasValidSignature(encodedGrant, encodedSignature)) {
    throw invalidGrantError();
  }

  const grant = parseGrant(encodedGrant);

  if (
    grant.expiresAt <= nowInSeconds ||
    grant.entityType !== expected.entityType ||
    grant.entityId !== expected.entityId ||
    grant.revierId !== expected.revierId ||
    grant.membershipId !== expected.membershipId
  ) {
    throw invalidGrantError();
  }

  return grant;
}

function parseGrant(encodedGrant: string): DirectPhotoUploadGrant {
  try {
    const value = JSON.parse(Buffer.from(encodedGrant, "base64url").toString("utf8")) as Partial<DirectPhotoUploadGrant>;

    if (
      value.version !== 1 ||
      value.kind !== "direct-photo-upload" ||
      (value.entityType !== "fallwild" && value.entityType !== "reviereinrichtung") ||
      typeof value.entityId !== "string" ||
      typeof value.photoId !== "string" ||
      typeof value.objectKey !== "string" ||
      typeof value.fileName !== "string" ||
      (value.contentType !== "image/jpeg" && value.contentType !== "image/png") ||
      typeof value.sizeBytes !== "number" ||
      !Number.isSafeInteger(value.sizeBytes) ||
      value.sizeBytes <= 0 ||
      typeof value.title !== "string" ||
      typeof value.revierId !== "string" ||
      typeof value.membershipId !== "string" ||
      typeof value.issuedAt !== "number" ||
      typeof value.expiresAt !== "number"
    ) {
      throw new Error("invalid");
    }

    return value as DirectPhotoUploadGrant;
  } catch {
    throw invalidGrantError();
  }
}

function hasValidSignature(value: string, signature: string) {
  const expected = Buffer.from(sign(value));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function sign(value: string) {
  return createHmac("sha256", getServerEnv().authTokenSecret).update(value).digest("base64url");
}

function invalidGrantError() {
  return Object.assign(new Error("Die Upload-Freigabe ist ungültig oder abgelaufen."), {
    status: 400,
    code: "validation-error"
  });
}

function currentTimeInSeconds() {
  return Math.floor(Date.now() / 1000);
}
