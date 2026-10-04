import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColors } from "../lib/theme";

export function Disclosure({
  title,
  children,
  testID,
}: {
  title: string;
  children: ReactNode;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const theme = useThemeColors();
  return (
    <View style={{ gap: open ? 12 : 0 }} testID={testID}>
      <Pressable
        testID={testID ? `${testID}-toggle` : undefined}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={{
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          style={{ color: theme.ink, fontSize: 15, fontWeight: "600", flex: 1 }}
        >
          {title}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.muted}
        />
      </Pressable>
      {open ? children : null}
    </View>
  );
}
