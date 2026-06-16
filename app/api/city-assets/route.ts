import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { cities } from "@/data/cities";
import {
  assertWritableStorageConfigured,
  createSignedImageMap,
  isPrivateStorageImageReference,
  isSupabaseConfigured,
  isStorageQuotaExceededError,
  readJsonValue,
  uploadDataImage,
  writeJsonValue,
} from "@/lib/server/supabase";
import { isLocalPrivacyRequest, localPrivacyImagePlaceholder } from "@/lib/localPrivacy";
import { getMissingAuthEnv, getSessionUsername, hasSiteSession, requireSiteSession } from "@/lib/server/auth";
import { getPrivateDataFilePath } from "@/lib/server/dataDir";
import { getAccountScopeKey } from "@/lib/server/accountStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CityAssetStore = Record<string, string>;

const cityAssetStorePath = getPrivateDataFilePath("cityAssets.private.json");
const cityAssetStoreKey = "city-assets";
const imageMaxLength = 12_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAllowedImage = (value: string) =>
  value.length <= imageMaxLength &&
  (value.startsWith("/sprites/") ||
    isPrivateStorageImageReference(value) ||
    value.startsWith("https://") ||
    value.startsWith("data:image/"));

function normalizeCityAssetStore(value: unknown): CityAssetStore {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([cityId, image]) =>
      cities.some((city) => city.id === cityId) && typeof image === "string" && isAllowedImage(image),
    ),
  ) as CityAssetStore;
}

