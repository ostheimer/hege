export type Role = "platform-admin" | "revier-admin" | "schriftfuehrer" | "jaeger" | "ausgeher";
export type PublicPlanKey = "starter" | "revier" | "organisation";

export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "validation-error"
  | "conflict"
  | "service-unavailable"
  | "internal-error";

export type NotificationChannel = "push" | "in-app";

export type AnsitzStatus = "active" | "completed";

export type EinrichtungTyp =
  | "hochstand"
  | "fuetterung"
  | "salzlecke"
  | "kirrung"
  | "kamera"
  | "wildacker";

export type EinrichtungZustand = "gut" | "wartung-faellig" | "gesperrt";

export type Wildart =
  | "Reh"
  | "Rotwild"
  | "Schwarzwild"
  | "Fuchs"
  | "Dachs"
  | "Hase"
  | "Muffelwild";

export type Geschlecht = "maennlich" | "weiblich" | "unbekannt";

export type Altersklasse = "Kitz" | "Jaehrling" | "Adult" | "unbekannt";

export type BergungsStatus = "erfasst" | "geborgen" | "entsorgt" | "an-behoerde-gemeldet";

export type ProtokollStatus = "entwurf" | "freigegeben";

export type LocationSource = "manual" | "device-gps" | "reverse-geocode";

export type RoadKilometerSource = "manual" | "gip" | "unavailable";

export type ReviermeldungKategorie =
  | "fuetterung"
  | "wasserung"
  | "reviereinrichtung"
  | "schaden"
  | "gefahr"
  | "sichtung"
  | "sonstiges";

export type ReviermeldungStatus =
  | "neu"
  | "geprueft"
  | "in_bearbeitung"
  | "erledigt"
  | "verworfen"
  | "archiviert";

export type AufgabeStatus =
  | "offen"
  | "angenommen"
  | "in_arbeit"
  | "blockiert"
  | "erledigt"
  | "abgelehnt"
  | "archiviert";

export type AufgabePrioritaet = "niedrig" | "normal" | "hoch" | "dringend";

export type RevierResourceType =
  | "reviermeldung"
  | "reviereinrichtung"
  | "fallwild_vorgang"
  | "sitzung"
  | "beschluss";

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
  accuracyMeters?: number;
  source?: LocationSource;
  addressLabel?: string;
  placeId?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  username?: string;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  status: number;
}

export interface Revier {
  id: string;
  tenantKey: string;
  name: string;
  bundesland: string;
  bezirk: string;
  flaecheHektar: number;
  zentrum: GeoPoint;
  setupCompletedAt?: string;
}

export interface Membership {
  id: string;
  userId: string;
  revierId: string;
  role: Role;
  jagdzeichen: string;
  pushEnabled: boolean;
}

export interface MembershipSummary {
  id: string;
  revierId: string;
  role: Role;
  jagdzeichen: string;
  revierName: string;
}

export interface Device {
  id: string;
  membershipId: string;
  platform: "ios" | "android";
  pushToken: string;
  lastSeenAt: string;
}

export interface DocumentAsset {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  url: string;
  createdAt: string;
}

export interface DocumentDownloadRef extends DocumentAsset {
  downloadUrl: string;
}

