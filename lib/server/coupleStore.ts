import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { type CoupleHubStore, type CoupleOrder, defaultCoupleStore } from "@/data/couple";
import { getPrivateDataFilePath } from "@/lib/server/dataDir";
import {
  assertWritableStorageConfigured,
  getSupabaseAdmin,
  readJsonValue,
  writeJsonValue,
} from "@/lib/server/supabase";

const storeKey = "couple-hub";
const localFileName = "couple-hub.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanOrders = (value: unknown): CoupleOrder[] => {
  if (!Array.isArray(value)) return [];

  const orders = value.filter(isRecord).reduce<CoupleOrder[]>((result, order) => {
      if (
        typeof order.id !== "string" ||
        typeof order.title !== "string" ||
        (order.from !== "a" && order.from !== "b") ||
        (order.to !== "a" && order.to !== "b") ||
        typeof order.createdAt !== "string" ||
        typeof order.updatedAt !== "string"
      ) {
        return result;
      }

      result.push({
        id: order.id,
        itemId: typeof order.itemId === "string" ? order.itemId : undefined,
        title: order.title,
        brand: typeof order.brand === "string" ? order.brand : undefined,
        details: typeof order.details === "string" ? order.details : undefined,
        senderNote:
          typeof order.senderNote === "string"
            ? order.senderNote
            : typeof order.note === "string"
              ? order.note
              : undefined,
        senderFeedback: typeof order.senderFeedback === "string" ? order.senderFeedback : undefined,
        senderFeedbackAt: typeof order.senderFeedbackAt === "string" ? order.senderFeedbackAt : undefined,
        resolvedAt:
          typeof order.resolvedAt === "string"
            ? order.resolvedAt
            : typeof order.completedAt === "string"
              ? order.completedAt
              : undefined,
        resolvedBy: order.resolvedBy === "a" || order.resolvedBy === "b" ? order.resolvedBy : undefined,
        from: order.from,
        to: order.to,
        status:
          order.status === "completed" || order.status === "declined" || order.status === "accepted"
            ? order.status
            : "pending",
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        completedAt: typeof order.completedAt === "string" ? order.completedAt : undefined,
      } satisfies CoupleOrder);

      return result;
    }, []);

  return orders;
};

const hasCoupleData = (store: CoupleHubStore) =>
  store.agreements.length > 0 ||
  store.menu.length > 0 ||
  store.orders.length > 0 ||
  Boolean(store.profile.boundAt) ||
  Boolean(store.profile.inviteCodeHash) ||
  Boolean(store.profile.partners.a) ||
  Boolean(store.profile.partners.b);

const normalizeStore = (value: unknown): CoupleHubStore => {
  const fallback = defaultCoupleStore();
  if (!isRecord(value)) return fallback;

  const profile = isRecord(value.profile) ? value.profile : {};
  const partners = isRecord(profile.partners) ? profile.partners : {};

  return {
    profile: {
      id: typeof profile.id === "string" && profile.id ? profile.id : fallback.profile.id,
      inviteCodeHash: typeof profile.inviteCodeHash === "string" ? profile.inviteCodeHash : undefined,
      inviteCodePreview: typeof profile.inviteCodePreview === "string" ? profile.inviteCodePreview : undefined,
      inviteCreatedAt: typeof profile.inviteCreatedAt === "string" ? profile.inviteCreatedAt : undefined,
      boundAt: typeof profile.boundAt === "string" ? profile.boundAt : undefined,
      partners: {
        a: isRecord(partners.a)
          ? {
              name: typeof partners.a.name === "string" ? partners.a.name : "\u6211",
              avatar: typeof partners.a.avatar === "string" ? partners.a.avatar : undefined,
              joinedAt: typeof partners.a.joinedAt === "string" ? partners.a.joinedAt : new Date().toISOString(),
            }
          : undefined,
        b: isRecord(partners.b)
          ? {
              name: typeof partners.b.name === "string" ? partners.b.name : "TA",
              avatar: typeof partners.b.avatar === "string" ? partners.b.avatar : undefined,
              joinedAt: typeof partners.b.joinedAt === "string" ? partners.b.joinedAt : new Date().toISOString(),
            }
          : undefined,
      },
    },
    agreements: Array.isArray(value.agreements) ? value.agreements : [],
    menu: Array.isArray(value.menu) ? value.menu : [],
    orders: cleanOrders(value.orders),
  };
};

const readLocalStore = async () => {
  try {
    const content = await readFile(getPrivateDataFilePath(localFileName), "utf8");
    return normalizeStore(JSON.parse(content) as unknown);
  } catch {
    return defaultCoupleStore();
  }
};

const writeLocalStore = async (store: CoupleHubStore) => {
  const filePath = getPrivateDataFilePath(localFileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return store;
};

const scopedStoreKey = (scopeKey?: string) => (scopeKey ? `${storeKey}:${scopeKey}` : storeKey);

export const readCoupleStore = async (scopeKey?: string) => {
  if (!getSupabaseAdmin()) return readLocalStore();

  const scopedKey = scopedStoreKey(scopeKey);
  const scopedStore = normalizeStore(await readJsonValue(scopedKey, defaultCoupleStore()));

  if (hasCoupleData(scopedStore) || !scopeKey) return scopedStore;

  const legacyStore = normalizeStore(await readJsonValue(storeKey, defaultCoupleStore()));
  if (!hasCoupleData(legacyStore)) return scopedStore;

  await writeJsonValue(scopedKey, legacyStore);
  return legacyStore;
};

export const writeCoupleStore = async (store: CoupleHubStore, scopeKey?: string) => {
  assertWritableStorageConfigured();
  if (!getSupabaseAdmin()) return writeLocalStore(store);
  return writeJsonValue(scopedStoreKey(scopeKey), store);
};

export const createInviteCode = () =>
  randomBytes(4).toString("base64url").replaceAll(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();

export const hashInviteCode = (code: string) => {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("AUTH_COOKIE_SECRET is required");
  return createHmac("sha256", secret).update(code.trim().toUpperCase()).digest("base64url");
};

export const verifyInviteCode = (code: string, hash?: string) => {
  if (!hash) return false;
  const candidate = hashInviteCode(code);
  const left = Buffer.from(candidate);
  const right = Buffer.from(hash);
  return left.length === right.length && timingSafeEqual(left, right);
};
