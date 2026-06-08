import { NextResponse, type NextRequest } from "next/server";
import { getSessionUsername, requireSiteSession } from "@/lib/server/auth";
import {
  createAccountBindingRequest,
  generateAccountBindingInvite,
  getAccountBindingProfile,
  respondToAccountBindingRequest,
} from "@/lib/server/accountStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const getRegisteredUsername = (request: NextRequest) => {
  const authError = requireSiteSession(request);
  if (authError) return { authError };

  const username = getSessionUsername(request);
  if (!username) {
    return {
      authError: NextResponse.json(
        { error: "Registered account login is required for binding" },
        { status: 401 },
      ),
    };
  }

  return { username };
};

export async function GET(request: NextRequest) {
  const session = getRegisteredUsername(request);
  if (session.authError) return session.authError;

  try {
    return NextResponse.json(await getAccountBindingProfile(session.username));
  } catch {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  const session = getRegisteredUsername(request);
  if (session.authError) return session.authError;

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload) || typeof payload.action !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    if (payload.action === "generateInvite") {
      return NextResponse.json(await generateAccountBindingInvite(session.username));
    }

    if (payload.action === "sendRequest") {
      const inviteCode = cleanString(payload.inviteCode, 16);
      if (inviteCode.length < 4) {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
      }

      return NextResponse.json(await createAccountBindingRequest(session.username, inviteCode));
    }

    if (payload.action === "respond") {
      const requestId = cleanString(payload.requestId, 80);
      if (!requestId) return NextResponse.json({ error: "Invalid request id" }, { status: 400 });

      return NextResponse.json(
        await respondToAccountBindingRequest({
          username: session.username,
          requestId,
          accept: payload.accept === true,
        }),
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Binding operation failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
