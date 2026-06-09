import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/server/auth";
import {
  adminResetAccountPassword,
  listPublicAccounts,
  registerAccount,
  resetAccountPassword,
} from "@/lib/server/accountStore";

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

  return NextResponse.json({ users: await listPublicAccounts() });
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!isRecord(payload) || typeof payload.action !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const username = cleanString(payload.username, 40);
  const displayName = cleanString(payload.displayName, 40);
  const password = cleanString(payload.password, 80);
  const recoveryPhrase = cleanString(payload.recoveryPhrase, 120);

  if (payload.action === "register") {
    const registerRecoveryPhrase = recoveryPhrase || password;

    if (username.length < 2 || password.length < 4 || registerRecoveryPhrase.length < 2) {
      return NextResponse.json({ error: "Invalid account fields" }, { status: 400 });
    }

    try {
      const user = await registerAccount({ username, displayName, password, recoveryPhrase: registerRecoveryPhrase });
      return NextResponse.json({ ok: true, user });
    } catch (error) {
      if (isStorageConfigError(error)) return storageErrorResponse();
      const message = getErrorMessage(error);
      if (message === "Account already exists") {
        return NextResponse.json({ error: "Account already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: `Account registration failed: ${message}` }, { status: 500 });
    }
  }

  if (payload.action === "resetPassword") {
    const newPassword = cleanString(payload.newPassword, 80);
    if (username.length < 2 || recoveryPhrase.length < 2 || newPassword.length < 4) {
      return NextResponse.json({ error: "Invalid reset fields" }, { status: 400 });
    }

    try {
      const user = await resetAccountPassword({ username, recoveryPhrase, newPassword });
      return NextResponse.json({ ok: true, user });
    } catch (error) {
      if (isStorageConfigError(error)) return storageErrorResponse();
      const message = getErrorMessage(error);
      const status = message === "Account not found" || message === "Invalid recovery phrase" ? 401 : 500;
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
