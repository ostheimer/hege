import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import type {
  AnsitzSession,
  EinrichtungTyp,
  EinrichtungZustand,
  FallwildVorgang,
  Reviermeldung,
  Reviereinrichtung
} from "@hege/domain";

import {
  formatReviermeldungCategoryLabel,
  formatReviermeldungStatusLabel,
  formatRevierResourceTypeLabel
} from "../lib/revierarbeit-map.helpers";
import type { ThemeColors } from "../lib/theme";
import { useThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

/**
 * Pin-Detail-Sheet — Bottom-Modal, das beim Tap auf einen Karten-Marker
 * aufgeht (P2.1, PR B). Zeigt entitaetsspezifische Details und 1-2
 * Schnellaktionen ("Details oeffnen", spaeter z.B. "Wartung melden").
 *
 * Wir bewusst kein @gorhom/bottom-sheet (kein neues Dependency, keine
 * Reanimated-Migration). Stattdessen `<Modal presentationStyle="formSheet">`
 * — auf iOS ist das die native Half-Sheet-Optik, auf Android faellt das
 * auf Fullscreen-Modal mit Scroll zurueck.
 *
 * Die Komponente ist passive: sie rendert was reinkommt, der Aufrufer
 * verwaltet `selectedPin`-State. Das macht sie testbar und entkoppelt
 * sie vom Map-Rendering.
 */

export type SelectedPin =
  | { type: "ansitz"; data: AnsitzSession }
  | { type: "fallwild"; data: FallwildVorgang }
  | { type: "einrichtung"; data: Reviereinrichtung }
  | { type: "reviermeldung"; data: Reviermeldung };

interface PinDetailSheetProps {
  pin: SelectedPin | null;
  onClose: () => void;
  onOpenDetails?: (pin: SelectedPin) => void;
}

export function PinDetailSheet({ pin, onClose, onOpenDetails }: PinDetailSheetProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();

  // Wenn kein Pin ausgewaehlt ist, rendern wir das Modal gar nicht erst.
  // Frueher haben wir es immer in den Tree gehaengt und nur `visible={false}`
  // gesetzt — das hat in Kombination mit dem Eltern-ScrollView aus
  // ScreenShell zu einem Start-Crash gefuehrt (vermutet: Modal-Mount-Cycle
  // in einem nicht-presentierten Container). Lazy-Mount loest das.
  if (pin === null) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="formSheet"
      transparent={false}
      visible
      onRequestClose={onClose}
    >
      {/* SafeAreaView aus react-native (nicht safe-area-context), weil
        Modals auf iOS einen eigenen UIWindow-Kontext bekommen und der
        SafeAreaProvider von react-native-safe-area-context nicht durch
        das Window-Boundary durchschlaegt. RN's eingebauter
        SafeAreaView greift dagegen direkt auf UIView's `safeAreaInsets`. */}
      <SafeAreaView style={styles.root}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <PinHeader pin={pin} styles={styles} theme={theme} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed ? styles.closePressed : null]}
          >
            <Ionicons color={theme.muted} name="close" size={22} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {pin.type === "ansitz" ? <AnsitzDetails ansitz={pin.data} styles={styles} /> : null}
          {pin.type === "fallwild" ? <FallwildDetails fallwild={pin.data} styles={styles} /> : null}
          {pin.type === "einrichtung" ? (
            <EinrichtungDetails einrichtung={pin.data} styles={styles} />
          ) : null}
          {pin.type === "reviermeldung" ? (
            <ReviermeldungDetails meldung={pin.data} styles={styles} />
          ) : null}
        </ScrollView>

        {onOpenDetails ? (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Details öffnen"
              onPress={() => onOpenDetails(pin)}
              style={({ pressed }) => [styles.primaryAction, pressed ? styles.primaryActionPressed : null]}
            >
              <Text style={styles.primaryActionText}>Details öffnen</Text>
              <Ionicons color={styles.primaryActionText.color} name="arrow-forward" size={18} />
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

interface PinHeaderProps {
  pin: SelectedPin;
  styles: ReturnType<typeof createStyles>;
  theme: ThemeColors;
}

function PinHeader({ pin, styles, theme }: PinHeaderProps) {
  const dotColor =
    pin.type === "ansitz"
      ? theme.accent
      : pin.type === "fallwild"
        ? theme.warning
        : pin.type === "reviermeldung"
          ? theme.danger
          : theme.ink;
  const eyebrow =
    pin.type === "ansitz"
      ? "Aktiver Ansitz"
      : pin.type === "fallwild"
        ? "Fallwild"
        : pin.type === "reviermeldung"
          ? "Reviermeldung"
          : "Reviereinrichtung";
  const title =
    pin.type === "ansitz"
      ? pin.data.standortName
      : pin.type === "fallwild"
        ? pin.data.gemeinde ?? pin.data.location.label ?? "Fallwild-Eintrag"
        : pin.type === "reviermeldung"
          ? pin.data.title
          : pin.data.name;

  return (
    <View style={styles.headerCopy}>
      <View style={styles.headerEyebrowRow}>
        <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
        <Text style={styles.headerEyebrow}>{eyebrow}</Text>
      </View>
      <Text numberOfLines={2} style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}

function DetailRow({ label, value, styles }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function AnsitzDetails({
  ansitz,
  styles
}: {
  ansitz: AnsitzSession;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailGroup}>
      <DetailRow label="Begonnen" value={formatDateTime(ansitz.startedAt)} styles={styles} />
      {ansitz.plannedEndAt ? (
        <DetailRow
          label="Geplantes Ende"
          value={formatDateTime(ansitz.plannedEndAt)}
          styles={styles}
        />
      ) : null}
      {ansitz.location.label ? (
        <DetailRow label="Position" value={ansitz.location.label} styles={styles} />
      ) : null}
      <DetailRow
        label="Konflikt"
        value={ansitz.conflict ? "Ja — Überlappung gemeldet" : "Nein"}
        styles={styles}
      />
      {ansitz.note ? (
        <View style={styles.noteBlock}>
          <Text style={styles.detailLabel}>Notiz</Text>
          <Text style={styles.noteText}>{ansitz.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

function FallwildDetails({
  fallwild,
  styles
}: {
  fallwild: FallwildVorgang;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailGroup}>
      <DetailRow label="Wildart" value={fallwild.wildart} styles={styles} />
      <DetailRow
        label="Geschlecht"
        value={formatGeschlecht(fallwild.geschlecht)}
        styles={styles}
      />
      <DetailRow label="Alter" value={fallwild.altersklasse} styles={styles} />
      <DetailRow
        label="Bergung"
        value={formatBergungsStatus(fallwild.bergungsStatus)}
        styles={styles}
      />
      <DetailRow label="Gemeinde" value={fallwild.gemeinde} styles={styles} />
      <DetailRow label="Erfasst" value={formatDateTime(fallwild.recordedAt)} styles={styles} />
      {fallwild.location.addressLabel ? (
        <DetailRow label="Adresse" value={fallwild.location.addressLabel} styles={styles} />
      ) : null}
      {fallwild.note ? (
        <View style={styles.noteBlock}>
          <Text style={styles.detailLabel}>Notiz</Text>
          <Text style={styles.noteText}>{fallwild.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

function EinrichtungDetails({
  einrichtung,
  styles
}: {
  einrichtung: Reviereinrichtung;
  styles: ReturnType<typeof createStyles>;
}) {
  const offeneWartungen = einrichtung.wartung.filter((entry) => entry.status === "offen").length;

  return (
    <View style={styles.detailGroup}>
      <DetailRow label="Typ" value={formatEinrichtungTyp(einrichtung.type)} styles={styles} />
      <DetailRow
        label="Zustand"
        value={formatEinrichtungZustand(einrichtung.status)}
        styles={styles}
      />
      <DetailRow
        label="Offene Wartungen"
        value={offeneWartungen === 0 ? "Keine" : `${offeneWartungen}`}
        styles={styles}
      />
      {einrichtung.location.label ? (
        <DetailRow label="Position" value={einrichtung.location.label} styles={styles} />
      ) : null}
      {einrichtung.beschreibung ? (
        <View style={styles.noteBlock}>
          <Text style={styles.detailLabel}>Beschreibung</Text>
          <Text style={styles.noteText}>{einrichtung.beschreibung}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ReviermeldungDetails({
  meldung,
  styles
}: {
  meldung: Reviermeldung;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailGroup}>
      <DetailRow
        label="Kategorie"
        value={formatReviermeldungCategoryLabel(meldung.category)}
        styles={styles}
      />
      <DetailRow
        label="Status"
        value={formatReviermeldungStatusLabel(meldung.status)}
        styles={styles}
      />
      <DetailRow label="Zeitpunkt" value={formatDateTime(meldung.occurredAt)} styles={styles} />
      {meldung.location ? (
        <DetailRow
          label="Standort"
          value={meldung.location.label ?? `${meldung.location.lat}, ${meldung.location.lng}`}
          styles={styles}
        />
      ) : null}
      {meldung.relatedType ? (
        <DetailRow
          label="Bezug"
          value={formatRevierResourceTypeLabel(meldung.relatedType)}
          styles={styles}
        />
      ) : null}
      {meldung.description ? (
        <View style={styles.noteBlock}>
          <Text style={styles.detailLabel}>Beschreibung</Text>
          <Text style={styles.noteText}>{meldung.description}</Text>
        </View>
      ) : null}
    </View>
  );
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatGeschlecht(value: string): string {
  switch (value) {
    case "maennlich":
      return "Männlich";
    case "weiblich":
      return "Weiblich";
    default:
      return "Unbekannt";
  }
}

function formatBergungsStatus(value: string): string {
  switch (value) {
    case "erfasst":
      return "Erfasst";
    case "geborgen":
      return "Geborgen";
    case "entsorgt":
      return "Entsorgt";
    case "an-behoerde-gemeldet":
      return "An Behörde gemeldet";
    default:
      return value;
  }
}

function formatEinrichtungTyp(type: EinrichtungTyp): string {
  switch (type) {
    case "hochstand":
      return "Hochstand";
    case "fuetterung":
      return "Fütterung";
    case "salzlecke":
      return "Salzlecke";
    case "kirrung":
      return "Kirrung";
    case "kamera":
      return "Kamera";
    case "wildacker":
      return "Wildacker";
    default:
      return type;
  }
}

function formatEinrichtungZustand(zustand: EinrichtungZustand): string {
  switch (zustand) {
    case "gut":
      return "Gut";
    case "wartung-faellig":
      return "Wartung fällig";
    case "gesperrt":
      return "Gesperrt";
    default:
      return zustand;
  }
}

const createStyles = (theme: ThemeColors) =>
  ({
    root: {
      flex: 1,
      backgroundColor: theme.surface
    },
    handle: {
      alignSelf: "center",
      marginTop: 6,
      width: 48,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.muted,
      opacity: 0.25
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16
    },
    headerCopy: {
      flex: 1,
      gap: 6
    },
    headerEyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 999
    },
    headerEyebrow: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      color: theme.muted,
      fontWeight: "600"
    },
    headerTitle: {
      fontSize: 24,
      lineHeight: 28,
      fontWeight: "700",
      color: theme.ink
    },
    closeButton: {
      padding: 6,
      borderRadius: 999,
      backgroundColor: theme.card
    },
    closePressed: {
      opacity: 0.6
    },
    body: {
      paddingHorizontal: 20,
      paddingBottom: 28,
      gap: 14
    },
    detailGroup: {
      gap: 10
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 12,
      paddingVertical: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.muted
    },
    detailLabel: {
      flex: 0.45,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      color: theme.muted,
      fontWeight: "600"
    },
    detailValue: {
      flex: 0.55,
      fontSize: 15,
      color: theme.ink,
      fontWeight: "500"
    },
    noteBlock: {
      marginTop: 8,
      gap: 6,
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.card
    },
    noteText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.ink
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8
    },
    primaryAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: theme.accent
    },
    primaryActionPressed: {
      opacity: 0.85
    },
    primaryActionText: {
      color: theme.onAccent,
      fontSize: 16,
      fontWeight: "700"
    }
  }) as const;
