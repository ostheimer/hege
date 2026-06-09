import { afterEach, describe, expect, it } from "vitest";

import { getServerEnv } from "./env";

const STORAGE_ENV_KEYS = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_PUBLIC_BASE_URL",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "GOOGLE_MAPS_SERVER_API_KEY",
  "GOOGLE_MAPS_LANGUAGE",
  "GOOGLE_MAPS_REGION",
  "GIP_ROAD_KILOMETER_ENDPOINT",
  "GIP_ROAD_KILOMETER_INDEX_PATH",
  "GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS",
  "HEGE_GEO_PROVIDER",
  "AUTH_TOKEN_SECRET",
  "VERCEL_ENV"
] as const;

const originalEnv = new Map<string, string | undefined>(
  STORAGE_ENV_KEYS.map((key) => [key, process.env[key]])
);

afterEach(() => {
  for (const key of STORAGE_ENV_KEYS) {
    const value = originalEnv.get(key);

    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
});

describe("server env", () => {
  it("normalisiert Whitespace in Storage-Umgebungsvariablen", () => {
    process.env.VERCEL_ENV = "production";
    process.env.S3_ENDPOINT = " https://example-account.r2.cloudflarestorage.com\n";
    process.env.S3_REGION = "auto\n";
    process.env.S3_BUCKET = " hege-assets ";
    process.env.S3_PUBLIC_BASE_URL = "https://assets.hege.app/\n";
    process.env.S3_ACCESS_KEY = " access-key\n";
    process.env.S3_SECRET_KEY = " secret-key\n";
    process.env.AUTH_TOKEN_SECRET = "test-auth-secret";

    const env = getServerEnv();

    expect(env.s3Endpoint).toBe("https://example-account.r2.cloudflarestorage.com");
    expect(env.s3Region).toBe("auto");
    expect(env.s3Bucket).toBe("hege-assets");
    expect(env.s3PublicBaseUrl).toBe("https://assets.hege.app/");
    expect(env.s3AccessKey).toBe("access-key");
    expect(env.s3SecretKey).toBe("secret-key");
  });

  it("normalisiert Standort-Integrationsvariablen", () => {
    process.env.VERCEL_ENV = "production";
    process.env.AUTH_TOKEN_SECRET = "test-auth-secret";
    process.env.GOOGLE_MAPS_SERVER_API_KEY = " google-key\n";
    process.env.GOOGLE_MAPS_LANGUAGE = " de ";
    process.env.GOOGLE_MAPS_REGION = " AT\n";
    process.env.GIP_ROAD_KILOMETER_ENDPOINT = " https://gip.example.test/resolve ";
    process.env.GIP_ROAD_KILOMETER_INDEX_PATH = " /var/task/data/gip-road-kilometer-index.json ";
    process.env.GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS = " 180 ";
    process.env.HEGE_GEO_PROVIDER = " mock ";

    const env = getServerEnv();

    expect(env.googleMapsServerApiKey).toBe("google-key");
    expect(env.googleMapsLanguage).toBe("de");
    expect(env.googleMapsRegion).toBe("AT");
    expect(env.gipRoadKilometerEndpoint).toBe("https://gip.example.test/resolve");
    expect(env.gipRoadKilometerIndexPath).toBe("/var/task/data/gip-road-kilometer-index.json");
    expect(env.gipRoadKilometerMaxDistanceMeters).toBe(180);
    expect(env.geoProviderMode).toBe("mock");
  });

  it("behandelt leere Storage-Werte in Vercel als nicht konfiguriert", () => {
    process.env.VERCEL_ENV = "production";
    process.env.S3_ENDPOINT = " ";
    process.env.S3_REGION = "\n";
    process.env.S3_BUCKET = "\t";
    process.env.S3_PUBLIC_BASE_URL = "";
    process.env.S3_ACCESS_KEY = " ";
    process.env.S3_SECRET_KEY = "\n";
    process.env.AUTH_TOKEN_SECRET = "test-auth-secret";

    const env = getServerEnv();

    expect(env.s3Endpoint).toBeUndefined();
    expect(env.s3Region).toBeUndefined();
    expect(env.s3Bucket).toBeUndefined();
    expect(env.s3PublicBaseUrl).toBeUndefined();
    expect(env.s3AccessKey).toBeUndefined();
    expect(env.s3SecretKey).toBeUndefined();
  });

  it("behandelt ein leeres Auth-Secret in Vercel als fehlende Pflichtkonfiguration", () => {
    process.env.VERCEL_ENV = "production";
    process.env.AUTH_TOKEN_SECRET = " \n";

    expect(() => getServerEnv()).toThrow("AUTH_TOKEN_SECRET muss für Preview- und Production-Deployments gesetzt sein.");
  });
});
