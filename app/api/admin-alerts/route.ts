import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/server/auth";
import { listAdminAlerts } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = requireAdminSession(request);
  if (authError) return authError;

  return NextResponse.json({ alerts: await listAdminAlerts() });
}
