import Constants from "expo-constants";

function configuredValue(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function formatRuntimeVersion(runtimeVersion: unknown) {
  if (typeof runtimeVersion === "string" && runtimeVersion.trim()) {
    return runtimeVersion;
  }

  if (
    runtimeVersion &&
    typeof runtimeVersion === "object" &&
    "policy" in runtimeVersion &&
    typeof runtimeVersion.policy === "string"
  ) {
    return runtimeVersion.policy;
  }

  return "nicht verfügbar";
}

/**
 * Die nativen Werte stammen direkt aus dem installierten iOS-/Android-Binary.
 * Der App-Stand wird beim OTA-Publish gesetzt und identifiziert das geladene
 * JavaScript-Paket, ohne zur Laufzeit auf expo-updates zugreifen zu müssen.
 */
export const APP_VERSION = configuredValue(
  Constants.nativeAppVersion,
  Constants.expoConfig?.version ?? "nicht verfügbar"
);
export const BUILD_NUMBER = configuredValue(Constants.nativeBuildVersion, "nicht verfügbar");
export const EXPO_SDK = configuredValue(Constants.expoConfig?.sdkVersion, "53.0.0");
export const RUNTIME_VERSION = formatRuntimeVersion(Constants.expoConfig?.runtimeVersion);
export const RELEASE_CHANNEL = configuredValue(
  process.env.EXPO_PUBLIC_RELEASE_CHANNEL,
  "preview"
);
export const BUILD_TAG = configuredValue(
  process.env.EXPO_PUBLIC_BUILD_TAG,
  `${APP_VERSION} (Build ${BUILD_NUMBER})`
);
