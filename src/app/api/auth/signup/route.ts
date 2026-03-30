import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { signUpSchema } from "@/lib/validation";
import { signUp } from "@/lib/auth";
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

    const parsed = signUpSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "입력값이 올바르지 않습니다", fieldErrors },
        { status: 400 }
      );
    }

    const result = await signUp(db, env.KV, env.RESEND_API_KEY, {
      username: parsed.data.username,
      password: parsed.data.password,
      channelName: parsed.data.channelName,
      email: parsed.data.email,
    });

    if (!result.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<{ userId: string }>>(
      { success: true, data: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
