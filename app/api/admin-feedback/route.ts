import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/server/auth";
import { readFeedbackStore, writeFeedbackStore } from "@/lib/server/feedbackStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;

  return NextResponse.json({ feedback: await readFeedbackStore() });
}

export async function POST(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload) || payload.action !== "resolve") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const id = cleanString(payload.id, 80);
  const feedback = await readFeedbackStore();
  const next = feedback.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "resolved" as const,
          updatedAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          resolvedBy: "admin",
        }
      : item,
  );
  await writeFeedbackStore(next);

  return NextResponse.json({ ok: true, feedback: next });
}
