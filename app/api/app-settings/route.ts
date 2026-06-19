import { NextResponse, type NextRequest } from "next/server";
import { normalizeAppSettings } from "@/data/appSettings";
import { requireSiteSession } from "@/lib/server/auth";
import { assertWritableStorageConfigured, readJsonValue, writeJsonValue } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const storeKey = "app-settings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStorageConfigError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("supabase is required");

const storageErrorResponse = () =>
  NextResponse.json(
    { error: "Database is not configured. Please finish Supabase setup and redeploy." },
    { status: 503 },
  );

async function readStore() {
  return normalizeAppSettings(await readJsonValue(storeKey, {}));
}

async function writeStore(settings: unknown) {
  assertWritableStorageConfigured();
  const normalized = normalizeAppSettings(settings);
  await writeJsonValue(storeKey, normalized);
  return normalized;
}

export async function GET(request: NextRequest) {
  const authError = requireSiteSession(request);
  if (authError) return authError;

  try {
    return NextResponse.json({ settings: await readStore() });
  } catch (error) {
    if (isStorageConfigError(error)) return storageErrorResponse();
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireSiteSession(request);
  if (authError) return authError;

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    return NextResponse.json({ settings: await writeStore(payload.settings) });
  } catch (error) {
    if (isStorageConfigError(error)) return storageErrorResponse();
    throw error;
  }
}
