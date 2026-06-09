import { describe, expect, it } from "vitest";

import { getInitials } from "./initials";

describe("getInitials", () => {
  it("nimmt die Anfangsbuchstaben von Vor- und Nachname", () => {
    expect(getInitials("Andreas Ostheimer")).toBe("AO");
  });

  it("nutzt bei Mittelnamen den letzten Namensteil", () => {
    expect(getInitials("Anna Maria Huber")).toBe("AH");
  });

  it("liefert bei einem einzelnen Wort nur einen Buchstaben", () => {
    expect(getInitials("Andreas")).toBe("A");
  });

  it("faellt bei leerem/Whitespace-Namen auf ? zurueck", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
  });

  it("uppercased Umlaute korrekt", () => {
    expect(getInitials("ärger über")).toBe("ÄÜ");
  });
});
