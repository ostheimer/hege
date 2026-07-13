import type { EinrichtungTyp, EinrichtungZustand, Role } from "@hege/domain";

/**
 * Geteilte deutsche UI-Labels fuer Domain-Identifier (F-06/F-07).
 *
 * Ersetzt die zuvor dreifach duplizierten `formatRoleLabel`-Kopien
 * (shell, kontakte, mitglieder) und die rohen Identifier-Ausgaben
 * ("schriftfuehrer", "wartung-faellig") in Listen und Pills.
 * Mobile-Pendant: `apps/mobile/lib/format.ts`.
 */

// `Role | (string & {})` statt nur `Role`: Teilnehmer-/Membership-Summaries
// aus @hege/domain fuehren role als plain string; unbekannte Werte fallen
// bewusst auf den Rohwert zurueck.
export function formatRoleLabel(role: Role | (string & {})): string {
  switch (role) {
    case "revier-admin":
      return "Admin";
    case "schriftfuehrer":
      return "Schriftführung";
    case "jaeger":
      return "Jäger";
    case "ausgeher":
      return "Ausgeher";
    case "platform-admin":
      return "Plattform";
    default:
      return role;
  }
}

export function formatEinrichtungZustand(zustand: EinrichtungZustand): string {
  switch (zustand) {
    case "gut":
      return "Gut";
    case "wartung-faellig":
      return "Wartung fällig";
    case "gesperrt":
      return "Gesperrt";
    default:
      return zustand;
  }
}

export function formatEinrichtungTyp(type: EinrichtungTyp): string {
  const labels: Record<EinrichtungTyp, string> = {
    hochstand: "Hochstand",
    kanzel: "Kanzel",
    ansitzleiter: "Ansitzleiter",
    drueckjagdbock: "Drückjagdbock",
    bodenstand: "Bodenstand",
    fuetterung: "Fütterung",
    salzlecke: "Salzlecke",
    kirrung: "Kirrung",
    kamera: "Wildkamera",
    wildacker: "Wildacker",
    wasserstelle: "Wasserstelle",
    suhle: "Suhle",
    jagdhuette: "Jagdhütte",
    wildzaun: "Wildzaun",
    schranke: "Schranke",
    jagdsteig: "Jagdsteig",
    wildrettungspunkt: "Wildrettungspunkt"
  };

  return labels[type];
}
