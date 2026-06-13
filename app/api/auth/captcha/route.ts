import { NextResponse } from "next/server";
import { createCaptchaChallenge, renderCaptchaSvg } from "@/lib/server/verificationStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const challenge = await createCaptchaChallenge();
  return NextResponse.json(
    {
      token: challenge.token,
      svg: renderCaptchaSvg(challenge.answer),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
