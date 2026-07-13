import type { Role } from "./types";

const ALL_REVIER_ROLES = [
  "ausgeher",
  "jaeger",
  "schriftfuehrer",
  "revier-admin",
  "platform-admin"
] as const satisfies readonly Role[];

const MANAGEMENT_ROLES = [
  "schriftfuehrer",
  "revier-admin",
  "platform-admin"
] as const satisfies readonly Role[];

const FIELD_EDITOR_ROLES = [
  "jaeger",
  "schriftfuehrer",
  "revier-admin",
  "platform-admin"
] as const satisfies readonly Role[];

export const ROLE_FEATURES = {
  "contacts-read": ALL_REVIER_ROLES,
  "contacts-manage": MANAGEMENT_ROLES,
  "fallwild-read": ALL_REVIER_ROLES,
  "fallwild-create": ALL_REVIER_ROLES,
  "fallwild-manage": MANAGEMENT_ROLES,
  "reviereinrichtungen-read": ALL_REVIER_ROLES,
  "reviereinrichtungen-create": FIELD_EDITOR_ROLES,
  "reviereinrichtungen-manage": MANAGEMENT_ROLES,
  "revierarbeit-read": ALL_REVIER_ROLES,
  "revierarbeit-manage": MANAGEMENT_ROLES,
  "sitzungen-manage": MANAGEMENT_ROLES,
  "sitzungen-approve": ["revier-admin", "platform-admin"],
  "members-manage": ["revier-admin", "platform-admin"]
} as const satisfies Record<string, readonly Role[]>;

export type RoleFeature = keyof typeof ROLE_FEATURES;

export function rolesForFeature<TFeature extends RoleFeature>(
  feature: TFeature
): (typeof ROLE_FEATURES)[TFeature] {
  return ROLE_FEATURES[feature];
}

export function canRoleAccess(role: Role, feature: RoleFeature): boolean {
  return (ROLE_FEATURES[feature] as readonly Role[]).includes(role);
}