export interface PhotoAsset {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

export interface AnsitzSession {
  id: string;
  revierId: string;
  membershipId: string;
  standortId?: string;
  standortName: string;
  location: GeoPoint;
  startedAt: string;
  plannedEndAt?: string;
  endedAt?: string;
  note?: string;
  status: AnsitzStatus;
  conflict: boolean;
}

export interface ReviereinrichtungKontrolle {
  id: string;
  createdAt: string;
  createdByMembershipId: string;
  zustand: EinrichtungZustand;
  note?: string;
}

export interface WartungsEintrag {
  id: string;
  dueAt: string;
  status: "offen" | "erledigt";
  title: string;
  note?: string;
}

export interface Reviereinrichtung {
  id: string;
  revierId: string;
  type: EinrichtungTyp;
  name: string;
  status: EinrichtungZustand;
  location: GeoPoint;
  beschreibung?: string;
  photos: PhotoAsset[];
  kontrollen: ReviereinrichtungKontrolle[];
  wartung: WartungsEintrag[];
}

export interface ReviereinrichtungListItem extends Reviereinrichtung {
  letzteKontrolleAt?: string;
  offeneWartungen: number;
}

export interface FallwildVorgang {
  id: string;
  revierId: string;
  reportedByMembershipId: string;
  recordedAt: string;
  location: GeoPoint;
  wildart: Wildart;
  geschlecht: Geschlecht;
  altersklasse: Altersklasse;
  bergungsStatus: BergungsStatus;
  gemeinde: string;
  strasse?: string;
  roadReference?: FallwildRoadReference;
  note?: string;
  photos: PhotoAsset[];
}

export interface FallwildRoadReference {
  roadName?: string;
  roadKilometer?: string;
  source?: RoadKilometerSource;
  placeId?: string;
}

export interface Reviermeldung {
  id: string;
  revierId: string;
  createdByMembershipId: string;
  category: ReviermeldungKategorie;
  status: ReviermeldungStatus;
  occurredAt: string;
  title: string;
  description?: string;
  location?: GeoPoint;
  relatedType?: RevierResourceType;
  relatedId?: string;
  photos: PhotoAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface Aufgabe {
  id: string;
  revierId: string;
  createdByMembershipId: string;
  sourceType?: RevierResourceType;
  sourceId?: string;
  title: string;
  description?: string;
  status: AufgabeStatus;
  priority: AufgabePrioritaet;
  dueAt?: string;
  completedAt?: string;
  completionNote?: string;
  assigneeMembershipIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Beschluss {
  id: string;
  title: string;
  decision: string;
  owner?: string;
  dueAt?: string;
}

export interface Teilnehmer {
  membershipId: string;
  anwesend: boolean;
}

export interface ProtokollVersion {
  id: string;
  createdAt: string;
  createdByMembershipId: string;
  summary: string;
  agenda: string[];
  beschluesse: Beschluss[];
  attachments: DocumentAsset[];
}

export interface Sitzung {
  id: string;
  revierId: string;
  title: string;
  scheduledAt: string;
  locationLabel: string;
  status: ProtokollStatus;
  participants: Teilnehmer[];
  versions: ProtokollVersion[];
  publishedDocument?: DocumentAsset;
}

export interface ProtokollListItem {
  id: string;
  revierId: string;
  title: string;
  scheduledAt: string;
  locationLabel: string;
  status: ProtokollStatus;
  latestVersionCreatedAt?: string;
  summaryPreview?: string;
  beschlussCount: number;
  publishedDocument?: DocumentDownloadRef;
}

export interface ProtokollDetail extends ProtokollListItem {
  participants: Teilnehmer[];
  versions: ProtokollVersion[];
}

export interface NotificationItem {
  id: string;
  revierId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  createdAt: string;
}

export interface RegisteredContact {
  membershipId: string;
  userId: string;
  name: string;
  phone: string;
  role: Role;
  jagdzeichen: string;
}

export interface ContactEntry {
  id: string;
  listId: string;
  revierId: string;
  membershipId?: string;
  name: string;
  phone: string;
  revier?: string;
  funktion?: string;
  note?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  linkedMember?: RegisteredContact;
}

export interface ContactList {
  id: string;
  revierId: string;
  title: string;
  position: number;
  entries: ContactEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactDirectoryResponse {
  registeredMembers: RegisteredContact[];
  lists: ContactList[];
  canManage: boolean;
}

export interface DashboardOverview {
  revier: Revier;
  aktiveAnsitze: number;
  ansitzeMitKonflikt: number;
  offeneWartungen: number;
  heutigeFallwildBergungen: number;
  unveroeffentlichteProtokolle: number;
  offeneAufgaben: number;
  letzteBenachrichtigungen: NotificationItem[];
  naechsteSitzung?: Sitzung;
}

export interface AuthContextResponse {
  user: User;
  membership: Membership;
  revier: Revier;
  activeRevierId: string;
  setupRequired: boolean;
  availableMemberships: MembershipSummary[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
}

export interface AuthSessionResponse extends AuthContextResponse {
  tokens: AuthTokens;
}

export interface DashboardResponse extends AuthContextResponse {
  overview: DashboardOverview;
  activeAnsitze: AnsitzSession[];
  recentFallwild: FallwildVorgang[];
}

export interface DemoData {
  reviere: Revier[];
  users: User[];
  memberships: Membership[];
  devices: Device[];
  ansitze: AnsitzSession[];
  reviereinrichtungen: Reviereinrichtung[];
  fallwild: FallwildVorgang[];
  reviermeldungen: Reviermeldung[];
  aufgaben: Aufgabe[];
  sitzungen: Sitzung[];
  contactLists: ContactList[];
  notifications: NotificationItem[];
}

export interface StartAnsitzPayload {
  revierId: string;
  membershipId: string;
  standortId?: string;
  standortName: string;
  location: GeoPoint;
  startedAt: string;
  plannedEndAt?: string;
  note?: string;
}

export interface EndAnsitzPayload {
  endedAt: string;
}

export interface CreateFallwildPayload {
  revierId: string;
  reportedByMembershipId: string;
  recordedAt: string;
  location: GeoPoint;
  wildart: Wildart;
  geschlecht: Geschlecht;
  altersklasse: Altersklasse;
  gemeinde: string;
  strasse?: string;
  roadReference?: FallwildRoadReference;
  bergungsStatus: BergungsStatus;
  note?: string;
}

export interface CreateReviermeldungPayload {
  revierId: string;
  createdByMembershipId: string;
  category: ReviermeldungKategorie;
  status?: ReviermeldungStatus;
  occurredAt: string;
  title: string;
  description?: string;
  location?: GeoPoint;
  relatedType?: RevierResourceType;
  relatedId?: string;
}

export interface CreateAufgabePayload {
  revierId: string;
  createdByMembershipId: string;
  sourceType?: RevierResourceType;
  sourceId?: string;
  title: string;
  description?: string;
  status?: AufgabeStatus;
  priority?: AufgabePrioritaet;
  dueAt?: string;
  assigneeMembershipIds?: string[];
}

export interface AddKontrollePayload {
  zustand: EinrichtungZustand;
  createdAt: string;
  createdByMembershipId: string;
  note?: string;
}

export interface LoginPayload {
  identifier: string;
  pin: string;
  membershipId?: string;
}

export interface ChangePinPayload {
  currentPin: string;
  newPin: string;
}

export interface RefreshSessionPayload {
  refreshToken?: string;
  membershipId?: string;
}

export interface PublicRegistrationPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  pin: string;
  jagdzeichen: string;
  revierName: string;
  bundesland: string;
  bezirk: string;
  planKey: Exclude<PublicPlanKey, "organisation">;
}

export interface CompleteRevierSetupPayload {
  revierName: string;
  bundesland: string;
  bezirk: string;
  flaecheHektar: number;
}

export type MemberInvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface MemberInvitation {
  id: string;
  revierId: string;
  invitedByMembershipId: string;
  invitedByName?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: Role;
  jagdzeichen: string;
  status: MemberInvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  mailSentAt?: string;
}

export interface CreateMemberInvitationPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: Role;
  jagdzeichen: string;
  sendEmail?: boolean;
}

export interface CreateMemberInvitationResponse {
  invitation: MemberInvitation;
  /** Klartext-Code, der dem Eingeladenen mitgeteilt werden soll. Wird nur einmalig zurueckgegeben. */
  code: string;
  /** Klartext-Token fuer den Magic-Link. Wird nur einmalig zurueckgegeben. */
  token: string;
  /** True, wenn die Mail tatsaechlich versendet wurde (nur wenn Mail-Provider aktiv und sendEmail=true). */
  mailSent: boolean;
}

export interface AcceptInvitationPayload {
  /** Entweder code (vom Admin uebermittelt) oder token (aus Magic-Link). Genau eins davon. */
  code?: string;
  token?: string;
  pin: string;
  /** Optional ueberschreibbar, falls der Eingeladene seine Daten korrigieren will. */
  username?: string;
  phone?: string;
}

export interface CreateContactListPayload {
  title: string;
}

export interface UpdateContactListPayload {
  title?: string;
}

export interface CreateContactEntryPayload {
  membershipId?: string;
  name?: string;
  phone?: string;
  revier?: string;
  funktion?: string;
  note?: string;
}

export interface UpdateContactEntryPayload {
  membershipId?: string | null;
  name?: string;
  phone?: string;
  revier?: string | null;
  funktion?: string | null;
  note?: string | null;
}
