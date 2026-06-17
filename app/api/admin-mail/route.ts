import { NextResponse, type NextRequest } from "next/server";
import { sendAdminCustomMail } from "@/lib/server/mail";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload) || !Array.isArray(payload.emails)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const emails = payload.emails
    .map((item) => cleanString(item, 160).toLowerCase())
    .filter((item, index, array) => item.includes("@") && array.indexOf(item) === index);
  const subject = cleanString(payload.subject, 160);
  const body = cleanString(payload.body, 5000);

  if (emails.length === 0 || !subject || !body) {
    return NextResponse.json({ error: "Recipients, subject and body are required" }, { status: 400 });
  }

  await sendAdminCustomMail({ to: emails, subject, body });
  return NextResponse.json({ ok: true, count: emails.length });
}
