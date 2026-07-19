import { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppState, Pressable } from "react-native";

import { AppLoader } from "../components/app-loader";
import { syncOfflineQueue } from "../lib/offline-queue";
import { createOfflineQueueAppStateHandler } from "../lib/offline-queue-lifecycle";
import { restoreSession, useSessionSnapshot } from "../lib/session";
import { useThemeColors } from "../lib/theme";

const BACK_HIT_SLOP = { top: 12, right: 12, bottom: 12, left: 12 };

export default function RootLayout() {
  const session = useSessionSnapshot();

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    void syncOfflineQueue();

    const subscription = AppState.addEventListener(
      "change",
      createOfflineQueueAppStateHandler(syncOfflineQueue)
    );

    return () => subscription.remove();
  }, [session.status]);

  if (session.status === "loading" || !session.hydrated) {
    return <AppLoader />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false, headerBackButtonDisplayMode: "minimal" }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" options={{ title: "hege" }} />
        <Stack.Screen
          name="ueber-hege"
          options={{ headerShown: true, title: "", headerBackVisible: false, headerLeft: HeaderBackButton }}
        />
      </Stack>
    </>
  );
}

function HeaderBackButton() {
  const colors = useThemeColors();
  return (
    <Pressable accessibilityLabel="Zurück" accessibilityRole="button" hitSlop={BACK_HIT_SLOP} onPress={() => router.back()}>
      <Ionicons color={colors.ink} name="chevron-back" size={32} />
    </Pressable>
  );
}
