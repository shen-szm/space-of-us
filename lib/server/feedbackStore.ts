import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { FeedbackStatus, UserFeedback, UserFeedbackCategory } from "@/data/feedback";
import { getPrivateDataFilePath } from "@/lib/server/dataDir";
import { assertWritableStorageConfigured, getSupabaseAdmin, readJsonValue, writeJsonValue } from "@/lib/server/supabase";

const storeKey = "user-feedback";
const localFileName = "user-feedback.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const categories = new Set<UserFeedbackCategory>(["bug", "idea", "experience", "other"]);
const statuses = new Set<FeedbackStatus>(["new", "resolved"]);

const cleanFeedback = (value: unknown): UserFeedback | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.username !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.message !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    username: value.username,
    displayName: value.displayName,
    email: typeof value.email === "string" ? value.email : undefined,
    category: categories.has(value.category as UserFeedbackCategory)
      ? (value.category as UserFeedbackCategory)
      : "other",
    message: value.message,
    status: statuses.has(value.status as FeedbackStatus) ? (value.status as FeedbackStatus) : "new",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    resolvedAt: typeof value.resolvedAt === "string" ? value.resolvedAt : undefined,
    resolvedBy: typeof value.resolvedBy === "string" ? value.resolvedBy : undefined,
  };
};

const normalizeStore = (value: unknown) => {
  if (!Array.isArray(value)) return [] as UserFeedback[];
  return value.map(cleanFeedback).filter((item): item is UserFeedback => Boolean(item));
};

const readLocalStore = async () => {
  try {
    const content = await readFile(getPrivateDataFilePath(localFileName), "utf8");
    return normalizeStore(JSON.parse(content) as unknown);
  } catch {
    return [] as UserFeedback[];
  }
};

const writeLocalStore = async (feedback: UserFeedback[]) => {
  const filePath = getPrivateDataFilePath(localFileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(feedback, null, 2)}\n`, "utf8");
  return feedback;
};

export const readFeedbackStore = async () => {
  if (!getSupabaseAdmin()) {
    assertWritableStorageConfigured();
    return readLocalStore();
  }
  return normalizeStore(await readJsonValue(storeKey, []));
};

export const writeFeedbackStore = async (feedback: UserFeedback[]) => {
  assertWritableStorageConfigured();
  if (!getSupabaseAdmin()) return writeLocalStore(feedback);
  return writeJsonValue(storeKey, feedback);
};
