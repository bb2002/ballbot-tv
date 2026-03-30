import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { signInSchema } from "@/lib/validation";
import { signIn, createSessionCookie } from "@/lib/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import type { ApiResponse } from "@/types/api";

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const db = getDb(env.DB);
    const body = await request.json();
    const { turnstileToken, ...formData } = body as { turnstileToken?: string; [key: string]: unknown };

    if (!turnstileToken || !(await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get("CF-Connecting-IP")
    ))) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "보안 검증에 실패했습니다. 다시 시도해주세요." },
        { status: 400 }
      );
    }

    const parsed = signInSchema.safeParse(formData);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const result = await signIn(
      db,
      env.JWT_SECRET,
      parsed.data.username,
      parsed.data.password
    );
    if (!result.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const { user } = result.data;
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        channelName: user.channelName,
        profileImageKey: user.profileImageKey,
      },
    });
    response.headers.set(
      "Set-Cookie",
      createSessionCookie(result.data.token)
    );
    return response;
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발���했습니다" },
      { status: 500 }
    );
  }
}
