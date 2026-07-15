import {
  Ansitz,
  Fallwild,
  Fuetterung,
  HegeWordmark,
  Hochstand,
  Mitglied,
  Protokoll,
  Reviereinrichtung,
  Sitzung
} from "@hege/icons";
import {
  CloudOff,
  CloudUpload,
  FileCheck2,
  LayoutDashboard,
  MapPin,
  MapPinned,
  RefreshCw,
  Smartphone,
  UsersRound
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * Live-gerenderte Produktvorschau fuer die oeffentliche Landing-Seite.
 * Alle Werte sind eingefrorene Beispieldaten und enthalten keine
 * Mandantendaten. Karten- und Revierbilder sind statische Marketing-Assets.
 */

interface SidebarItem {
  label: string;
  Icon: (props: { size?: number; strokeWidth?: number }) => React.ReactNode;
  active?: boolean;
}

const SIDEBAR_ITEMS: ReadonlyArray<SidebarItem> = [
  { label: "Dashboard", Icon: LayoutDashboard, active: true },
  { label: "Sitzungen", Icon: Sitzung },
  { label: "Ansitze", Icon: Ansitz },
  { label: "Reviereinrichtungen", Icon: Reviereinrichtung },
  { label: "Fallwild", Icon: Fallwild },
  { label: "Protokolle", Icon: Protokoll },
  { label: "Mitglieder", Icon: Mitglied }
];

const CAPABILITIES = [
  {
    title: "Dashboard für Revierleitung und Lagebild",
    Icon: LayoutDashboard
  },
  {
    title: "Sitzungen, Versionen, Freigaben und PDF-Download",
    Icon: Protokoll
  },
  {
    title: "Ansitze, Reviereinrichtungen und Fallwild",
    Icon: Reviereinrichtung
  },
  {
    title: "Mobile Erfassung mit Queue und Offline-Vormerkung",
    Icon: CloudUpload
  }
] as const;

const BACKOFFICE_POINTS = [
  { label: "Lagebild auf einen Blick", Icon: MapPinned },
  { label: "Klare Rollen und Freigaben", Icon: UsersRound },
  { label: "Saubere Dokumentation", Icon: FileCheck2 }
] as const;

const MOBILE_POINTS = [
  { label: "Für iOS und Android", Icon: Smartphone },
  { label: "Offline vorgemerkt", Icon: CloudOff },
  { label: "Später automatisch synchronisiert", Icon: RefreshCw }
] as const;

const METRICS = [
  { label: "Offene Wartungen", value: "3", trend: "−2 vs. Vorwoche" },
  { label: "Aktive Ansitze", value: "12", trend: "Jetzt im Revier" },
  { label: "Protokolle in Freigabe", value: "2", trend: "Versionen geprüft" }
] as const;

const MAP_PINS = [
  { x: 22, y: 34, label: "Hochstand" },
  { x: 58, y: 24, label: "Fütterung" },
  { x: 76, y: 58, label: "Hochstand" },
  { x: 40, y: 72, label: "Salzleck" },
  { x: 64, y: 76, label: "Ansitz" }
] as const;

interface MobileTile {
  label: string;
  Icon: (props: { size?: number; strokeWidth?: number; color?: string }) => React.ReactNode;
}

const MOBILE_TILES: ReadonlyArray<MobileTile> = [
  { label: "Ansitz starten", Icon: Ansitz },
  { label: "Fallwild melden", Icon: Fallwild },
  { label: "Hochstand", Icon: Hochstand },
  { label: "Fütterung", Icon: Fuetterung }
];

export function PublicShowcase() {
  return (
    <section className="public-showcase" id="produkt" aria-label="Produkt-Vorschau">
      <div className="public-showcase-intro">
        <div className="public-section-head public-section-head-centered">
          <p className="eyebrow">Backoffice und App</p>
          <h2>Eine Datenbasis, zwei Oberflächen.</h2>
          <p className="public-section-note public-section-note-left">
            Web für Revierleitung und Schriftführung, App fürs Jagdteam im Feld.
          </p>
        </div>

        <div className="public-capability-grid">
          {CAPABILITIES.map(({ title, Icon }) => (
            <article key={title} className="public-capability-item">
              <span aria-hidden="true">
                <Icon size={32} strokeWidth={1.45} />
              </span>
              <p>{title}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="public-backoffice-chapter" id="web-backend">
        <BackofficeMockup />
        <article className="public-product-copy">
          <p className="eyebrow">Web-Backend</p>
          <h2>Das Revier führen, ohne den Überblick zu verlieren.</h2>
          <p>
            Offene Aufgaben, aktive Ansitze und freizugebende Protokolle laufen in einer klaren
            Arbeitsoberfläche zusammen.
          </p>
          <ul className="public-product-points">
            {BACKOFFICE_POINTS.map(({ label, Icon }) => (
              <li key={label}>
                <span aria-hidden="true">
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <Link className="public-inline-link" href="/login">
            Web-Backend entdecken <span aria-hidden="true">→</span>
          </Link>
        </article>
      </div>

      <div className="public-mobile-chapter" id="mobile-app">
        <Image
          className="public-mobile-chapter-image"
          src="/landing/noe-rehwild-waldrand.jpg"
          alt=""
          fill
          sizes="100vw"
        />
        <div className="public-mobile-chapter-overlay" aria-hidden="true" />
        <article className="public-product-copy public-mobile-copy">
          <p className="eyebrow">Mobile App</p>
          <h2>Draußen erfassen. Im Team weiterarbeiten.</h2>
          <p>
            Kurze Wege im Revier: Meldungen und Ansitze direkt am Ort erfassen – auch bei schlechter
            Verbindung.
          </p>
          <ul className="public-product-points">
            {MOBILE_POINTS.map(({ label, Icon }) => (
              <li key={label}>
                <span aria-hidden="true">
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <Link className="public-inline-link" href="#rollen">
            App kennenlernen <span aria-hidden="true">→</span>
          </Link>
        </article>
        <MobileMockup />
      </div>
    </section>
  );
}

function BackofficeMockup() {
  return (
    <div
      className="public-mockup public-mockup-web"
      role="img"
      aria-label="Schematische Darstellung des hege Backoffice mit Seitenleiste, Kennzahlen und Reviergebiet"
    >
      <div className="public-mockup-chrome">
        <span className="public-mockup-dot" />
        <span className="public-mockup-dot" />
        <span className="public-mockup-dot" />
        <span className="public-mockup-url">app.hege / Dashboard</span>
      </div>

      <div className="public-mockup-body">
        <aside className="public-mockup-sidebar" aria-hidden="true">
          <div className="public-mockup-brand">
            <HegeWordmark size={22} color="#f5f1e7" />
          </div>
          <nav className="public-mockup-nav">
            {SIDEBAR_ITEMS.map((item) => (
              <span
                key={item.label}
                className={`public-mockup-nav-item${item.active ? " is-active" : ""}`}
              >
                <item.Icon size={16} strokeWidth={1.6} />
                <span>{item.label}</span>
              </span>
            ))}
          </nav>
          <div className="public-mockup-user">
            <span className="public-mockup-avatar">JG</span>
            <div>
              <strong>Jägerschaft</strong>
              <small>Revier-Admin</small>
            </div>
          </div>
        </aside>

        <div className="public-mockup-main">
          <div className="public-mockup-hero" aria-hidden="true">
            <div>
              <p className="eyebrow">Heute im Revier</p>
              <h3>3 offene Wartungen, 12 aktive Ansitze.</h3>
            </div>
            <span className="public-mockup-pill">Live</span>
          </div>

          <div className="public-mockup-metrics" aria-hidden="true">
            {METRICS.map((metric) => (
              <div key={metric.label} className="public-mockup-metric">
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                <span>{metric.trend}</span>
              </div>
            ))}
          </div>

          <div className="public-mockup-map" aria-hidden="true">
            <Image
              className="public-mockup-map-image"
              src="/landing/noe-revier-map.png"
              alt=""
              fill
              sizes="(max-width: 720px) 75vw, 760px"
            />
            {MAP_PINS.map((pin) => (
              <span
                key={`${pin.label}-${pin.x}-${pin.y}`}
                className="public-mockup-pin"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <MapPin size={22} strokeWidth={1.8} fill="#173328" />
              </span>
            ))}
            <div className="public-mockup-map-caption">
              <span className="eyebrow">Reviergebiet</span>
              <strong>5 Einrichtungen sichtbar</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMockup() {
  return (
    <div
      className="public-mockup public-mockup-mobile"
      role="img"
      aria-label="Schematische Darstellung des Heute-Tabs der hege App mit Schnellaktionen"
    >
      <div className="public-mockup-phone">
        <div className="public-mockup-phone-notch" aria-hidden="true" />
        <div className="public-mockup-phone-screen">
          <div className="public-mockup-phone-status" aria-hidden="true">
            <span>9:41</span>
            <span className="public-mockup-phone-status-icons">
              <span className="public-mockup-phone-status-bar" />
              <span className="public-mockup-phone-status-bar" />
              <span className="public-mockup-phone-status-battery" />
            </span>
          </div>

          <div className="public-mockup-phone-body">
            <div className="public-mockup-phone-eyebrow">
              <span className="eyebrow">Heute</span>
              <strong>Donnerstag</strong>
            </div>
            <h3 className="public-mockup-phone-title">Servus Andreas, was steht an?</h3>

            <div className="public-mockup-phone-card" aria-hidden="true">
              <div>
                <small>Nächster Ansitz</small>
                <strong>Hochstand 4 · 17:30</strong>
              </div>
              <span className="public-mockup-phone-pill">Vorgemerkt</span>
            </div>

            <div className="public-mockup-phone-grid" aria-hidden="true">
              {MOBILE_TILES.map((tile) => (
                <div key={tile.label} className="public-mockup-phone-tile">
                  <span className="public-mockup-phone-tile-icon">
                    <tile.Icon size={20} strokeWidth={1.6} color="currentColor" />
                  </span>
                  <span>{tile.label}</span>
                </div>
              ))}
            </div>

            <div className="public-mockup-phone-queue" aria-hidden="true">
              <span className="eyebrow">Queue</span>
              <strong>2 Einträge warten auf Sync</strong>
              <small>Wird beim nächsten Online-Status übertragen.</small>
            </div>
          </div>

          <div className="public-mockup-phone-tabbar" aria-hidden="true">
            <span className="public-mockup-phone-tab is-active">Heute</span>
            <span className="public-mockup-phone-tab">Ansitze</span>
            <span className="public-mockup-phone-tab">Fallwild</span>
            <span className="public-mockup-phone-tab">Mehr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
