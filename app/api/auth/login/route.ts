import { NextResponse, type NextRequest } from "next/server";
import {
  clearAuthCookies,
  getMissingAuthEnv,
  setAuthCookies,
  type AuthRole,
  verifyPassword,
} from "@/lib/server/auth";
import { markAccountLogin, verifyAccountPassword } from "@/lib/server/accountStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseLoginPayload = (payload: unknown): { role: AuthRole; username: string; password: string } | null => {
  if (!isRecord(payload) || typeof payload.password !== "string") return null;

  return {
    role: payload.mode === "admin" ? "admin" : "site",
    username: typeof payload.username === "string" ? payload.username.trim() : "",
    password: payload.password,
  };
};

const parseLogoutPayload = (payload: unknown): AuthRole | "all" => {
  if (!isRecord(payload)) return "all";
  if (payload.mode === "site" || payload.mode === "admin") return payload.mode;

  return "all";
};

const isStorageConfigError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("supabase is required");

export async function POST(request: NextRequest) {
  const payload = parseLoginPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
  }

  const missingEnv = getMissingAuthEnv(true);
  if (missingEnv.length > 0) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  if (payload.role === "admin") {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    if (payload.username && payload.username.toLowerCase() !== adminUsername.toLowerCase()) {
      return NextResponse.json({ error: "Invalid admin account" }, { status: 401 });
    }
  }

  let verifiedAccount: Awaited<ReturnType<typeof verifyAccountPassword>> = null;
  try {
    verifiedAccount =
      payload.role === "site" && payload.username
        ? await verifyAccountPassword(payload.username, payload.password)
        : null;
  } catch (error) {
    if (isStorageConfigError(error)) {
      return NextResponse.json(
        { error: "Database is not configured. Please finish Supabase setup and redeploy." },
        { status: 503 },
      );
    }
    throw error;
  }

  const verifiedSharedPassword = payload.role === "site" && !payload.username && verifyPassword("site", payload.password);
  const verifiedAdmin = payload.role === "admin" && verifyPassword("admin", payload.password);

  if (!verifiedAccount && !verifiedSharedPassword && !verifiedAdmin) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  if (verifiedAccount) {
    await markAccountLogin(verifiedAccount.username);
  }

  const response = NextResponse.json({
    ok: true,
    role: payload.role,
    user: verifiedAccount
      ? {
          id: verifiedAccount.id,
          username: verifiedAccount.username,
          displayName: verifiedAccount.displayName,
        }
      : null,
  });
  setAuthCookies(response, payload.role, verifiedAccount?.username);

  return response;
}

export async function DELETE(request: NextRequest) {
  const role = parseLogoutPayload(await request.json().catch(() => null));
  const response = NextResponse.json({ ok: true });

  clearAuthCookies(response, role);

  return response;
}
