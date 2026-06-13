import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/server/auth";
import {
  adminResetAccountPassword,
  listPublicAccounts,
  registerAccount,
  resetAccountPasswordByUsername,
} from "@/lib/server/accountStore";
import { consumePasswordResetGrant, verifyEmailCode } from "@/lib/server/verificationStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const isStorageConfigError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("supabase is required");

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

const storageErrorResponse = () =>
  NextResponse.json(
    { error: "Database is not configured. Please finish Supabase setup and redeploy." },
    { status: 503 },
  );

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;

  try {
    return NextResponse.json({ users: await listPublicAccounts() });
  } catch (error) {
    if (isStorageConfigError(error)) return storageErrorResponse();
    return NextResponse.json({ error: `Load users failed: ${getErrorMessage(error)}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!isRecord(payload) || typeof payload.action !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const username = cleanString(payload.username, 40);
  const displayName = cleanString(payload.displayName, 40);
  const email = cleanString(payload.email, 120).toLowerCase();
  const password = cleanString(payload.password, 80);

  if (payload.action === "register") {
    const emailCode = cleanString(payload.emailCode, 12).toUpperCase();
    if (username.length < 2 || password.length < 4 || email.length < 5 || !email.includes("@") || emailCode.length < 4) {
      return NextResponse.json({ error: "Invalid account fields" }, { status: 400 });
    }

    try {
      await verifyEmailCode({ purpose: "register", email, code: emailCode });
      const user = await registerAccount({ username, displayName, email, password });
      return NextResponse.json({ ok: true, user });
    } catch (error) {
      if (isStorageConfigError(error)) return storageErrorResponse();
      const message = getErrorMessage(error);
      if (message === "Account already exists" || message === "Email already exists") {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      if (
        message === "Email code expired" ||
        message === "Invalid email code" ||
        message === "Too many verification attempts"
      ) {
        return NextResponse.json({ error: message }, { status: 401 });
      }
      return NextResponse.json({ error: `Account registration failed: ${message}` }, { status: 500 });
    }
  }

  if (payload.action === "resetPassword") {
    const grantToken = cleanString(payload.grantToken, 160);
    const newPassword = cleanString(payload.newPassword, 80);
    if (!grantToken || newPassword.length < 4) {
      return NextResponse.json({ error: "Invalid reset fields" }, { status: 400 });
    }

    try {
      const grant = await consumePasswordResetGrant(grantToken);
      const user = await resetAccountPasswordByUsername({ username: grant.accountUsername, newPassword });
      return NextResponse.json({ ok: true, user });
    } catch (error) {
      if (isStorageConfigError(error)) return storageErrorResponse();
      const message = getErrorMessage(error);
      const status = message.includes("expired") ? 401 : 500;
      return NextResponse.json({ error: `Reset verification failed: ${message}` }, { status });
    }
  }

  if (payload.action === "adminResetPassword") {
    const authError = requireAdminSession(request);
    if (authError) return authError;

    const newPassword = cleanString(payload.newPassword, 80);
    if (username.length < 2 || newPassword.length < 4) {
      return NextResponse.json({ error: "Invalid admin reset fields" }, { status: 400 });
    }

    try {
      const user = await adminResetAccountPassword({ username, newPassword });
      return NextResponse.json({ ok: true, user });
    } catch (error) {
      if (isStorageConfigError(error)) return storageErrorResponse();
      const message = getErrorMessage(error);
      const status = message === "Account not found" ? 404 : 500;
      return NextResponse.json({ error: `Admin reset failed: ${message}` }, { status });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
