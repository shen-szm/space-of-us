import { createClient } from "@supabase/supabase-js";
import type { AdminAlert } from "@/data/adminAlerts";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldUseLocalFileStorage = process.env.MAP_OF_US_STORAGE_MODE === "local";

export const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? "map-of-us";
const privateImagePrefix = "supabase-private://";
const signedUrlExpiresInSeconds = 60 * 60 * 24;
const adminAlertsKey = "admin-alerts";

export const isSupabaseConfigured = !shouldUseLocalFileStorage && Boolean(supabaseUrl && supabaseServiceRoleKey);
export const shouldRequirePersistentStorage = process.env.NODE_ENV === "production" && !shouldUseLocalFileStorage;

export function assertWritableStorageConfigured() {
  if (shouldRequirePersistentStorage && !isSupabaseConfigured) {
    throw new Error("Supabase is required for write operations in production.");
  }
}

export function getSupabaseAdmin() {
  if (shouldUseLocalFileStorage) return null;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function readJsonValue<T>(key: string, fallback: T): Promise<T> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("map_of_us_store")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;

  return (data?.value as T | null) ?? fallback;
}

export async function writeJsonValue<T>(key: string, value: T): Promise<T> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return value;

  const { error } = await supabase
    .from("map_of_us_store")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw error;

  return value;
}

export class StorageQuotaExceededError extends Error {
  constructor(message = "Storage space is full") {
    super(message);
    this.name = "StorageQuotaExceededError";
  }
}

export const isStorageQuotaExceededError = (error: unknown) =>
  error instanceof StorageQuotaExceededError;

export const isPrivateStorageImageReference = (value: string) => value.startsWith(privateImagePrefix);

const getErrorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
};

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
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

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

export async function uploadDataImage(
  value: string,
  pathPrefix: string,
  fallbackFileName: string,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isDataImageUrl(value)) return value;

  const match = dataUrlPattern.exec(value);
  if (!match) return value;

  const [, mimeType, base64] = match;
  const extension = extensionByMime.get(mimeType) ?? "png";
  const filePath = `${pathPrefix}/${fallbackFileName}.${extension}`.replaceAll(/\/+/g, "/");
  const bytes = Buffer.from(base64, "base64");
  const { error } = await supabase.storage.from(supabaseStorageBucket).upload(filePath, bytes, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    if (isStorageQuotaError(error)) {
      await recordAdminAlert({
        type: "storage_quota",
        title: "存储空间已满",
        message: "用户上传文件失败，Supabase Storage 可用空间可能已经用完。",
        source: filePath,
      });
      throw new StorageQuotaExceededError();
    }

    throw error;
  }

  return `${privateImagePrefix}${supabaseStorageBucket}/${filePath}`;
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
  const supabase = getSupabaseAdmin();
  const filePath = getPrivateStoragePath(value);
  if (!supabase || !filePath) return value;

  const { data, error } = await supabase.storage
    .from(supabaseStorageBucket)
    .createSignedUrl(filePath, signedUrlExpiresInSeconds);

  if (error) return value;
  return data.signedUrl;
}

export async function createSignedImageMap<T extends Record<string, string>>(items: T): Promise<T> {
  return Object.fromEntries(
    await Promise.all(Object.entries(items).map(async ([key, value]) => [key, await createSignedImageUrl(value)])),
  ) as T;
}
