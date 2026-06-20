import { NextResponse, type NextRequest } from "next/server";
import {
  clearAuthCookies,
  getMissingAuthEnv,
  setAuthCookies,
  type AuthRole,
  verifyPassword,
} from "@/lib/server/auth";
import {
  clearLoginRateLimit,
  consumeLoginRateLimit,
  getLoginRateLimitStatus,
} from "@/lib/server/loginRateLimit";
import { resolveLoginRole } from "@/lib/server/loginIdentity";
import { markAccountLogin, verifyAccountPassword } from "@/lib/server/accountStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseLoginPayload = (payload: unknown): { role: AuthRole; username: string; password: string } | null => {
  if (!isRecord(payload) || typeof payload.password !== "string") return null;

  return {
    role: resolveLoginRole({
      requestedMode: payload.mode === "admin" ? "admin" : "site",
      username: typeof payload.username === "string" ? payload.username : "",
      adminUsername: process.env.ADMIN_USERNAME,
    }),
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

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
};

const buildActorKey = (request: NextRequest, payload: { role: AuthRole; username: string }) => {
  const normalizedUsername = payload.username.trim().toLowerCase() || "shared";
  return `${payload.role}:${normalizedUsername}:${getClientIp(request)}`;
};

const createRateLimitedResponse = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: "Too many failed login attempts. Please wait before trying again." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );

export async function POST(request: NextRequest) {
  const payload = parseLoginPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
  }

  const actorKey = buildActorKey(request, payload);
  const limitStatus = getLoginRateLimitStatus(actorKey);
  if (!limitStatus.allowed) {
    return createRateLimitedResponse(limitStatus.retryAfterSeconds);
  }

  const missingEnv = getMissingAuthEnv(true);
  if (missingEnv.length > 0) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  const rejectLogin = () => {
    const result = consumeLoginRateLimit(actorKey);
    if (!result.allowed) {
      return createRateLimitedResponse(result.retryAfterSeconds);
    }
    return NextResponse.json(
      { error: payload.role === "admin" ? "Invalid admin password" : "Invalid account password" },
      { status: 401 },
    );
  };

  if (payload.role === "admin") {
    const adminUsernames = new Set(
      [process.env.ADMIN_USERNAME, "admin"]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim().toLowerCase()),
    );
    if (payload.username && !adminUsernames.has(payload.username.toLowerCase())) {
      return rejectLogin();
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

  const verifiedSharedPassword =
    payload.role === "site" && !payload.username && verifyPassword("site", payload.password);
  const verifiedAdmin = payload.role === "admin" && verifyPassword("admin", payload.password);

  if (!verifiedAccount && !verifiedSharedPassword && !verifiedAdmin) {
    return rejectLogin();
  }

  clearLoginRateLimit(actorKey);

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
