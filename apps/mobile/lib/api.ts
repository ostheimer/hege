import type {
  Altersklasse,
  AnsitzSession,
  Aufgabe,
  AufgabePrioritaet,
  AufgabeStatus,
  AuthContextResponse,
  AuthSessionResponse,
  BergungsStatus,
  ChangePinPayload,
  ContactDirectoryResponse,
  ContactEntry,
  ContactList,
  DashboardResponse,
  DocumentDownloadRef,
  FallwildRoadReference,
  GeoPoint,
  Geschlecht,
  LoginPayload,
  LocationWeather,
  PhotoAsset,
  ProtokollDetail,
  ProtokollListItem,
  Reviereinrichtung,
  ReviereinrichtungDetails,
  ReviereinrichtungListItem,
  Reviermeldung,
  ReviermeldungKategorie,
  ReviermeldungStatus,
  RevierResourceType,
  Role,
  FallwildVorgang,
  Membership,
  Revier,
  User,
  Wildart
} from "@hege/domain";
import { buildDashboardOverview, canRoleAccess, demoData } from "@hege/domain";

import type { LocalPendingPhoto } from "./fallwild-photos";
import { clearSession, getAccessToken, getRefreshToken, saveSession } from "./session";

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

export type ApiMeResponse = AuthContextResponse;

export type FallwildListItem = FallwildVorgang;

export type ReviermeldungListItem = Reviermeldung;

export type AufgabeListItem = Aufgabe;

export interface LoginResult extends AuthSessionResponse {}

export interface CreateAnsitzRequest {
  standortId?: string;
  standortName: string;
  location: GeoPoint;
  startedAt?: string;
  plannedEndAt?: string;
  note?: string;
}

export interface CreateFallwildRequest {
  recordedAt?: string;
  location: GeoPoint;
  wildart: Wildart;
  geschlecht: Geschlecht;
  altersklasse: Altersklasse;
  bergungsStatus: BergungsStatus;
  gemeinde: string;
  strasse?: string;
  roadReference?: FallwildRoadReference;
  note?: string;
}

export interface CreateReviereinrichtungRequest {
  type: Reviereinrichtung["type"];
  name: string;
  status?: Reviereinrichtung["status"];
  location: GeoPoint;
  beschreibung?: string;
  orientationDegrees?: number;
  details?: ReviereinrichtungDetails;
}

export interface CreateReviermeldungRequest {
  category: ReviermeldungKategorie;
  occurredAt?: string;
  title: string;
  description?: string;
  location?: GeoPoint;
  relatedType?: RevierResourceType;
  relatedId?: string;
}

export interface CreateAufgabeRequest {
  sourceType?: RevierResourceType;
  sourceId?: string;
  title: string;
  description?: string;
  status?: AufgabeStatus;
  priority?: AufgabePrioritaet;
  dueAt?: string;
  assigneeMembershipIds?: string[];
}

export interface UpdateReviermeldungRequest {
  status?: ReviermeldungStatus;
  title?: string;
  description?: string | null;
}

export interface UpdateAufgabeRequest {
  title?: string;
  description?: string | null;
  status?: AufgabeStatus;
  priority?: AufgabePrioritaet;
  dueAt?: string | null;
  completionNote?: string | null;
  assigneeMembershipIds?: string[];
}

export interface CreateContactListRequest {
  title: string;
}

export interface UpdateContactListRequest {
  title?: string;
}

export interface CreateContactEntryRequest {
  membershipId?: string;
  name?: string;
  phone?: string;
  revier?: string;
  funktion?: string;
  note?: string;
}

export interface UpdateContactEntryRequest {
  membershipId?: string | null;
  name?: string;
  phone?: string;
  revier?: string | null;
  funktion?: string | null;
  note?: string | null;
}

export interface FallwildLocationSuggestionResponse {
  location: GeoPoint;
  gemeinde?: string;
  strasse?: string;
  roadReference?: FallwildRoadReference;
  warnings: string[];
}

export interface FallwildPhotoUploadResponse {
  photo: PhotoAsset;
}

export interface ReviereinrichtungPhotoUploadResponse {
  photo: PhotoAsset;
}

export interface MutationResponse {
  id: string;
}

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL);
}

