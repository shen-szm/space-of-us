import { NextResponse, type NextRequest } from "next/server";
import { requireSiteSession } from "@/lib/server/auth";
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

async function writeStore(store: SharedItemStore) {
  assertWritableStorageConfigured();
  await writeJsonValue(storeKey, store);
  return store;
}

export async function GET(request: NextRequest) {
  const authError = requireSiteSession(request);
  if (authError) return authError;

  const kind = getKind(request);
  if (!kind) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });

  try {
    const store = await readStore();
    return NextResponse.json({ items: store[kind] });
  } catch (error) {
    if (isStorageConfigError(error)) return storageErrorResponse();
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireSiteSession(request);
  if (authError) return authError;

  const payload = await request.json().catch(() => null);
  const kind = getKind(request, payload);
  if (!kind || !isRecord(payload)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const store = await readStore();
    store[kind] = normalizeItems(payload.items);
    await writeStore(store);
    return NextResponse.json({ items: store[kind] });
  } catch (error) {
    if (isStorageConfigError(error)) return storageErrorResponse();
    throw error;
  }
}