async function readCityAssetStore(): Promise<CityAssetStore> {
  if (isSupabaseConfigured) {
    return normalizeCityAssetStore(await readJsonValue(cityAssetStoreKey, {}));
  }

  try {
    const file = await readFile(cityAssetStorePath, "utf8");
    return normalizeCityAssetStore(JSON.parse(file) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeCityAssetStore(store: CityAssetStore) {
  if (isSupabaseConfigured) {
    await writeJsonValue(cityAssetStoreKey, store);
    return;
  }

  await mkdir(path.dirname(cityAssetStorePath), { recursive: true });
  await writeFile(cityAssetStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

const scopedStoreKey = (scopeKey?: string) => (scopeKey ? `${cityAssetStoreKey}:${scopeKey}` : cityAssetStoreKey);

async function readScopedCityAssetStore(scopeKey?: string): Promise<CityAssetStore> {
  if (!isSupabaseConfigured) {
    return readCityAssetStore();
  }

  const scopedAssets = normalizeCityAssetStore(await readJsonValue(scopedStoreKey(scopeKey), {}));
  if (Object.keys(scopedAssets).length > 0 || !scopeKey) return scopedAssets;

  const legacyAssets = await readCityAssetStore();
  if (Object.keys(legacyAssets).length === 0) return scopedAssets;

  await writeJsonValue(scopedStoreKey(scopeKey), legacyAssets);
  return legacyAssets;
}

async function writeScopedCityAssetStore(store: CityAssetStore, scopeKey?: string) {
  if (!isSupabaseConfigured) {
    await writeCityAssetStore(store);
    return;
  }

  await writeJsonValue(scopedStoreKey(scopeKey), store);
}

const signCityAssetStore = (store: CityAssetStore) => createSignedImageMap(store);

const quotaErrorResponse = () =>
  NextResponse.json(
    { error: "存储空间已满，暂时无法上传文件，请稍后再试。" },
    { status: 507 },
  );

const mapCityAssetError = (error: unknown) => {
  if (!(error instanceof Error)) return null;

  const message = error.message.toLowerCase();
  if (message.includes("supabase is required")) {
    return NextResponse.json({ error: "线上图片存储尚未配置完成，请先补齐 Supabase 可写存储。" }, { status: 503 });
  }
  if (message.includes("invalid api key")) {
    return NextResponse.json({ error: "图片存储配置无效，Supabase API Key 不正确。" }, { status: 503 });
  }
  if (message.includes("permission") || message.includes("not allowed")) {
    return NextResponse.json({ error: "当前图片存储权限不足，暂时无法保存地标图片。" }, { status: 403 });
  }
  if (message.includes("data url")) {
    return NextResponse.json({ error: "图片数据格式不正确，请重新选择图片后再试。" }, { status: 400 });
  }

  return null;
};

function parseCityAssetPayload(payload: unknown) {
  if (!isRecord(payload)) return null;

  const cityId = payload.cityId;
  const image = payload.image;

  if (
    typeof cityId !== "string" ||
    typeof image !== "string" ||
    !cities.some((city) => city.id === cityId) ||
    !isAllowedImage(image)
  ) {
    return null;
  }

  return { cityId, image };
}

function parseCityPayload(payload: unknown) {
  if (!isRecord(payload) || typeof payload.cityId !== "string") return null;
  if (!cities.some((city) => city.id === payload.cityId)) return null;

  return { cityId: payload.cityId };
}

const maskCityAssets = (assets: CityAssetStore): CityAssetStore =>
  Object.fromEntries(Object.keys(assets).map((cityId) => [cityId, localPrivacyImagePlaceholder]));

export async function GET(request: NextRequest) {
  if (getMissingAuthEnv().length > 0 || !hasSiteSession(request)) {
    return NextResponse.json({ assets: {} });
  }

  const username = getSessionUsername(request);
  const scope = username ? await getAccountScopeKey(username) : null;
  const assets = await readScopedCityAssetStore(scope?.scopeKey);

  return NextResponse.json({
    assets: isLocalPrivacyRequest(request) ? maskCityAssets(assets) : await signCityAssetStore(assets),
  });
}

export async function PUT(request: NextRequest) {
  const authResponse = requireSiteSession(request);
  if (authResponse) return authResponse;
  const username = getSessionUsername(request);
  if (!username) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const scope = await getAccountScopeKey(username);
  if (!scope) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    assertWritableStorageConfigured();
  } catch {
    return NextResponse.json({ error: "线上图片存储尚未配置完成，请先补齐 Supabase 可写存储。" }, { status: 503 });
  }

  const payload = parseCityAssetPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ error: "Invalid city asset payload" }, { status: 400 });
  }

  try {
    const assets = await readScopedCityAssetStore(scope.scopeKey);
    const image = await uploadDataImage(payload.image, `city-assets/${payload.cityId}`, "landmark");
    const nextAssets = { ...assets, [payload.cityId]: image };

    await writeScopedCityAssetStore(nextAssets, scope.scopeKey);

    return NextResponse.json({ assets: await signCityAssetStore(nextAssets) });
  } catch (error) {
    if (isStorageQuotaExceededError(error)) return quotaErrorResponse();
    const mapped = mapCityAssetError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const authResponse = requireSiteSession(request);
  if (authResponse) return authResponse;
  const username = getSessionUsername(request);
  if (!username) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const scope = await getAccountScopeKey(username);
  if (!scope) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    assertWritableStorageConfigured();
  } catch {
    return NextResponse.json({ error: "线上图片存储尚未配置完成，请先补齐 Supabase 可写存储。" }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);

  if (!isRecord(payload) || !isRecord(payload.assets)) {
    return NextResponse.json({ error: "Invalid city asset store payload" }, { status: 400 });
  }

  try {
    const normalizedAssets = normalizeCityAssetStore(payload.assets);
    const nextAssets = Object.fromEntries(
      await Promise.all(
        Object.entries(normalizedAssets).map(async ([cityId, image]) => [
          cityId,
          await uploadDataImage(image, `city-assets/${cityId}`, "landmark"),
        ]),
      ),
    );

    await writeScopedCityAssetStore(nextAssets, scope.scopeKey);

    return NextResponse.json({ assets: await signCityAssetStore(nextAssets) });
  } catch (error) {
    if (isStorageQuotaExceededError(error)) return quotaErrorResponse();
    const mapped = mapCityAssetError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const authResponse = requireSiteSession(request);
  if (authResponse) return authResponse;
  const username = getSessionUsername(request);
  if (!username) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const scope = await getAccountScopeKey(username);
  if (!scope) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    assertWritableStorageConfigured();
  } catch {
    return NextResponse.json({ error: "线上图片存储尚未配置完成，请先补齐 Supabase 可写存储。" }, { status: 503 });
  }

  const payload = parseCityPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ error: "Invalid city asset payload" }, { status: 400 });
  }

  const assets = await readScopedCityAssetStore(scope.scopeKey);
  const nextAssets = { ...assets };
  delete nextAssets[payload.cityId];

  await writeScopedCityAssetStore(nextAssets, scope.scopeKey);

  return NextResponse.json({ assets: await signCityAssetStore(nextAssets) });
}
