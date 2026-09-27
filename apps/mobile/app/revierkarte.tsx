import { Redirect } from "expo-router";
import { RevierMapCard } from "../components/revier-map-card";
import { ScreenShell } from "../components/screen-shell";
import { useSessionSnapshot } from "../lib/session";
export default function RevierkarteScreen() {
  const { session, status } = useSessionSnapshot();
  if (status === "loading") return null;
  if (status !== "authenticated" || !session) return <Redirect href="/login" />;
  return <ScreenShell eyebrow="Dein Revier" title="Revierkarte" subtitle="Grenzen und Ausschlussflächen" topSafeArea={false}>
    <RevierMapCard key={session.membership.id} revierId={session.revier.id} name={session.revier.name} expanded />
  </ScreenShell>;
}
