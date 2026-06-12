export const appSettingsStorageKey = "mapofus:settings";
export const appSettingsUpdatedEvent = "mapofus:settings-updated";

export type AppSettings = {
  loginPhotos?: Record<string, string>;
  loginPhotoTexts?: Record<string, LoginPhotoText>;
  anniversaryDate?: string;
  anniversaryLabel?: string;
  weatherCityIds?: string[];
  coupleLogo?: string;
};

export type LoginPhotoText = {
  city?: string;
  label?: string;
};

export const defaultAnniversaryDate = "2025.01.01";
export const defaultAnniversaryLabel = "我们在一起";
export const defaultWeatherCityIds = ["beijing", "shanghai", "guangzhou"];
export const maxWeatherCities = 3;
export const defaultCoupleLogo = "/logo/couple-logo-placeholder.svg";
export const defaultAppSettings: AppSettings = {};

const endpoint = "/api/app-settings";
const migrationDoneKey = "mapofus:settings:migratedToServer:v1";
const datePattern = /^\d{4}\.\d{1,2}\.\d{1,2}$/;

let syncPromise: Promise<AppSettings> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
};

const isValidLogo = (value: unknown): value is string =>
  typeof value === "string" && (value.startsWith("data:image/") || value.startsWith("/"));

export const normalizeAppSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) return defaultAppSettings;

  const settings = value as AppSettings & { loginCoverImage?: string };
  const loginPhotos =
    isRecord(settings.loginPhotos)
      ? Object.fromEntries(
          Object.entries(settings.loginPhotos).filter(
            ([, item]) => typeof item === "string" && item.startsWith("data:image/"),
          ),
        )
      : {};
  const loginPhotoTexts =
    isRecord(settings.loginPhotoTexts)
      ? Object.fromEntries(
          Object.entries(settings.loginPhotoTexts).map(([key, item]) => [
            key,
            {
              city: cleanString(isRecord(item) ? item.city : undefined, 40),
              label: cleanString(isRecord(item) ? item.label : undefined, 80),
            },
          ]),
        )
      : {};
  const anniversaryDate = cleanString(settings.anniversaryDate, 12);
  const weatherCityIds = Array.isArray(settings.weatherCityIds)
    ? settings.weatherCityIds
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, maxWeatherCities)
    : undefined;

  const normalized: AppSettings = {
    loginPhotos,
    loginPhotoTexts,
    anniversaryDate: anniversaryDate && datePattern.test(anniversaryDate) ? anniversaryDate : undefined,
    anniversaryLabel: cleanString(settings.anniversaryLabel, 40),
    weatherCityIds: weatherCityIds && weatherCityIds.length > 0 ? weatherCityIds : undefined,
    coupleLogo: isValidLogo(settings.coupleLogo) ? settings.coupleLogo : undefined,
  };

  if (
    Object.keys(loginPhotos).length === 0 &&
    typeof settings.loginCoverImage === "string" &&
    settings.loginCoverImage.startsWith("data:image/")
  ) {
    normalized.loginPhotos = { hangzhou: settings.loginCoverImage };
  }

  return normalized;
};

const hasMeaningfulAppSettings = (settings: AppSettings) =>
  Boolean(
    settings.anniversaryDate ||
      settings.anniversaryLabel ||
      settings.coupleLogo ||
      (settings.weatherCityIds?.length ?? 0) > 0 ||
      Object.keys(settings.loginPhotos ?? {}).length > 0 ||
      Object.keys(settings.loginPhotoTexts ?? {}).length > 0,
  );

export const readAppSettings = (): AppSettings => {
  if (typeof window === "undefined") return defaultAppSettings;

  try {
    return normalizeAppSettings(JSON.parse(window.localStorage.getItem(appSettingsStorageKey) ?? "{}"));
  } catch {
    return defaultAppSettings;
  }
};

export const writeAppSettings = (settings: AppSettings) => {
  if (typeof window === "undefined") return;
  const normalized = normalizeAppSettings(settings);
  window.localStorage.setItem(appSettingsStorageKey, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent<AppSettings>(appSettingsUpdatedEvent, { detail: normalized }));
};

const isMigrationDone = () => {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(migrationDoneKey) === "1";
  } catch {
    return false;
  }
};

const markMigrationDone = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(migrationDoneKey, "1");
  } catch {
    // ignore storage failures
  }
};

const getResponseError = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
};

export const saveAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const normalized = normalizeAppSettings(settings);
  writeAppSettings(normalized);

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: normalized }),
  });
  if (!response.ok) throw new Error(await getResponseError(response, `Save settings failed (${response.status})`));
  const payload = (await response.json()) as { settings?: unknown };
  const nextSettings = normalizeAppSettings(payload.settings);
  writeAppSettings(nextSettings);
  markMigrationDone();
  return nextSettings;
};

export const syncAppSettings = async (): Promise<AppSettings> => {
  if (typeof window === "undefined") return defaultAppSettings;

  if (!syncPromise) {
    syncPromise = (async () => {
      const localSettings = readAppSettings();
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await getResponseError(response, `Load settings failed (${response.status})`));
      }

      const payload = (await response.json()) as { settings?: unknown };
      const serverSettings = normalizeAppSettings(payload.settings);

      if (!isMigrationDone() && hasMeaningfulAppSettings(localSettings) && !hasMeaningfulAppSettings(serverSettings)) {
        const migrated = await saveAppSettings(localSettings);
        markMigrationDone();
        return migrated;
      }

      writeAppSettings(serverSettings);
      markMigrationDone();
      return serverSettings;
    })().finally(() => {
      syncPromise = null;
    });
  }

  return syncPromise;
};
