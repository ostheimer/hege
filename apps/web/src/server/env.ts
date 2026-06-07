const LOCAL_DATABASE_URL = "postgresql://hege:hege@127.0.0.1:5432/hege";
const LOCAL_AUTH_SECRET = "hege-local-auth-secret-change-me";
const LOCAL_DEMO_PASSWORD = "9526";
const LOCAL_S3_ENDPOINT = "http://127.0.0.1:9000";
const LOCAL_S3_REGION = "eu-central-1";
const LOCAL_S3_BUCKET = "hege-assets";
const LOCAL_S3_PUBLIC_BASE_URL = "http://127.0.0.1:9000/hege-assets";
const LOCAL_S3_ACCESS_KEY = "minioadmin";
const LOCAL_S3_SECRET_KEY = "minioadmin";

export interface ServerEnv {
  databaseUrl: string;
  migrationDatabaseUrl: string;
  useDemoStore: boolean;
  authTokenSecret: string;
  demoPassword: string;
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3PublicBaseUrl?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  googleMapsServerApiKey?: string;
  googleMapsLanguage: string;
  googleMapsRegion: string;
  gipRoadKilometerEndpoint?: string;
  gipRoadKilometerIndexPath?: string;
  gipRoadKilometerMaxDistanceMeters: number;
  geoProviderMode: "live" | "mock" | "disabled";
}

export function getServerEnv(): ServerEnv {
  const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
  const migrationDatabaseUrl = process.env.DATABASE_URL_UNPOOLED ?? databaseUrl;
  const useDemoStore = process.env.HEGE_USE_DEMO_STORE === "true" || process.env.NODE_ENV === "test";
  const authTokenSecret = resolveOptionalEnv("AUTH_TOKEN_SECRET") ?? fallbackAuthSecret();
  const demoPassword = process.env.HEGE_DEMO_PASSWORD ?? LOCAL_DEMO_PASSWORD;
  const s3Endpoint = resolveStorageEnv("S3_ENDPOINT", LOCAL_S3_ENDPOINT);
  const s3Region = resolveStorageEnv("S3_REGION", LOCAL_S3_REGION);
  const s3Bucket = resolveStorageEnv("S3_BUCKET", LOCAL_S3_BUCKET);
  const s3PublicBaseUrl = resolveStorageEnv("S3_PUBLIC_BASE_URL", LOCAL_S3_PUBLIC_BASE_URL);
  const s3AccessKey = resolveStorageEnv("S3_ACCESS_KEY", LOCAL_S3_ACCESS_KEY);
  const s3SecretKey = resolveStorageEnv("S3_SECRET_KEY", LOCAL_S3_SECRET_KEY);
  const googleMapsServerApiKey = resolveOptionalEnv("GOOGLE_MAPS_SERVER_API_KEY");
  const googleMapsLanguage = resolveOptionalEnv("GOOGLE_MAPS_LANGUAGE") ?? "de";
  const googleMapsRegion = resolveOptionalEnv("GOOGLE_MAPS_REGION") ?? "AT";
  const gipRoadKilometerEndpoint = resolveOptionalEnv("GIP_ROAD_KILOMETER_ENDPOINT");
  const gipRoadKilometerIndexPath = resolveOptionalEnv("GIP_ROAD_KILOMETER_INDEX_PATH");
  const gipRoadKilometerMaxDistanceMeters = readOptionalPositiveNumber(
    resolveOptionalEnv("GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS"),
    150
  );
  const geoProviderMode = readGeoProviderMode(resolveOptionalEnv("HEGE_GEO_PROVIDER"));

  return {
    databaseUrl,
    migrationDatabaseUrl,
    useDemoStore,
    authTokenSecret,
    demoPassword,
    s3Endpoint,
    s3Region,
    s3Bucket,
    s3PublicBaseUrl,
    s3AccessKey,
    s3SecretKey,
    googleMapsServerApiKey,
    googleMapsLanguage,
    googleMapsRegion,
    gipRoadKilometerEndpoint,
    gipRoadKilometerIndexPath,
    gipRoadKilometerMaxDistanceMeters,
    geoProviderMode
  };
}

function fallbackAuthSecret() {
  if (process.env.VERCEL_ENV) {
    throw new Error("AUTH_TOKEN_SECRET muss für Preview- und Production-Deployments gesetzt sein.");
  }

  return LOCAL_AUTH_SECRET;
}

function resolveStorageEnv(name: keyof NodeJS.ProcessEnv, fallbackValue: string) {
  const value = process.env[name];
  const normalizedValue = typeof value === "string" ? value.trim() : undefined;

  if (normalizedValue && normalizedValue.length > 0) {
    return normalizedValue;
  }

  if (process.env.VERCEL_ENV) {
    return undefined;
  }

  return fallbackValue;
}

function resolveOptionalEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name];
  const normalizedValue = typeof value === "string" ? value.trim() : undefined;

  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function readGeoProviderMode(value: string | undefined): ServerEnv["geoProviderMode"] {
  if (value === "mock" || value === "disabled" || value === "live") {
    return value;
  }

  return "live";
}

function readOptionalPositiveNumber(value: string | undefined, fallbackValue: number) {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}
