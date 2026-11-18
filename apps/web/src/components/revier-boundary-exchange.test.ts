import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RevierBoundaryEditor } from "./revier-boundary-editor";
vi.stubGlobal("React", React);

describe("Kartenaustausch im Editor", () => {
  it("bietet Verwaltern Dateiimport, Export und eine auffindbare Anleitung", () => {
    const html = renderToStaticMarkup(React.createElement(RevierBoundaryEditor, {
      owner: "synthetic", canEdit: true, center: { lat: 48, lng: 16 },
    }));
    expect(html).toContain("KML/KMZ importieren");
    expect(html).toContain("Gespeicherte Karte als KML exportieren");
    expect(html).toContain("Anleitung: Google My Maps");
  });
  it("bietet Lesern Export und Anleitung, aber keinen Dateiimport", () => {
    const html = renderToStaticMarkup(React.createElement(RevierBoundaryEditor, {
      owner: "synthetic", canEdit: false, center: { lat: 48, lng: 16 },
    }));
    expect(html).toContain("Gespeicherte Karte als KML exportieren");
    expect(html).toContain("Anleitung: Google My Maps");
    expect(html).not.toContain('type="file"');
  });
});
