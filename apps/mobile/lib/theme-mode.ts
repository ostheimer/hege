import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

/**
 * In-App-Theme-Modus (Erscheinungsbild) — erlaubt dem Nutzer, Hell/Dunkel
 * unabhaengig vom iOS-System-Setting zu waehlen.
 *
 * - `"system"`: folgt `useColorScheme()` (Standard).
 * - `"light"` / `"dark"`: erzwingt das jeweilige Token-Set.
 *
 * Gleiches Listener+AsyncStorage-Muster wie `notifications-read-state`:
 * ein In-Memory-Cache haelt den aktuellen Wert, ein Hook stellt ihn der
 * UI bereit, und `setThemeMode` benachrichtigt alle Konsumenten sofort
 * (optimistisch, fuer einen verzoegerungsfreien Theme-Wechsel) und
 * persistiert danach. `useThemeColors()` (lib/theme.ts) liest diesen Wert.
 */

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "@hege/theme/mode";

type Listener = (mode: ThemeMode) => void;
const listeners = new Set<Listener>();
let cachedMode: ThemeMode = "system";
let hydrated = false;

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

async function loadThemeMode(): Promise<ThemeMode> {
  if (hydrated) {
    return cachedMode;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (isThemeMode(raw)) {
      cachedMode = raw;
    }
  } catch {
    // Default "system" beibehalten.
  }
  hydrated = true;
  return cachedMode;
}

/**
 * Setzt den Theme-Modus. Benachrichtigt Konsumenten sofort (instant
 * Theme-Switch) und schreibt danach auf Disk. Ein Persist-Fehler laesst
 * den aktuellen Lauf korrekt, kostet nur die Persistenz ueber Neustart.
 */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  cachedMode = mode;
  hydrated = true;
  listeners.forEach((listener) => listener(mode));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[theme-mode] persist failed, keeping in-memory state", error);
    }
  }
}

/**
 * Hook: aktueller Theme-Modus, reagiert auf `setThemeMode`. Laedt den
 * gespeicherten Wert beim ersten Mount asynchron nach.
 */
export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(cachedMode);

  useEffect(() => {
    let isMounted = true;

    void loadThemeMode().then((loaded) => {
      if (isMounted) {
        setMode(loaded);
      }
    });

    const listener: Listener = (next) => {
      if (isMounted) {
        setMode(next);
      }
    };
    listeners.add(listener);

    return () => {
      isMounted = false;
      listeners.delete(listener);
    };
  }, []);

  return mode;
}

/** Nur fuer Tests: In-Memory-Zustand zuruecksetzen. */
export function _resetThemeModeForTests(): void {
  cachedMode = "system";
  hydrated = false;
  listeners.clear();
}
