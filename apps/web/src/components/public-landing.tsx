import { Mitglied, Protokoll, Reviereinrichtung, Sitzung } from "@hege/icons";
import { CloudOff, LayoutDashboard, Minus, MonitorSmartphone, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PUBLIC_PRICING_PLANS } from "../lib/public-site";
import { PublicShowcase } from "./public-showcase";

const features = [
  {
    title: "Revierbetrieb auf einer Linie",
    text: "Ansitze, Einrichtungen, Fallwild und Protokolle greifen auf dieselbe Revierbasis zu.",
    Icon: Reviereinrichtung
  },
  {
    title: "Freigaben ohne Medienbruch",
    text: "Sitzungen, Versionen, Freigaben und Dokument-Download bleiben in einem klaren Arbeitsfluss.",
    Icon: Protokoll
  },
  {
    title: "Backoffice und App zusammen",
    text: "Web für Leitung und Schriftführung, App für Jagdteam und Meldungen aus dem Feld.",
    Icon: MonitorSmartphone
  },
  {
    title: "Offline zuerst gedacht",
    text: "Ansitz- und Fallwild-Einträge können unterwegs vorgemerkt und später synchronisiert werden.",
    Icon: CloudOff
  }
] as const;

const useCases = [
  {
    eyebrow: "Revierleitung",
    title: "Schneller Überblick statt verstreuter Tabellen",
    text: "Offene Wartungen, aktive Ansitze und aktuelle Meldungen stehen ohne Wechsel zwischen Werkzeugen bereit.",
    Icon: LayoutDashboard
  },
  {
    eyebrow: "Schriftführung",
    title: "Sitzungen bis zur Freigabe sauber führen",
    text: "Agenda, Beschlüsse, Versionen und PDF-Download folgen einem nachvollziehbaren Ablauf.",
    Icon: Sitzung
  },
  {
    eyebrow: "Jagdteam",
    title: "Weniger Tippen, mehr Feldarbeit",
    text: "Ansitz und Fallwild lassen sich direkt erfassen, auch wenn die Verbindung nicht perfekt ist.",
    Icon: Mitglied
  }
] as const;

const faq = [
  {
    q: "Ist hege nur für das Backoffice gedacht?",
    a: "Nein. hege verbindet das interne Reviermanagement im Web mit der mobilen Erfassung draußen. Die App funktioniert auch offline und synchronisiert, sobald wieder Verbindung besteht."
  },
  {
    q: "Was kostet der Einstieg?",
    a: "Die Preisstufen sind vorbereitet. Starter und Revier sind Self-Serve, Organisation bleibt als Kontaktpaket."
  },
  {
    q: "Brauche ich zuerst eine komplexe Einrichtung?",
    a: "Nein. Der Einstieg ist bewusst schmal gehalten. Ein Revier kann schnell angelegt und im Setup vervollständigt werden."
  },
  {
    q: "Funktioniert die App auch unterwegs?",
    a: "Ja. Die mobilen Kernabläufe sind auf kurze Erfassung, Offline-Vormerkung und spätere Synchronisierung ausgelegt."
  }
] as const;

