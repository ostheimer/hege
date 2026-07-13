import type { EinrichtungTyp } from "@hege/domain";

export const EINRICHTUNG_TYP_OPTIONS = [
  { value: "hochstand", label: "Hochstand" },
  { value: "kanzel", label: "Kanzel" },
  { value: "ansitzleiter", label: "Ansitzleiter" },
  { value: "drueckjagdbock", label: "Drückjagdbock" },
  { value: "bodenstand", label: "Bodenstand" },
  { value: "fuetterung", label: "Fütterung" },
  { value: "salzlecke", label: "Salzlecke" },
  { value: "kirrung", label: "Kirrung" },
  { value: "kamera", label: "Wildkamera" },
  { value: "wildacker", label: "Wildacker" },
  { value: "wasserstelle", label: "Wasserstelle" },
  { value: "suhle", label: "Suhle" },
  { value: "jagdhuette", label: "Jagdhütte" },
  { value: "wildzaun", label: "Wildzaun" },
  { value: "schranke", label: "Schranke" },
  { value: "jagdsteig", label: "Jagdsteig" },
  { value: "wildrettungspunkt", label: "Wildrettungspunkt" }
] as const satisfies ReadonlyArray<{ value: EinrichtungTyp; label: string }>;

const ANSITZ_TYPEN = new Set<EinrichtungTyp>([
  "hochstand",
  "kanzel",
  "ansitzleiter",
  "drueckjagdbock",
  "bodenstand"
]);

const FUETTERUNGS_TYPEN = new Set<EinrichtungTyp>([
  "fuetterung",
  "salzlecke",
  "kirrung"
]);

export function formatEinrichtungTyp(type: EinrichtungTyp): string {
  return EINRICHTUNG_TYP_OPTIONS.find((entry) => entry.value === type)?.label ?? type;
}

export function isAnsitzeinrichtung(type: EinrichtungTyp): boolean {
  return ANSITZ_TYPEN.has(type);
}

export function isFuetterungseinrichtung(type: EinrichtungTyp): boolean {
  return FUETTERUNGS_TYPEN.has(type);
}

export function supportsOrientation(type: EinrichtungTyp): boolean {
  return isAnsitzeinrichtung(type) || type === "kamera";
}

export function normalizeDirectionDegrees(value: number): number {
  return Math.round(((value % 360) + 360) % 360);
}

export function formatDirection(value: number): string {
  const degrees = normalizeDirectionDegrees(value);
  return `${formatCardinalDirection(degrees)} · ${degrees}°`;
}

export function formatWindDirection(value: number): string {
  const degrees = normalizeDirectionDegrees(value);
  return `aus ${formatCardinalDirection(degrees)} (${degrees}°)`;
}

export function formatCardinalDirection(value: number): string {
  const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"] as const;
  return directions[Math.round(normalizeDirectionDegrees(value) / 45) % directions.length]!;
}
