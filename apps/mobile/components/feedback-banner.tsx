import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

export type FeedbackTone = "info" | "success" | "warning" | "danger";

interface FeedbackBannerProps {
  /** Semantischer Ton (Flaechenfarbe). */
  tone: FeedbackTone;
  /** Kurze Ueberschrift. */
  title: string;
  /** Detailtext (optional). */
  description?: ReactNode;
}

/**
 * `<FeedbackBanner tone>` — einheitliches Feedback-/Status-Banner fuer
 * Aktions-Rueckmeldungen (Erfolg/Warnung) und Inline-Fehler an den
 * Erfassungs-Formularen (UI-Audit §3/§10). Ersetzt die zuvor pro Screen
 * duplizierten `infoCard`/`errorCard`/`feedbackCard`-Styles.
 *
 * Abgrenzung zu {@link StateView}: StateView ist die Loading/Empty/Error-
 * Anzeige eines Listen-Bereichs; FeedbackBanner ist das transiente Banner
 * direkt am Formular.
 *
 * Werterhaltend: Flaechenfarben aus dem bestehenden Banner-Pastell; `info`
 * und `warning` teilen sich bewusst die warme Creme-Flaeche (wie bisher).
 */
export function FeedbackBanner({ tone, title, description }: FeedbackBannerProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityLiveRegion={tone === "danger" ? "assertive" : "polite"}
      style={[styles.banner, toneSurface(styles, tone)]}
    >
      <Text style={styles.title}>{title}</Text>
      {description != null && description !== "" ? <Text style={styles.copy}>{description}</Text> : null}
    </View>
  );
}

function toneSurface(styles: ReturnType<typeof createStyles>, tone: FeedbackTone) {
  switch (tone) {
    case "success":
      return styles.surfaceSuccess;
    case "danger":
      return styles.surfaceDanger;
    default:
      // info + warning teilen die warme Creme-Flaeche.
      return styles.surfaceWarning;
  }
}

const createStyles = (theme: ThemeColors) =>
  ({
    banner: {
      gap: 6,
      padding: 18,
      borderRadius: 22
    },
    surfaceSuccess: {
      backgroundColor: "#e3ecd7"
    },
    surfaceWarning: {
      backgroundColor: "#efe3d1"
    },
    surfaceDanger: {
      backgroundColor: "#f0d9d4"
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.ink
    },
    copy: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    }
  }) as const;
