import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { eq } from "drizzle-orm";
import { verifyEmail, resendVerification, createSessionCookie } from "@/lib/auth";
import { users } from "@/db/schema";
import type { ApiResponse } from "@/types/api";

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const db = getDb(env.DB);
    const body = await request.json();

    const { userId, code, resend } = body as {
      userId: string;
      code?: string;
      resend?: boolean;
    };

    if (resend) {
      const result = await resendVerification(
        db,
        env.KV,
        env.RESEND_API_KEY,
        userId
      );
      if (!result.success) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        data: null,
      });
    }

    if (!code) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "인증번호를 입력해주세요" },
        { status: 400 }
      );
    }

    const result = await verifyEmail(db, env.KV, env.JWT_SECRET, userId, code);
    if (!result.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const response = NextResponse.json({
      success: true,
      data: {
        id: user[0].id,
        username: user[0].username,
        channelName: user[0].channelName,
        profileImageKey: user[0].profileImageKey,
      },
    });
    response.headers.set(
      "Set-Cookie",
      createSessionCookie(result.data.token)
    );
    return response;
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발���했습니다" },
      { status: 500 }
    );
  }
}