export function toApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getApiBaseUrl()}${normalizedPath}`;
}

export async function loginWithCredentials(payload: LoginPayload): Promise<LoginResult> {
  const session = await requestJson<AuthSessionResponse>("/v1/auth/login", {
    method: "POST",
    auth: false,
    body: payload
  });

  await saveSession(session);
  return session;
}

/**
 * Setzt die Login-PIN neu (Profil → Sicherheit). Verlangt die aktuelle
 * PIN als Besitznachweis; der Server antwortet bei falscher PIN mit 401.
 */
export async function changePin(payload: ChangePinPayload): Promise<void> {
  await requestJson<{ ok: boolean }>("/v1/auth/change-pin", {
    method: "POST",
    body: payload
  });
}

export async function refreshStoredSession() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const session = await requestJson<AuthSessionResponse>("/v1/auth/refresh", {
      method: "POST",
      auth: false,
      retryOnUnauthorized: false,
      body: {
        refreshToken
      }
    });

    await saveSession(session);
    return session;
  } catch (error) {
    await clearSession();
    throw error;
  }
}

export async function logout() {
  await clearSession();
}

export function isRecoverableMutationError(error: unknown) {
  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof MobileApiError) {
    return error.status >= 500 || error.code === "service-unavailable";
  }

  return false;
}

export async function fetchCurrentUser(): Promise<ApiMeResponse> {
  const response = await requestJson<AuthContextResponse>("/v1/me", {
    fallback: fallbackCurrentUser
  });

  return response;
}

export async function fetchDashboardSnapshot(): Promise<DashboardResponse> {
  return requestJson<DashboardResponse>("/v1/dashboard", {
    fallback: fallbackDashboardSnapshot
  });
}

export async function fetchLiveAnsitze(): Promise<AnsitzSession[]> {
  return requestJson<AnsitzSession[]>("/v1/ansitze/live", {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      return fallbackLiveAnsitze(me.revier.id);
    }
  });
}

export async function fetchFallwildList(): Promise<FallwildListItem[]> {
  return requestJson<FallwildListItem[]>("/v1/fallwild", {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      return fallbackFallwildList(me.revier.id);
    }
  });
}

export async function fetchFallwildDetail(id: string): Promise<FallwildListItem> {
  return requestJson<FallwildListItem>(`/v1/fallwild/${encodeURIComponent(id)}`, {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      const entries = await fallbackFallwildList(me.revier.id);
      const match = entries.find((entry) => entry.id === id);

      if (!match) {
        throw new MobileApiError("Fallwild wurde nicht gefunden.", 404, "not-found");
      }

      return match;
    }
  });
}

export async function fetchReviermeldungenList(): Promise<ReviermeldungListItem[]> {
  return requestJson<ReviermeldungListItem[]>("/v1/reviermeldungen", {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      return fallbackReviermeldungenList(me.revier.id);
    }
  });
}

export async function fetchAufgabenList(): Promise<AufgabeListItem[]> {
  return requestJson<AufgabeListItem[]>("/v1/aufgaben", {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      return fallbackAufgabenList(me.revier.id, me.membership.id);
    }
  });
}

export async function fetchContactDirectory(): Promise<ContactDirectoryResponse> {
  return requestJson<ContactDirectoryResponse>("/v1/contact-lists", {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      return fallbackContactDirectory(me.revier.id, me.membership.role);
    }
  });
}

export async function createAnsitz(payload: CreateAnsitzRequest): Promise<MutationResponse> {
  return requestJson<MutationResponse>("/v1/ansitze", {
    method: "POST",
    body: payload
  });
}

export async function createFallwild(payload: CreateFallwildRequest): Promise<MutationResponse> {
  return requestJson<MutationResponse>("/v1/fallwild", {
    method: "POST",
    body: payload
  });
}

export async function createReviereinrichtung(
  payload: CreateReviereinrichtungRequest
): Promise<MutationResponse> {
  return requestJson<MutationResponse>("/v1/reviereinrichtungen", {
    method: "POST",
    body: payload
  });
}

export async function createReviermeldung(payload: CreateReviermeldungRequest): Promise<MutationResponse> {
  return requestJson<MutationResponse>("/v1/reviermeldungen", {
    method: "POST",
    body: payload
  });
}

export async function createAufgabe(payload: CreateAufgabeRequest): Promise<MutationResponse> {
  return requestJson<MutationResponse>("/v1/aufgaben", {
    method: "POST",
    body: payload
  });
}

export async function updateAufgabe(id: string, payload: UpdateAufgabeRequest): Promise<AufgabeListItem> {
  return requestJson<AufgabeListItem>(`/v1/aufgaben/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload
  });
}

