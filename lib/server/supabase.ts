import { createClient } from "@supabase/supabase-js";
import type { AdminAlert } from "@/data/adminAlerts";

const normalizeSupabaseUrl = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return undefined;

  return trimmed.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/g, "");
};

const cleanedEnvValue = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return trimmed || undefined;
};

const uniqueDefined = (...values: Array<string | undefined>) =>
  [...new Set(values.map((value) => cleanedEnvValue(value)).filter((value): value is string => Boolean(value)))];

const rawSupabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const supabaseKeys = uniqueDefined(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const shouldUseLocalFileStorage = process.env.MAP_OF_US_STORAGE_MODE === "local";

export const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? "map-of-us";
const privateImagePrefix = "supabase-private://";
const signedUrlExpiresInSeconds = 60 * 60 * 24;
const adminAlertsKey = "admin-alerts";

export const isSupabaseConfigured = !shouldUseLocalFileStorage && Boolean(supabaseUrl && supabaseKeys.length > 0);
export const shouldRequirePersistentStorage = process.env.NODE_ENV === "production" && !shouldUseLocalFileStorage;

const getSupabaseConfigProblem = () => {
  if (shouldUseLocalFileStorage) return null;
  if (!supabaseUrl) return "SUPABASE_URL is missing.";
  if ((rawSupabaseUrl ?? "").includes("/rest/v1")) {
    return "SUPABASE_URL should be the project URL, not the /rest/v1 Data API endpoint.";
  }
  if (supabaseKeys.length === 0) {
    return "A Supabase server key is missing. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.";
  }

  return null;
};

const getErrorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
};

const toSupabaseError = (error: unknown) => {
  const text = getErrorText(error);
  const lower = text.toLowerCase();

  if (lower.includes("invalid api key")) {
    return new Error("Supabase API key is invalid or does not match the configured project URL.");
  }

  if (lower.includes("jwt") || lower.includes("not authorized") || lower.includes("permission denied")) {
    return new Error("Supabase credentials do not have permission to access the project data.");
  }

  return error instanceof Error ? error : new Error(text || "Supabase request failed");
};

const shouldRetryWithNextKey = (error: unknown) => {
  const text = getErrorText(error).toLowerCase();
  return (
    text.includes("invalid api key") ||
    text.includes("jwt") ||
    text.includes("not authorized") ||
    text.includes("permission denied")
  );
};

