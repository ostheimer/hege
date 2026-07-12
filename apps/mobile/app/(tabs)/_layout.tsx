import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";

import { AppLoader } from "../../components/app-loader";
import { useThemeColors } from "../../lib/theme";
import { useSessionSnapshot } from "../../lib/session";
import { spacing } from "@hege/tokens";

export default function TabsLayout() {
  const session = useSessionSnapshot();
  const theme = useThemeColors();

  if (session.status === "loading" || !session.hydrated) {
    return <AppLoader />;
  }

  if (session.status !== "authenticated") {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          height: 72,
          paddingBottom: 12,
          paddingTop: spacing.sm,
          // Im Light-Mode bleibt die Bar in der Brand-Cremefarbe; im Dark-Mode
          // gleitet sie auf die dunkle Card-Surface, damit sie sich vom
          // ScrollView-Hintergrund abhebt (P1.8).
          backgroundColor: theme.card
        },
        tabBarLabelStyle: {
          fontSize: 11
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Heute",
          tabBarButtonTestID: "tab-today",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="home-outline" size={size} />
        }}
      />
      <Tabs.Screen
        name="ansitze"
        options={{
          title: "Ansitze",
          tabBarButtonTestID: "tab-ansitze",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="trail-sign-outline" size={size} />
        }}
      />
      <Tabs.Screen
        name="fallwild"
        options={{
          title: "Fallwild",
          tabBarButtonTestID: "tab-fallwild",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="camera-outline" size={size} />
        }}
      />
      <Tabs.Screen
        name="mehr"
        options={{
          title: "Mehr",
          tabBarButtonTestID: "tab-more",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="ellipsis-horizontal" size={size} />
        }}
      />
      <Tabs.Screen
        name="reviereinrichtungen"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="revierarbeit"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="protokolle"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="kontakte"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="benachrichtigungen"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}
