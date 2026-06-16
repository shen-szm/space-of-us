import { NextResponse, type NextRequest } from "next/server";
import { getSessionUsername, requireSiteSession } from "@/lib/server/auth";
import { getAccountBindingContext, getAccountScopeKey } from "@/lib/server/accountStore";
import { assertWritableStorageConfigured, readJsonValue, writeJsonValue } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SharedItemKind = "favorite" | "anniversary" | "capsule";
type SharedItem = {
  id: string;
  title: string;
  date?: string;
  note: string;
  cityId?: string;
};
type SharedItemStore = Record<SharedItemKind, SharedItem[]>;

const storeKey = "shared-items";
const allowedKinds = new Set<SharedItemKind>(["favorite", "anniversary", "capsule"]);

const emptyStore = (): SharedItemStore => ({
  favorite: [],
  anniversary: [],
  capsule: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const normalizeItem = (value: unknown): SharedItem | null => {
  if (!isRecord(value)) return null;

  const id = cleanString(value.id, 120);
  const title = cleanString(value.title, 120);
  const note = cleanString(value.note, 2000) ?? "";
  const date = cleanString(value.date, 20);
  const cityId = cleanString(value.cityId, 80);

  if (!id || !title) return null;

  return {
    id,
    title,
    note,
    date,
    cityId,
  };
};

const normalizeItems = (value: unknown): SharedItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeItem).filter((item): item is SharedItem => Boolean(item));
};

const normalizeStore = (value: unknown): SharedItemStore => {
  if (!isRecord(value)) return emptyStore();
  return {
    favorite: normalizeItems(value.favorite),
    anniversary: normalizeItems(value.anniversary),
    capsule: normalizeItems(value.capsule),
  };
};

const getKind = (request: NextRequest, payload?: unknown): SharedItemKind | null => {
  const fromQuery = request.nextUrl.searchParams.get("kind");
  if (fromQuery && allowedKinds.has(fromQuery as SharedItemKind)) return fromQuery as SharedItemKind;
  if (isRecord(payload) && allowedKinds.has(String(payload.kind) as SharedItemKind)) {
    return String(payload.kind) as SharedItemKind;
  }
  return null;
};

const isStorageConfigError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("supabase is required");

const storageErrorResponse = () =>
  NextResponse.json(
    { error: "Database is not configured. Please finish Supabase setup and redeploy." },
    { status: 503 },
  );

async function readStore() {
  return normalizeStore(await readJsonValue(storeKey, emptyStore()));
}

async function readScopedStore(scopeKey: string) {
  return normalizeStore(await readJsonValue(`${storeKey}:${scopeKey}`, emptyStore()));
}

async function writeScopedStore(scopeKey: string, store: SharedItemStore) {
  assertWritableStorageConfigured();
  await writeJsonValue(`${storeKey}:${scopeKey}`, store);
  return store;
}

export async function GET(request: NextRequest) {
  const authError = requireSiteSession(request);
  if (authError) return authError;

  const username = getSessionUsername(request);
  if (!username) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const scope = await getAccountScopeKey(username);
  if (!scope) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const kind = getKind(request);
  if (!kind) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });

  try {
    const scopedStore = await readScopedStore(scope.scopeKey);
    if (scopedStore[kind].length > 0) {
      return NextResponse.json({ items: scopedStore[kind] });
    }

    const legacyStore = await readStore();
    if (legacyStore[kind].length > 0) {
      const migratedStore = { ...scopedStore, [kind]: legacyStore[kind] };
      await writeScopedStore(scope.scopeKey, migratedStore);
      return NextResponse.json({ items: migratedStore[kind] });
    }

    const store = scopedStore;
    return NextResponse.json({ items: store[kind] });
  } catch (error) {
    if (isStorageConfigError(error)) return storageErrorResponse();
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireSiteSession(request);
  if (authError) return authError;

  const username = getSessionUsername(request);
  if (!username) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const scope = await getAccountScopeKey(username);
  if (!scope) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const kind = getKind(request, payload);
  if (!kind || !isRecord(payload)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const binding = await getAccountBindingContext(username);
  if (!binding.isBound) {
    return NextResponse.json({ error: "请先完成情侣绑定后再编辑共享内容" }, { status: 403 });
  }

  try {
    const store = await readScopedStore(scope.scopeKey);
    store[kind] = normalizeItems(payload.items);
    await writeScopedStore(scope.scopeKey, store);
    return NextResponse.json({ items: store[kind] });
  } catch (error) {
    if (isStorageConfigError(error)) return storageErrorResponse();
    throw error;
  }
}
