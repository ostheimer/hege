import type { AuthContextResponse } from "@hege/domain";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as unknown as { React?: typeof React }).React = React;

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    className,
    href
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
  }) => React.createElement("a", { className, href }, children)
}));

import { Shell, isNavigationItemVisible } from "./shell";

const viewer: AuthContextResponse = {
  user: {
    id: "user-mair",
    name: "Martin Mair",
    phone: "+43 676 1002002",
    email: "martin.mair@hege.app"
  },
  membership: {
    id: "member-schrift",
    userId: "user-mair",
    revierId: "revier-attersee",
    role: "schriftfuehrer",
    jagdzeichen: "MM-04",
    pushEnabled: true
  },
  revier: {
    id: "revier-attersee",
    tenantKey: "attersee-nord",
    name: "Jagdgesellschaft Attersee Nord",
    bundesland: "Oberösterreich",
    bezirk: "Vöcklabruck",
    flaecheHektar: 1480,
    zentrum: {
      lat: 47.9134,
      lng: 13.5251,
      label: "Attersee Nord"
    }
  },
  activeRevierId: "revier-attersee",
  setupRequired: false,
  availableMemberships: []
};

describe("Shell", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUsePathname.mockReturnValue("/");
  });

  it("renders a logout action for authenticated users", () => {
    const html = renderToStaticMarkup(
      React.createElement(Shell, {
        viewer,
        children: React.createElement("div", null, "Dashboard")
      })
    );

    expect(html).toContain("Abmelden");
  });

  it("hides the Sitzungen link for roles that may not access /app/sitzungen", () => {
    const ausgeherViewer: AuthContextResponse = {
      ...viewer,
      membership: { ...viewer.membership, id: "member-ausgeher", role: "ausgeher", jagdzeichen: "AO-01" }
    };

    const html = renderToStaticMarkup(
      React.createElement(Shell, {
        viewer: ausgeherViewer,
        children: React.createElement("div", null, "Dashboard")
      })
    );

    expect(html).not.toContain('href="/app/sitzungen"');
    expect(html).toContain('href="/app/ansitze"');
    expect(html).toContain('href="/app/fallwild"');
  });

  it("shows the Sitzungen link for schriftfuehrer", () => {
    const html = renderToStaticMarkup(
      React.createElement(Shell, {
        viewer,
        children: React.createElement("div", null, "Dashboard")
      })
    );

    expect(html).toContain('href="/app/sitzungen"');
  });

  it("shows platform user management only to platform admins", () => {
    const platformViewer: AuthContextResponse = {
      ...viewer,
      membership: { ...viewer.membership, role: "platform-admin" }
    };
    const platformHtml = renderToStaticMarkup(
      React.createElement(Shell, { viewer: platformViewer, children: "Dashboard" })
    );
    const revierAdminHtml = renderToStaticMarkup(
      React.createElement(Shell, {
        viewer: { ...viewer, membership: { ...viewer.membership, role: "revier-admin" } },
        children: "Dashboard"
      })
    );

    expect(platformHtml).toContain('href="/app/benutzer"');
    expect(revierAdminHtml).not.toContain('href="/app/benutzer"');
  });

  it("keeps a visible stop action while impersonating", () => {
    const html = renderToStaticMarkup(
      React.createElement(Shell, {
        viewer: {
          ...viewer,
          impersonation: {
            sessionId: "imp-1",
            startedAt: "2026-07-21T14:00:00.000Z",
            actor: { ...viewer.user, id: "actor-1", name: "Andreas Ostheimer" }
          }
        },
        children: "Dashboard"
      })
    );

    expect(html).toContain("Impersonation aktiv");
    expect(html).toContain("Zurück zu Andreas Ostheimer");
  });
});

describe("isNavigationItemVisible", () => {
  it("returns true when no allowedRoles are configured", () => {
    expect(isNavigationItemVisible({}, "ausgeher")).toBe(true);
    expect(isNavigationItemVisible({}, null)).toBe(true);
  });

  it("returns false when the role is not in the allowed list", () => {
    const item = { allowedRoles: ["schriftfuehrer", "revier-admin"] as const };
    expect(isNavigationItemVisible(item, "ausgeher")).toBe(false);
    expect(isNavigationItemVisible(item, "jaeger")).toBe(false);
  });

  it("returns true when the role is in the allowed list", () => {
    const item = { allowedRoles: ["schriftfuehrer", "revier-admin"] as const };
    expect(isNavigationItemVisible(item, "schriftfuehrer")).toBe(true);
    expect(isNavigationItemVisible(item, "revier-admin")).toBe(true);
  });

  it("hides items with allowedRoles when no role is provided", () => {
    const item = { allowedRoles: ["revier-admin"] as const };
    expect(isNavigationItemVisible(item, null)).toBe(false);
    expect(isNavigationItemVisible(item, undefined)).toBe(false);
  });
});
