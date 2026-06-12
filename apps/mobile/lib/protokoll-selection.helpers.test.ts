import { describe, expect, it } from "vitest";

import { resolveSelectedProtokollId } from "./protokoll-selection.helpers";

describe("resolveSelectedProtokollId", () => {
  it("liefert null fuer eine leere Protokoll-Liste", () => {
    expect(resolveSelectedProtokollId([], "alt")).toBeNull();
  });

  it("behaelt die aktuelle Auswahl, wenn sie nach dem Refresh noch existiert", () => {
    expect(resolveSelectedProtokollId([{ id: "neu" }, { id: "aktuell" }], "aktuell")).toBe(
      "aktuell"
    );
  });

  it("faellt auf den ersten Eintrag zurueck, wenn die alte Auswahl verschwunden ist", () => {
    expect(resolveSelectedProtokollId([{ id: "neu" }, { id: "zweit" }], "geloescht")).toBe(
      "neu"
    );
  });
});
