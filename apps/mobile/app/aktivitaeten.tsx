import { useCallback, useRef, useState } from "react";
import { Redirect, useFocusEffect, useRouter } from "expo-router";

import { ActivityFeed } from "../components/activity-feed";
import { ScreenShell } from "../components/screen-shell";
import { StateView } from "../components/state-view";
import { buildActivityFeed, type ActivityItem } from "../lib/activity-feed.helpers";
import { fetchActivityHistory } from "../lib/api";
import { getSession, useSessionSnapshot } from "../lib/session";

export default function AktivitaetenScreen() {
  const session = useSessionSnapshot();
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loadedMembership, setLoadedMembership] = useState<string | undefined>();
  const sequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(refresh = false) {
    const requestId = ++sequence.current;
    const membershipId = getSession()?.membership.id;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const history = await fetchActivityHistory();
      if (requestId !== sequence.current || membershipId !== getSession()?.membership.id) return;
      setItems(buildActivityFeed(history, Infinity));
      setLoadedMembership(membershipId);
    } catch (cause) {
      if (requestId !== sequence.current || membershipId !== getSession()?.membership.id) return;
      setItems([]);
      setError(cause instanceof Error ? cause.message : "Aktivitäten konnten nicht geladen werden.");
    } finally {
      if (requestId === sequence.current && membershipId === getSession()?.membership.id) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useFocusEffect(useCallback(() => {
    if (session.status === "authenticated") void load();
  }, [session.status, session.session?.membership.id]));
  if (session.status !== "authenticated") return <Redirect href="/login" />;

  return (
    <ScreenShell title="Alle Aktivitäten" eyebrow="Dein Revier" subtitle="Ansitze, Fallwild und Benachrichtigungen aus deinem freigeschalteten Revier, neueste zuerst."
      topSafeArea={false} testID="activities-screen" refresh={{ refreshing, onRefresh: () => void load(true) }}>
      {loading ? <StateView mode="loading" title="Aktivitäten werden geladen" description="Der Verlauf wird aktualisiert." /> :
        error ? <StateView mode="error" title="Aktivitäten nicht verfügbar" description={error} /> :
          <ActivityFeed items={loadedMembership === session.session?.membership.id ? items : []} complete onItemPress={(item) => {
            if (item.kind === "fallwild") router.push({ pathname: "/(tabs)/fallwild", params: { view: "liste" } });
            else router.push((item.kind === "ansitz" ? "/(tabs)/ansitze" : "/(tabs)/benachrichtigungen") as Parameters<typeof router.push>[0]);
          }} />}
    </ScreenShell>
  );
}