export function PublicLanding() {
  return (
    <main className="public-landing">
      <div className="public-landing-shell">
        <header className="public-topbar">
          <Link className="public-brand" href="/" aria-label="hege.app Startseite">
            <span className="public-brand-mark" aria-hidden="true">
              <Image
                className="brand-logo-image"
                src="/brand/hege-logo-mark.png"
                alt=""
                width={48}
                height={48}
                priority
              />
            </span>
            <span>
              <strong>hege.app</strong>
              <span className="eyebrow">Reviermanagement</span>
            </span>
          </Link>

          <nav className="public-topbar-nav" aria-label="Hauptnavigation">
            <Link href="#produkt">Produkt</Link>
            <Link href="#rollen">Für Reviere</Link>
            <Link href="#preise">Preise</Link>
          </nav>

          <nav className="public-topbar-actions" aria-label="Schnellzugriff">
            <Link className="button-control button-control-secondary" href="/login">
              Anmelden
            </Link>
            <Link className="button-control" href="/registrieren?plan=revier">
              Revier starten
            </Link>
          </nav>

          <details className="public-mobile-menu">
            <summary aria-label="Menü öffnen">
              <span className="public-mobile-menu-line" />
              <span className="public-mobile-menu-line" />
              <span className="public-mobile-menu-line" />
            </summary>
            <nav className="public-mobile-menu-panel" aria-label="Mobile Navigation">
              <Link href="#produkt">Produkt</Link>
              <Link href="#rollen">Für Reviere</Link>
              <Link href="#preise">Preise</Link>
              <Link href="/login">Anmelden</Link>
              <Link href="/registrieren?plan=revier">Revier starten</Link>
            </nav>
          </details>
        </header>

        <section className="public-hero">
          <Image
            className="public-hero-image"
            src="/landing/noe-hero-hochstand.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <div className="public-hero-overlay" aria-hidden="true" />
          <div className="public-hero-copy">
            <p className="eyebrow">Revierdigitalisierung</p>
            <h1>
              <span>Das Revier. </span>
              <span>Gemeinsam </span>
              <span>im Blick.</span>
            </h1>
            <p className="public-hero-text">
              Die hege App für Android und iOS sowie die Webapp verbinden die Arbeit im Backoffice
              mit der Erfassung draußen. Für Jagdleitung, Schriftführung und Jagdteam, die ohne
              Tool-Wirrwarr arbeiten wollen.
            </p>

            <div className="public-hero-actions">
              <Link className="button-control" href="/registrieren?plan=revier">
                Revier starten
              </Link>
              <Link className="button-control button-control-secondary" href="/login">
                Anmelden
              </Link>
            </div>

            <ul className="public-proof-line" aria-label="Kurzfakten">
              <li>1 Datenbasis</li>
              <li>3 Rollen</li>
              <li>Offline-Fokus</li>
            </ul>

            <p className="public-hero-proof">
              Für Jagdgesellschaften in Österreich –
              <strong> einfacher Einstieg, klare Rollen, saubere Datenbasis.</strong>
            </p>
          </div>
        </section>

        <PublicShowcase />

        <section className="public-image-band" aria-label="Revierstimmung in Niederösterreich">
          <Image
            className="public-image-band-photo"
            src="/landing/noe-rehwild-waldrand.jpg"
            alt=""
            fill
            sizes="100vw"
          />
        </section>

        <section className="public-section public-section-benefits" id="features">
          <div className="public-section-head public-section-head-centered">
            <p className="eyebrow">Nutzen</p>
            <h2>Warum hege im Alltag weniger Reibung erzeugt.</h2>
          </div>

          <div className="public-feature-grid">
            {features.map(({ title, text, Icon }) => (
              <article key={title} className="public-feature-card">
                <span className="public-editorial-icon" aria-hidden="true">
                  <Icon size={28} strokeWidth={1.5} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section public-section-roles" id="rollen">
          <div className="public-section-head public-section-head-centered">
            <p className="eyebrow">Rollen</p>
            <h2>Jeder sieht, was er wirklich braucht.</h2>
          </div>

          <div className="public-usecase-grid">
            {useCases.map(({ eyebrow, title, text, Icon }) => (
              <article key={title} className="public-usecase-card">
                <span className="public-editorial-icon" aria-hidden="true">
                  <Icon size={28} strokeWidth={1.5} />
                </span>
                <div>
                  <span className="public-item-eyebrow">{eyebrow}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section public-section-pricing" id="preise">
          <div className="public-section-head public-section-head-row">
            <div>
              <p className="eyebrow">Preise</p>
              <h2>Transparente Pakete mit klarem Einstieg.</h2>
            </div>
            <p className="public-section-note">
              Starter und Revier sind Self-Serve. Organisation ist als begleitetes Paket gedacht.
            </p>
          </div>

          <div className="public-pricing-grid">
            {PUBLIC_PRICING_PLANS.map((plan) => (
              <article key={plan.key} className="public-pricing-card">
                <div className="public-pricing-head">
                  <div>
                    <h3>{plan.name}</h3>
                    <p className="public-pricing-audience">{plan.audience}</p>
                  </div>
                  <div className="public-price">{plan.priceLabel}</div>
                </div>

                <p className="public-pricing-text">{plan.description}</p>

                <ul className="public-bullet-list">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>

                <div className="public-pricing-actions">
                  <Link className="button-control" href={plan.ctaHref}>
                    {plan.ctaLabel}
                  </Link>
                  {plan.isSelfServe ? (
                    <Link className="public-text-link" href="/login">
                      Bereits Kunde? Anmelden
                    </Link>
                  ) : (
                    <a className="public-text-link" href="mailto:info@hege.app">
                      Kurz anfragen
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section public-section-faq">
          <div className="public-section-head">
            <p className="eyebrow">FAQ</p>
            <h2>Die wichtigsten Fragen auf einen Blick.</h2>
          </div>

          <div className="public-faq-grid">
            {faq.map((entry, index) => (
              <details key={entry.q} className="public-faq-card" open={index === 0}>
                <summary>
                  <span>{entry.q}</span>
                  <span className="public-faq-icon" aria-hidden="true">
                    <Plus className="public-faq-icon-plus" size={19} />
                    <Minus className="public-faq-icon-minus" size={19} />
                  </span>
                </summary>
                <p>{entry.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="public-cta-band">
          <Image
            className="public-cta-image"
            src="/landing/noe-revierarbeit-cta.jpg"
            alt=""
            fill
            sizes="100vw"
          />
          <div className="public-cta-overlay" aria-hidden="true" />
          <div>
            <p className="eyebrow">Nächster Schritt</p>
            <h2>hege für dein Revier starten oder direkt einsteigen.</h2>
          </div>
          <div className="public-cta-actions">
            <Link className="button-control" href="/login">
              Anmelden
            </Link>
            <Link className="button-control button-control-secondary" href="#preise">
              Registrierung wählen
            </Link>
          </div>
        </section>

        <footer className="public-footer">
          <div className="public-footer-main">
            <div className="public-footer-brand">
              <div className="public-footer-brand-lockup">
                <span className="public-footer-mark" aria-hidden="true">
                  <Image src="/brand/hege-logo-mark.png" alt="" width={42} height={42} />
                </span>
                <strong>hege.app</strong>
              </div>
              <p>Reviermanagement für Jagdgesellschaften in Österreich</p>
              <a href="mailto:info@hege.app">info@hege.app</a>
            </div>

            <nav className="public-footer-nav" aria-label="Footer-Navigation">
              <div>
                <strong>Produkt</strong>
                <Link href="#web-backend">Web-Backend</Link>
                <Link href="#mobile-app">Mobile App</Link>
                <Link href="#preise">Preise</Link>
              </div>
              <div>
                <strong>Für Reviere</strong>
                <Link href="/registrieren?plan=starter">Starter</Link>
                <Link href="/registrieren?plan=revier">Revier</Link>
                <a href="mailto:info@hege.app?subject=hege%20Organisation">Organisation</a>
              </div>
              <div>
                <strong>Einstieg</strong>
                <Link href="/login">Anmelden</Link>
                <Link href="#preise">Registrierung</Link>
              </div>
            </nav>
          </div>

          <div className="public-footer-bottom">
            <span>© 2026 hege.app</span>
            <span>Produkt für Reviermanagement in Österreich</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
