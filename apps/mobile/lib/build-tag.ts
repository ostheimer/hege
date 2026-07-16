/**
 * Sichtbarer Build-Marker (Login, Profil und "Ueber hege"), damit man am
 * Geraet erkennt, welche Version/welcher OTA-Push gerade laeuft. Bei jedem
 * Release/Update manuell hochzaehlen. Bewusst eine statische Konstante
 * statt eines expo-updates-Zugriffs: das Lesen von Updates.channel im
 * OTA-Kontext hat einen nativen Crash ausgeloest.
 */
export const BUILD_TAG = "0.1.0 · 2026-07-16.21";
