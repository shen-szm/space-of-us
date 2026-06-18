import { NextResponse, type NextRequest } from "next/server";
import { createAuthSessionInfo } from "@/lib/authSessionInfo";
import { getAuthRole, getSessionUsername } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const role = getAuthRole(request);
  const username = role === "site" ? getSessionUsername(request) : null;

  return NextResponse.json(createAuthSessionInfo(role, username));
}
