import type { DashboardResponse, EinrichtungZustand } from "@hege/domain";
import { parseApiTimestamp } from "./api-timestamp";

const dateTimeFormatter = new Intl.DateTimeFormat("de-AT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const timeFormatter = new Intl.DateTimeFormat("de-AT", {
  hour: "2-digit",
  minute: "2-digit"
});

export function formatDateTime(value: string) {
  const date = parseDate(value);

  return date ? dateTimeFormatter.format(date) : "Nicht verfügbar";
}

export function formatTime(value: string) {
  const date = parseDate(value);

  return date ? timeFormatter.format(date) : "Nicht verfügbar";
}

function parseDate(value: string) {
  return parseApiTimestamp(value);
}

/**
 * Formatiert eine API-Fehlermeldung für StateView-Descriptions: erste
 * Zeile ist die rohe Fehlermeldung mit garantiertem Satzzeichen am
 * Ende, dann eine Leerzeile, dann der Aktualisieren-Hint. Ohne das
 * Trim/Period laeuft "Network request failed" naht­los in "Tippe auf
 * …" hinein und liest sich als ein einziger Satz.
 */
export function formatApiErrorDescription(error: string): string {
  // Trailing Whitespace, Satzzeichen (.!?), Auslassungspunkte (… und ...)
  // alle abschneiden — wir normalisieren auf einen einheitlichen Punkt.
  const cleaned = error.trim().replace(/(?:\.{3}|[.!?…])+$/, "");
  return `${cleaned}.\n\nTippe auf „Aktualisieren", sobald die Verbindung wieder steht.`;
}

/**
 * Extrahiert den Vornamen aus einem vollen Namen ("Andreas Ostheimer"
 * → "Andreas"). Fallback auf den ganzen String, wenn nur ein Token da
 * ist oder der Input nach dem Trim leer wird.
 *
 * Wird im Heute-Tab fuer die Begruessung verwendet
 * ('Weidmannsheil Andreas!'). Bewusst kein Capitalize-Fix — wir
 * vertrauen darauf, dass die User-Daten korrekt eingegeben sind, sonst
 * sehen wir das Problem als Bug im Onboarding.
 */
export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length === 0) {
    return fullName;
  }
  const [first] = trimmed.split(/\s+/);
  return first ?? trimmed;
}

/**
 * Deutsches Anzeige-Label fuer Mitgliedschafts-Rollen (Mehr-Zeile +
 * Profil-Screen). Unbekannte Rollen fallen auf den Rohwert zurueck,
 * damit neue Backend-Rollen nicht als leerer String enden.
 */
export function formatRoleLabel(role: DashboardResponse["membership"]["role"]): string {
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
      return "Plattform-Admin";
    default:
      return role;
  }
}

/**
 * Deutsches Anzeige-Label fuer den Einrichtungs-Zustand (F-07).
 * Genutzt in Listenkarten, Pin-Subtitles und dem Pin-Detail-Sheet,
 * damit nirgends der rohe Identifier ("wartung-faellig") erscheint.
 */
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
