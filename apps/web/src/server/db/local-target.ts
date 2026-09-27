/** Fail-closed: lokale Verwaltungsbefehle dürfen nie Neon/Produktion treffen. */
export function assertLocalDatabaseTarget(value: string, options: { allowE2e?: boolean } = {}) {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "15432" || !(url.pathname === "/hege" || (options.allowE2e && /^\/hege_e2e_[0-9]+$/.test(url.pathname)))) {
    throw new Error("Dieser Befehl ist ausschließlich für die lokale Hege-Datenbank auf 127.0.0.1:15432/hege erlaubt.");
  }
}
