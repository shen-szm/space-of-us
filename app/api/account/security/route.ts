import { NextResponse, type NextRequest } from "next/server";
import { getSessionUsername, requireSiteSession } from "@/lib/server/auth";
import {
  changeOwnAccountPassword,
  findAccount,
  findPublicAccount,
  updateAccountEmail,
  updateAccountThemePreset,
} from "@/lib/server/accountStore";
import { verifyEmailCode } from "@/lib/server/verificationStore";
import { isThemePresetId } from "@/lib/themePresets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const requireRegisteredUser = async (request: NextRequest) => {
  const authError = requireSiteSession(request);
  if (authError) return { authError };
  const username = getSessionUsername(request);
  if (!username) {
    return {
      authError: NextResponse.json({ error: "Registered account login is required" }, { status: 401 }),
    };
  }
  return { username };
};

export async function GET(request: NextRequest) {
  const session = await requireRegisteredUser(request);
  if (session.authError) return session.authError;
  const user = await findPublicAccount(session.username);
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const session = await requireRegisteredUser(request);
  if (session.authError) return session.authError;

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload) || typeof payload.action !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    if (payload.action === "changePassword") {
      const currentPassword = cleanString(payload.currentPassword, 80);
      const newPassword = cleanString(payload.newPassword, 80);
      if (currentPassword.length < 4 || newPassword.length < 4) {
        return NextResponse.json({ error: "Invalid password fields" }, { status: 400 });
      }
      const user = await changeOwnAccountPassword({
        username: session.username,
        currentPassword,
        newPassword,
      });
      return NextResponse.json({ ok: true, user });
    }

    if (payload.action === "updateEmail") {
      const email = cleanString(payload.email, 120).toLowerCase();
      const emailCode = cleanString(payload.emailCode, 12).toUpperCase();
      if (!email.includes("@") || emailCode.length < 4) {
        return NextResponse.json({ error: "Invalid email fields" }, { status: 400 });
      }
      const current = await findAccount(session.username);
      if (!current) return NextResponse.json({ error: "Account not found" }, { status: 404 });
      await verifyEmailCode({
        purpose: "rebind",
        email,
        code: emailCode,
        targetUsername: session.username,
      });
      const user = await updateAccountEmail({ username: session.username, email });
      return NextResponse.json({ ok: true, user });
    }

    if (payload.action === "updateThemePreset") {
      const themePreset = cleanString(payload.themePreset, 40);
      if (!isThemePresetId(themePreset)) {
        return NextResponse.json({ error: "Invalid theme preset" }, { status: 400 });
      }
      const customThemeColor = cleanString(payload.customThemeColor, 20);
      const user = await updateAccountThemePreset({ username: session.username, themePreset, customThemeColor });
      return NextResponse.json({ ok: true, user });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Security update failed";
    if (
      message === "Current password is incorrect" ||
      message === "Invalid email code" ||
      message === "Email code expired"
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Email already exists") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
