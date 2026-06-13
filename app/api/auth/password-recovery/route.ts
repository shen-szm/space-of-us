import { NextResponse } from "next/server";
import { findAccount, findAccountByEmail } from "@/lib/server/accountStore";
import { issuePasswordResetGrant, verifyEmailCode } from "@/lib/server/verificationStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const action = payload.action;
  if (action !== "verifyCode") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const identifier = cleanString(payload.identifier, 120);
  const code = cleanString(payload.emailCode, 12).toUpperCase();
  if (!identifier || code.length < 4) {
    return NextResponse.json({ error: "Invalid recovery fields" }, { status: 400 });
  }

  const account = identifier.includes("@") ? await findAccountByEmail(identifier) : await findAccount(identifier);
  if (!account || !account.email) {
    return NextResponse.json({ error: "Account email not found" }, { status: 404 });
  }

  try {
    await verifyEmailCode({
      purpose: "recover",
      email: account.email,
      code,
      targetUsername: account.username,
    });
    const grant = await issuePasswordResetGrant(account.id, account.username);
    return NextResponse.json({ ok: true, grantToken: grant.token, expiresAt: grant.expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recovery verification failed";
    const status = message === "Invalid email code" || message === "Email code expired" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
