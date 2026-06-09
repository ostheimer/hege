/**
 * Initialen fuer den Avatar-Kreis (Profil, Mehr-Zeile, Heute-Hero).
 * Nimmt die Anfangsbuchstaben der ersten beiden Woerter; bei einem
 * Wort nur dessen ersten Buchstaben. Leere/Whitespace-Namen ergeben
 * "?" statt eines leeren Kreises.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";

  return (first + second).toLocaleUpperCase("de-AT") || "?";
}
