import { NextResponse, type NextRequest } from "next/server";
import { type UserFeedback, type UserFeedbackCategory } from "@/data/feedback";
import { findPublicAccount } from "@/lib/server/accountStore";
import { getSessionUsername, requireSiteSession } from "@/lib/server/auth";
import { readFeedbackStore, writeFeedbackStore } from "@/lib/server/feedbackStore";
import { sendAdminFeedbackEmail } from "@/lib/server/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const categories = new Set<UserFeedbackCategory>(["bug", "idea", "experience", "other"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function POST(request: NextRequest) {
  const authError = requireSiteSession(request);
  if (authError) return authError;

  const username = getSessionUsername(request);
  if (!username) {
    return NextResponse.json({ error: "Registered account login is required" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const category = categories.has(payload.category as UserFeedbackCategory)
    ? (payload.category as UserFeedbackCategory)
    : "other";
  const message = cleanString(payload.message, 4000);
  if (!message) {
    return NextResponse.json({ error: "Feedback message is required" }, { status: 400 });
  }

  const user = await findPublicAccount(username);
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const timestamp = new Date().toISOString();
  const feedback: UserFeedback = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    category,
    message,
    status: "new",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const current = await readFeedbackStore();
  await writeFeedbackStore([feedback, ...current]);

  const adminEmail = process.env.ADMIN_FEEDBACK_EMAIL?.trim();
  if (adminEmail) {
    await sendAdminFeedbackEmail({
      to: adminEmail,
      subject: `Space of us 用户反馈 · ${user.username}`,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      category,
      message,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, feedback });
}
