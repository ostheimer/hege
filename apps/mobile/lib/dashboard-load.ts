/** Ein optionaler Historienabruf darf die ansonsten geladene Startseite nicht verwerfen. */
export async function loadDashboardContent<T, H>(loadSnapshot: () => Promise<T>, loadHistory: () => Promise<H>) {
  const [snapshot, historyResult] = await Promise.all([
    loadSnapshot(),
    loadHistory().then(history => ({ history, unavailable: false as const })).catch((error: unknown) => {
      const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
      if (status === 401 || status === 403) throw error;
      return { history: undefined, unavailable: true as const };
    })
  ]);
  return { snapshot, history: historyResult.unavailable ? snapshot : historyResult.history, historyUnavailable: historyResult.unavailable };
}
