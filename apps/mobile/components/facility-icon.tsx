import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { EinrichtungTyp } from "@hege/domain";

/** Eigene skalierbare Hochstand-Zeichnung: Dach, Fenster, Stelzen, Querstrebe und Leiter. */
export function FacilityIcon({
  type,
  color,
  size = 28,
}: {
  type?: EinrichtungTyp;
  color: string;
  size?: number;
}) {
  if (
    type &&
    ![
      "hochstand",
      "kanzel",
      "ansitzleiter",
      "drueckjagdbock",
      "bodenstand",
    ].includes(type)
  ) {
    const icon =
      type === "kamera"
        ? "camera-outline"
        : ["fuetterung", "kirrung", "salzlecke"].includes(type)
          ? "leaf-outline"
          : type === "jagdhuette"
            ? "home-outline"
            : "location-outline";
    return <Ionicons name={icon} color={color} size={size} />;
  }
  const lines = [
    [3, 7, 12, 3],
    [12, 3, 21, 7],
    [5, 7, 19, 7],
    [5, 7, 5, 13],
    [19, 7, 19, 13],
    [5, 13, 19, 13],
    [8, 10, 16, 10],
    [7, 13, 4, 22],
    [17, 13, 20, 22],
    [6, 16, 18, 21],
    [18, 16, 6, 21],
    [14, 13, 12, 22],
    [17, 13, 15, 22],
    [13.5, 16, 16.5, 16],
    [13, 19, 16, 19],
  ];
  return (
    <View accessible={false} style={{ width: size, height: size }}>
      {lines.map(([x1, y1, x2, y2], i) => {
        const scale = size / 24,
          length = Math.hypot(x2! - x1!, y2! - y1!) * scale;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: ((x1! + x2!) / 2) * scale - length / 2,
              top: ((y1! + y2!) / 2) * scale - size / 32,
              width: length,
              height: size / 16,
              borderRadius: 2,
              backgroundColor: color,
              transform: [
                {
                  rotate: `${(Math.atan2(y2! - y1!, x2! - x1!) * 180) / Math.PI}deg`,
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
