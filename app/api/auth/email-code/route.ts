import { NextResponse, type NextRequest } from "next/server";
import { getSessionUsername, requireSiteSession } from "@/lib/server/auth";
import { findAccount, findAccountByEmail } from "@/lib/server/accountStore";
import { sendRecoverCodeEmail, sendRegisterCodeEmail, sendRebindCodeEmail } from "@/lib/server/mail";
import { createEmailCode, verifyCaptchaChallenge } from "@/lib/server/verificationStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

const isMailConfigError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("mail service is not configured");

const mailConfigResponse = () =>
  NextResponse.json({ error: "Mail service is not configured. Please add Resend env vars and redeploy." }, { status: 503 });

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!isRecord(payload)) return fail("Invalid payload");

  const purpose = payload.purpose;
  if (purpose !== "register" && purpose !== "recover" && purpose !== "rebind") {
    return fail("Invalid purpose");
  }

  try {
    if (purpose === "register") {
      const email = cleanString(payload.email, 120).toLowerCase();
      const captchaToken = cleanString(payload.captchaToken, 160);
      const captchaAnswer = cleanString(payload.captchaAnswer, 20);
      if (!email.includes("@") || !captchaToken || !captchaAnswer) {
        return fail("Invalid verification fields");
      }
      if (await findAccountByEmail(email)) {
        return fail("Email already exists", 409);
      }
      await verifyCaptchaChallenge(captchaToken, captchaAnswer);
      const { code, expiresAt } = await createEmailCode({ purpose, email });
      await sendRegisterCodeEmail(email, code);
      return NextResponse.json({ ok: true, expiresAt });
    }

    if (purpose === "recover") {
      const identifier = cleanString(payload.identifier, 120);
      const captchaToken = cleanString(payload.captchaToken, 160);
      const captchaAnswer = cleanString(payload.captchaAnswer, 20);
      if (!identifier || !captchaToken || !captchaAnswer) {
        return fail("Invalid verification fields");
      }
      await verifyCaptchaChallenge(captchaToken, captchaAnswer);
      const account = identifier.includes("@") ? await findAccountByEmail(identifier) : await findAccount(identifier);
      if (!account || !account.email) {
        return fail("Account email not found", 404);
      }
      const { code, expiresAt } = await createEmailCode({
        purpose,
        email: account.email,
        targetUsername: account.username,
      });
      await sendRecoverCodeEmail(account.email, code);
      return NextResponse.json({ ok: true, expiresAt, maskedEmail: maskEmail(account.email) });
    }

    const authError = requireSiteSession(request);
    if (authError) return authError;
    const username = getSessionUsername(request);
    if (!username) return fail("Registered account login is required", 401);
    const email = cleanString(payload.email, 120).toLowerCase();
    if (!email.includes("@")) return fail("Invalid email");
    const current = await findAccount(username);
    if (!current) return fail("Account not found", 404);
    if (current.email === email) return fail("This email is already bound");
    if (await findAccountByEmail(email)) return fail("Email already exists", 409);
    const { code, expiresAt } = await createEmailCode({ purpose: "rebind", email, targetUsername: username });
    await sendRebindCodeEmail(email, code);
    return NextResponse.json({ ok: true, expiresAt });
  } catch (error) {
    if (isMailConfigError(error)) return mailConfigResponse();
    const message = error instanceof Error ? error.message : "Email delivery failed";
    if (message === "Captcha expired" || message === "Invalid captcha") return fail(message, 401);
    if (message === "Please wait before requesting another code" || message === "Daily email limit reached") {
      return fail(message, 429);
    }
    return fail(message, 500);
  }
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] ?? "*"}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}
