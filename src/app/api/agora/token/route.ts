import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { generateAgoraToken } from "@/lib/streaming";
import type { ApiResponse } from "@/types/api";

export async function POST(request: Request) {
  try {
    const env = await getEnv();
    const db = getDb(env.DB);
    const session = await getSession(
      db,
      env.JWT_SECRET,
      request.headers.get("cookie")
    );

    const body = await request.json();
    const { channelName, uid, role } = body as {
      channelName: string;
      uid: number;
      role: "publisher" | "subscriber";
    };

    if (role === "publisher" && !session) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const token = generateAgoraToken(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role
    );

    return NextResponse.json<ApiResponse<{ token: string; appId: string }>>(
      {
        success: true,
        data: { token, appId: env.AGORA_APP_ID },
      }
    );
  } catch (error) {
    console.error("Token error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