export async function createContactList(payload: CreateContactListRequest): Promise<ContactList> {
  return requestJson<ContactList>("/v1/contact-lists", {
    method: "POST",
    body: payload
  });
}

export async function updateContactList(id: string, payload: UpdateContactListRequest): Promise<ContactList> {
  return requestJson<ContactList>(`/v1/contact-lists/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload
  });
}

export async function deleteContactList(id: string): Promise<MutationResponse> {
  return requestJson<MutationResponse>(`/v1/contact-lists/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function createContactEntry(
  listId: string,
  payload: CreateContactEntryRequest
): Promise<ContactEntry> {
  return requestJson<ContactEntry>(`/v1/contact-lists/${encodeURIComponent(listId)}/entries`, {
    method: "POST",
    body: payload
  });
}

export async function updateContactEntry(
  listId: string,
  entryId: string,
  payload: UpdateContactEntryRequest
): Promise<ContactEntry> {
  return requestJson<ContactEntry>(
    `/v1/contact-lists/${encodeURIComponent(listId)}/entries/${encodeURIComponent(entryId)}`,
    {
      method: "PATCH",
      body: payload
    }
  );
}

export async function deleteContactEntry(listId: string, entryId: string): Promise<MutationResponse> {
  return requestJson<MutationResponse>(
    `/v1/contact-lists/${encodeURIComponent(listId)}/entries/${encodeURIComponent(entryId)}`,
    {
      method: "DELETE"
    }
  );
}

export async function updateReviermeldung(
  id: string,
  payload: UpdateReviermeldungRequest
): Promise<ReviermeldungListItem> {
  return requestJson<ReviermeldungListItem>(`/v1/reviermeldungen/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload
  });
}

export async function resolveFallwildLocation(
  lat: number,
  lng: number,
  accuracyMeters?: number
): Promise<FallwildLocationSuggestionResponse> {
  return requestJson<FallwildLocationSuggestionResponse>("/v1/geo/fallwild-location", {
    method: "POST",
    body: {
      lat,
      lng,
      ...(typeof accuracyMeters === "number" ? { accuracyMeters } : {})
    }
  });
}

export async function uploadFallwildPhoto(
  fallwildId: string,
  attachment: LocalPendingPhoto
): Promise<FallwildPhotoUploadResponse> {
  const formData = new FormData();
  formData.append(
    "file",
    {
      uri: attachment.uri,
      name: attachment.fileName,
      type: attachment.mimeType
    } as never
  );

  if (attachment.title) {
    formData.append("title", attachment.title);
  }

  return requestJson<FallwildPhotoUploadResponse>(`/v1/fallwild/${encodeURIComponent(fallwildId)}/fotos`, {
    method: "POST",
    body: formData
  });
}

export async function uploadReviereinrichtungPhoto(
  einrichtungId: string,
  attachment: LocalPendingPhoto
): Promise<ReviereinrichtungPhotoUploadResponse> {
  const formData = new FormData();
  formData.append(
    "file",
    {
      uri: attachment.uri,
      name: attachment.fileName,
      type: attachment.mimeType
    } as never
  );

  if (attachment.title) {
    formData.append("title", attachment.title);
  }

  return requestJson<ReviereinrichtungPhotoUploadResponse>(
    `/v1/reviereinrichtungen/${encodeURIComponent(einrichtungId)}/fotos`,
    {
      method: "POST",
      body: formData
    }
  );
}

export async function fetchReviereinrichtungenList(): Promise<ReviereinrichtungListItem[]> {
  return requestJson<ReviereinrichtungListItem[]>("/v1/reviereinrichtungen", {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      return fallbackReviereinrichtungenList(me.revier.id);
    }
  });
}

export async function fetchLocationWeather(lat: number, lng: number): Promise<LocationWeather> {
  const search = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return requestJson<LocationWeather>(`/v1/weather/point?${search.toString()}`);
}

export async function fetchProtokolleList(): Promise<ProtokollListItem[]> {
  return requestJson<ProtokollListItem[]>("/v1/protokolle", {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      return fallbackProtokolleList(me.revier.id);
    }
  });
}

export async function fetchProtokollDetail(id: string): Promise<ProtokollDetail> {
  return requestJson<ProtokollDetail>(`/v1/protokolle/${encodeURIComponent(id)}`, {
    fallback: async () => {
      const me = await fallbackCurrentUser();
      const items = await fallbackProtokolleList(me.revier.id);
      const match = items.find((entry) => entry.id === id);

      if (!match) {
        throw new MobileApiError("Protokoll wurde nicht gefunden.", 404, "not-found");
      }

      const source = demoData.sitzungen.find((entry) => entry.id === id);

      if (!source) {
        throw new MobileApiError("Protokoll wurde nicht gefunden.", 404, "not-found");
      }

      return {
        ...match,
        participants: source.participants,
        versions: source.versions
      };
    }
  });
}

async function requestJson<T>(
  path: string,
  options: {
    method?: string;
    headers?: HeadersInit;
    body?: unknown;
    auth?: boolean;
    retryOnUnauthorized?: boolean;
    fallback?: () => Promise<T>;
  } = {}
): Promise<T> {
  const response = await performRequest(path, options);

  if (!response.ok) {
    if (response.status === 404 && options.fallback) {
      return options.fallback();
    }

    if (response.status === 401 && options.auth !== false && options.retryOnUnauthorized !== false) {
      const refreshed = await refreshStoredSession().catch(() => null);

      if (refreshed) {
        return requestJson(path, {
          ...options,
          retryOnUnauthorized: false
        });
      }
    }

    if (response.status === 401 && options.auth !== false) {
      await clearSession();
    }

    throw await readApiError(response);
  }

  return (await response.json()) as T;
}

async function performRequest(
  path: string,
  options: {
    method?: string;
    headers?: HeadersInit;
    body?: unknown;
    auth?: boolean;
  } = {}
) {
  const headers = new Headers(options.headers ?? {});

  if (options.auth !== false) {
    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }
  }

  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
  }

  return fetch(toApiUrl(path), {
    method: options.method ?? "GET",
    headers,
    body
  });
}

async function readApiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | {
        error?: {
          code?: string;
          message?: string;
          status?: number;
        };
      }
    | null;

  return new MobileApiError(
    payload?.error?.message ?? `HTTP ${response.status}`,
    payload?.error?.status ?? response.status,
    payload?.error?.code ?? "internal-error"
  );
}

function normalizeBaseUrl(value: string): string {
  const trimmed = trimTrailingSlash(value);

  return trimmed.endsWith("/v1") ? trimmed.slice(0, -3) : trimmed;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function fallbackCurrentUser(): Promise<ApiMeResponse> {
  const current = demoData.memberships[0];
  const user = demoData.users.find((entry) => entry.id === current?.userId);
  const revier = demoData.reviere.find((entry) => entry.id === current?.revierId);

  if (!current || !user || !revier) {
    throw new MobileApiError("Benutzerkontext konnte nicht geladen werden.", 500, "internal-error");
  }

  return {
    user,
    membership: current,
    revier,
    setupRequired: !revier.setupCompletedAt,
    activeRevierId: current.revierId,
    availableMemberships: demoData.memberships
      .filter((membership) => membership.userId === user.id)
      .map((membership) => ({
        id: membership.id,
        revierId: membership.revierId,
        role: membership.role,
        jagdzeichen: membership.jagdzeichen,
        revierName: demoData.reviere.find((entry) => entry.id === membership.revierId)?.name ?? "Unbekannt"
      }))
  };
}

async function fallbackDashboardSnapshot(): Promise<DashboardResponse> {
  const me = await fallbackCurrentUser();
  const activeAnsitze = await fallbackLiveAnsitze(me.revier.id);
  const recentFallwild = await fallbackFallwildList(me.revier.id);

  return {
    ...me,
    overview: buildDashboardOverview(demoData, me.revier.id),
    activeAnsitze,
    recentFallwild
  };
}

async function fallbackLiveAnsitze(revierId?: string): Promise<AnsitzSession[]> {
  const activeRevierId = revierId ?? demoData.reviere[0]?.id;

  return demoData.ansitze.filter((entry) => entry.status === "active" && entry.revierId === activeRevierId);
}

async function fallbackFallwildList(revierId?: string): Promise<FallwildListItem[]> {
  const activeRevierId = revierId ?? demoData.reviere[0]?.id;

  return demoData.fallwild.filter((entry) => entry.revierId === activeRevierId);
}

async function fallbackReviermeldungenList(revierId?: string): Promise<ReviermeldungListItem[]> {
  const activeRevierId = revierId ?? demoData.reviere[0]?.id;

  return demoData.reviermeldungen.filter((entry) => entry.revierId === activeRevierId);
}

async function fallbackAufgabenList(revierId?: string, membershipId?: string): Promise<AufgabeListItem[]> {
  const activeRevierId = revierId ?? demoData.reviere[0]?.id;

  return demoData.aufgaben
    .filter((entry) => entry.revierId === activeRevierId)
    .filter(
      (entry) =>
        !membershipId ||
        entry.createdByMembershipId === membershipId ||
        entry.assigneeMembershipIds.includes(membershipId)
    );
}

async function fallbackContactDirectory(
  revierId?: string,
  role: ContactDirectoryResponse["registeredMembers"][number]["role"] = "ausgeher"
): Promise<ContactDirectoryResponse> {
  const activeRevierId = revierId ?? demoData.reviere[0]?.id;
  const registeredMembers = demoData.memberships
    .filter((membership) => membership.revierId === activeRevierId)
    .map((membership) => {
      const user = demoData.users.find((candidate) => candidate.id === membership.userId);

      return {
        membershipId: membership.id,
        userId: membership.userId,
        name: user?.name ?? membership.userId,
        phone: user?.phone ?? "",
        role: membership.role,
        jagdzeichen: membership.jagdzeichen
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "de-AT"));

  return {
    registeredMembers,
    lists: demoData.contactLists
      .filter((list) => list.revierId === activeRevierId)
      .map((list) => ({
        ...list,
        entries: list.entries.map((entry) => {
          const linkedMember = entry.membershipId
            ? registeredMembers.find((member) => member.membershipId === entry.membershipId)
            : undefined;

          return {
            ...entry,
            name: linkedMember?.name ?? entry.name,
            phone: linkedMember?.phone ?? entry.phone,
            linkedMember
          };
        })
      })),
    canManage: canRoleAccess(role, "contacts-manage")
  };
}

async function fallbackReviereinrichtungenList(revierId?: string): Promise<ReviereinrichtungListItem[]> {
  const activeRevierId = revierId ?? demoData.reviere[0]?.id;

  return demoData.reviereinrichtungen
    .filter((entry) => entry.revierId === activeRevierId)
    .map(mapReviereinrichtungToListItem);
}

async function fallbackProtokolleList(revierId?: string): Promise<ProtokollListItem[]> {
  const activeRevierId = revierId ?? demoData.reviere[0]?.id;

  return demoData.sitzungen.filter((entry) => entry.revierId === activeRevierId).map(mapSitzungToProtokollListItem);
}

function mapReviereinrichtungToListItem(entry: Reviereinrichtung): ReviereinrichtungListItem {
  return {
    ...entry,
    offeneWartungen: entry.wartung.filter((wartung) => wartung.status === "offen").length,
    letzteKontrolleAt: entry.kontrollen[0]?.createdAt
  };
}

function mapSitzungToProtokollListItem(entry: (typeof demoData.sitzungen)[number]): ProtokollListItem {
  const latestVersion = entry.versions[0];

  return {
    id: entry.id,
    revierId: entry.revierId,
    title: entry.title,
    scheduledAt: entry.scheduledAt,
    locationLabel: entry.locationLabel,
    status: entry.status,
    latestVersionCreatedAt: latestVersion?.createdAt,
    summaryPreview: latestVersion?.summary,
    beschlussCount: latestVersion?.beschluesse.length ?? 0,
    publishedDocument: entry.publishedDocument ? mapPublishedDocument(entry.publishedDocument) : undefined
  };
}

function mapPublishedDocument(document: NonNullable<(typeof demoData.sitzungen)[number]["publishedDocument"]>): DocumentDownloadRef {
  return {
    ...document,
    downloadUrl: document.url
  };
}