const createSupabaseAdmin = (key: string) =>
  createClient(supabaseUrl!, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

async function runWithSupabaseAdmin<T>(operation: (client: ReturnType<typeof createSupabaseAdmin>) => Promise<T>) {
  if (shouldUseLocalFileStorage || !supabaseUrl || supabaseKeys.length === 0) return null;

  let lastError: Error | null = null;

  for (const key of supabaseKeys) {
    const client = createSupabaseAdmin(key);

    try {
      return await operation(client);
    } catch (error) {
      const nextError = toSupabaseError(error);
      lastError = nextError;
      if (!shouldRetryWithNextKey(nextError)) {
        throw nextError;
      }
    }
  }

  throw lastError ?? new Error("Supabase request failed");
}

export function assertWritableStorageConfigured() {
  const problem = getSupabaseConfigProblem();
  if (shouldRequirePersistentStorage && problem) {
    throw new Error(`Supabase is required for write operations in production. ${problem}`);
  }
}

export function getSupabaseAdmin() {
  if (shouldUseLocalFileStorage || !supabaseUrl || supabaseKeys.length === 0) return null;
  return createSupabaseAdmin(supabaseKeys[0]);
}

export async function readJsonValue<T>(key: string, fallback: T): Promise<T> {
  const result = await runWithSupabaseAdmin(async (supabase) => {
    const { data, error } = await supabase.from("map_of_us_store").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return (data?.value as T | null) ?? fallback;
  });

  return result ?? fallback;
}

export async function writeJsonValue<T>(key: string, value: T): Promise<T> {
  const result = await runWithSupabaseAdmin(async (supabase) => {
    const { error } = await supabase
      .from("map_of_us_store")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return value;
  });

  return result ?? value;
}

export class StorageQuotaExceededError extends Error {
  constructor(message = "Storage space is full") {
    super(message);
    this.name = "StorageQuotaExceededError";
  }
}

export const isStorageQuotaExceededError = (error: unknown) => error instanceof StorageQuotaExceededError;

export const isPrivateStorageImageReference = (value: string) => value.startsWith(privateImagePrefix);

const isStorageQuotaError = (error: unknown) => {
  const text = getErrorText(error).toLowerCase();
  return (
    text.includes("quota") ||
    text.includes("limit exceeded") ||
    text.includes("storage exceeded") ||
    text.includes("not enough storage") ||
    text.includes("insufficient storage") ||
    text.includes("resource exhausted")
  );
};

export async function listAdminAlerts() {
  return readJsonValue<AdminAlert[]>(adminAlertsKey, []);
}

export async function recordAdminAlert(alert: Omit<AdminAlert, "id" | "createdAt">) {
  if (!getSupabaseAdmin()) return null;

  const alerts = await listAdminAlerts().catch(() => []);
  const nextAlert: AdminAlert = {
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  await writeJsonValue(adminAlertsKey, [nextAlert, ...alerts].slice(0, 40)).catch(() => undefined);
  return nextAlert;
}

const dataUrlPattern = /^data:([^;]+);base64,(.+)$/;

const extensionByMime = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export function isDataImageUrl(value: string) {
  return value.startsWith("data:image/");
}

export async function uploadDataImage(value: string, pathPrefix: string, fallbackFileName: string) {
  if (!isDataImageUrl(value)) return value;

  const match = dataUrlPattern.exec(value);
  if (!match) return value;

  const [, mimeType, base64] = match;
  const extension = extensionByMime.get(mimeType) ?? "png";
  const filePath = `${pathPrefix}/${fallbackFileName}.${extension}`.replaceAll(/\/+/g, "/");
  const bytes = Buffer.from(base64, "base64");

  const result = await runWithSupabaseAdmin(async (supabase) => {
    const { error } = await supabase.storage.from(supabaseStorageBucket).upload(filePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) throw error;
    return `${privateImagePrefix}${supabaseStorageBucket}/${filePath}`;
  }).catch(async (error) => {
    if (isStorageQuotaError(error)) {
      await recordAdminAlert({
        type: "storage_quota",
        title: "存储空间已满",
        message: "用户上传文件失败，Supabase Storage 可用空间可能已经用完。",
        source: filePath,
      });
      throw new StorageQuotaExceededError();
    }

    throw toSupabaseError(error);
  });

  return result ?? value;
}

const getPrivateStoragePath = (value: string) => {
  if (value.startsWith(privateImagePrefix)) {
    const marker = value.slice(privateImagePrefix.length);
    const [bucket, ...pathParts] = marker.split("/");
    if (bucket !== supabaseStorageBucket || pathParts.length === 0) return null;
    return pathParts.join("/");
  }

  const publicObjectMarker = `/storage/v1/object/public/${supabaseStorageBucket}/`;
  const publicIndex = value.indexOf(publicObjectMarker);
  if (publicIndex >= 0) {
    return value.slice(publicIndex + publicObjectMarker.length).split("?")[0];
  }

  const signedObjectMarker = `/storage/v1/object/sign/${supabaseStorageBucket}/`;
  const signedIndex = value.indexOf(signedObjectMarker);
  if (signedIndex >= 0) {
    return value.slice(signedIndex + signedObjectMarker.length).split("?")[0];
  }

  return null;
};

export function normalizePrivateImageReference(value: string) {
  const filePath = getPrivateStoragePath(value);
  return filePath ? `${privateImagePrefix}${supabaseStorageBucket}/${filePath}` : value;
}

export async function createSignedImageUrl(value: string) {
  const filePath = getPrivateStoragePath(value);
  if (!filePath) return value;

  const result = await runWithSupabaseAdmin(async (supabase) => {
    const { data, error } = await supabase.storage
      .from(supabaseStorageBucket)
      .createSignedUrl(filePath, signedUrlExpiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  }).catch(() => value);

  return result ?? value;
}

export async function createSignedImageMap<T extends Record<string, string>>(items: T): Promise<T> {
  return Object.fromEntries(
    await Promise.all(Object.entries(items).map(async ([key, value]) => [key, await createSignedImageUrl(value)])),
  ) as T;
}
