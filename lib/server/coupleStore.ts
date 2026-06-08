import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  type CoupleHubStore,
  defaultCoupleStore,
} from "@/data/couple";
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
              name: typeof partners.a.name === "string" ? partners.a.name : "我",
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
    orders: Array.isArray(value.orders) ? value.orders : [],
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

export const readCoupleStore = async () => {
  if (!getSupabaseAdmin()) return readLocalStore();
  return normalizeStore(await readJsonValue(storeKey, defaultCoupleStore()));
};

export const writeCoupleStore = async (store: CoupleHubStore) => {
  assertWritableStorageConfigured();
  if (!getSupabaseAdmin()) return writeLocalStore(store);
  return writeJsonValue(storeKey, store);
};

export const createInviteCode = () =>
  randomBytes(4).toString("base64url").replaceAll(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();

export const hashInviteCode = (code: string) => {
  const secret = process.env.AUTH_COOKIE_SECRET ?? "map-of-us-local-dev";
  return createHmac("sha256", secret).update(code.trim().toUpperCase()).digest("base64url");
};

export const verifyInviteCode = (code: string, hash?: string) => {
  if (!hash) return false;
  const candidate = hashInviteCode(code);
  const left = Buffer.from(candidate);
  const right = Buffer.from(hash);
  return left.length === right.length && timingSafeEqual(left, right);
};
