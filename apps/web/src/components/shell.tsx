"use client";

import { rolesForFeature, type AuthContextResponse, type Role } from "@hege/domain";
import {
  Ansitz,
  Fallwild,
  Mitglied,
  Protokoll,
  Reviereinrichtung,
  Sitzung
} from "@hege/icons";
import { Bell, ContactRound, LayoutDashboard, ListTodo, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  countUnread,
  getReadNotificationIds,
  subscribeReadIds
} from "../lib/notifications-read-state";
import { formatRoleLabel } from "../lib/labels";

/**
 * Sidebar-Icons stammen entweder aus `@hege/icons` (Domain-Icons) oder aus
 * `lucide-react` (Dashboard etc.). Beide akzeptieren `size`/`strokeWidth`
 * und rendern ein SVG. Wir verzichten auf `FunctionComponent`/`ComponentType`
 * an dieser Stelle — die generischen React-Component-Typen vergleichen
 * `ReactNode` ueber Workspace-Grenzen hinweg, was bei pnpm-Hoisting in
 * diesem Repo zu False-Positives fuehrt. Ein simpler Funktionstyp ist
 * praezise genug fuer die wenigen Props, die wir uebergeben.
 */
interface NavigationIconProps {
  size?: number | string;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}
type NavigationIcon = (props: NavigationIconProps) => React.ReactNode;

interface NavigationItem {
  href: string;
  label: string;
  icon: NavigationIcon;
  allowedRoles?: ReadonlyArray<Role>;
}

const navigation: ReadonlyArray<NavigationItem> = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/app/sitzungen",
    label: "Sitzungen",
    icon: Sitzung,
    allowedRoles: rolesForFeature("sitzungen-manage")
  },
  { href: "/app/ansitze", label: "Ansitze", icon: Ansitz },
  { href: "/app/aufgaben", label: "Aufgaben", icon: ListTodo },
  { href: "/app/reviermeldungen", label: "Reviermeldungen", icon: MessageSquareWarning },
  { href: "/app/reviereinrichtungen", label: "Reviereinrichtungen", icon: Reviereinrichtung },
  { href: "/app/fallwild", label: "Fallwild", icon: Fallwild },
  { href: "/app/protokolle", label: "Protokolle", icon: Protokoll },
  { href: "/app/kontakte", label: "Kontakte", icon: ContactRound },
  {
    href: "/app/mitglieder",
    label: "Mitglieder",
    icon: Mitglied,
    allowedRoles: rolesForFeature("members-manage")
  },
  { href: "/app/benachrichtigungen", label: "Benachrichtigungen", icon: Bell }
];

export function isNavigationItemVisible(
  item: { allowedRoles?: ReadonlyArray<Role> },
  role: Role | null | undefined
): boolean {
  if (!item.allowedRoles) {
    return true;
  }

  if (!role) {
    return false;
  }

  return item.allowedRoles.includes(role);
}

interface ShellProps {
  children?: React.ReactNode;
  viewer?: AuthContextResponse | null;
  /**
   * IDs der letzten Benachrichtigungen aus dem Dashboard-Snapshot.
   * Wird vom Layout server-seitig befuellt; das Sidebar-Badge berechnet
   * daraus + localStorage-Read-State den Unread-Count.
   */
  notificationIds?: ReadonlyArray<string>;
}

export function Shell({ children, viewer, notificationIds }: ShellProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const isAuthPage = currentPath === "/login";
  const [readIds, setReadIds] = useState<ReadonlyArray<string>>([]);

  useEffect(() => {
    // Erst nach Mount, weil getReadNotificationIds auf localStorage
    // zugreift und SSR sonst Hydration-Diffs erzeugt.
    setReadIds(getReadNotificationIds());
    return subscribeReadIds((next) => setReadIds(next));
  }, []);

  const unreadNotificationCount = notificationIds ? countUnread(notificationIds, readIds) : 0;

  if (isAuthPage) {
    return <main className="auth-layout">{children}</main>;
  }

  const visibleNavigation = navigation.filter((item) => isNavigationItemVisible(item, viewer?.membership.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/app" className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <img className="brand-logo-image" src="/brand/hege-logo-mark.png" alt="" />
          </div>
          <div>
            <p className="eyebrow">Reviermanagement</p>
            <h1>hege</h1>
          </div>
        </Link>

        <nav className="nav-list" aria-label="Hauptnavigation">
          {visibleNavigation.map((item) => {
            const active =
              currentPath === item.href ||
              (item.href !== "/app" && currentPath.startsWith(`${item.href}/`));
            const Icon = item.icon;
            const showBadge =
              item.href === "/app/benachrichtigungen" && unreadNotificationCount > 0;
            const badgeLabel = unreadNotificationCount > 9 ? "9+" : `${unreadNotificationCount}`;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link nav-link-active" : "nav-link"}
                aria-label={
                  showBadge ? `${item.label}, ${unreadNotificationCount} ungelesen` : undefined
                }
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {showBadge ? (
                  <span aria-hidden="true" className="nav-link-badge">
                    {badgeLabel}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">Betrieb</p>
          <strong>{viewer?.revier.name ?? "Kein Revier aktiv"}</strong>
          <span>
            {viewer ? `${viewer.revier.flaecheHektar} ha | ${viewer.revier.bundesland}` : "Bitte anmelden."}
          </span>
          <span>
            {viewer
              ? `${viewer.user.name} | ${formatRoleLabel(viewer.membership.role)} | ${viewer.membership.jagdzeichen}`
              : "Ansitze, Fallwild und Protokolle in einem System."}
          </span>
        </div>

        {viewer ? (
          <form action="/api/v1/auth/logout" className="sidebar-actions" method="post">
            <button className="button-control sidebar-logout" type="submit">
              Abmelden
            </button>
          </form>
        ) : null}
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
