import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { createStream, getActiveStreams } from "@/lib/streaming";
import { streamTitleSchema } from "@/lib/validation";
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

    if (!session) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, isPublic } = body as {
      title: string;
      description?: string;
      isPublic: boolean;
    };

    const titleValidation = streamTitleSchema.safeParse(title);
    if (!titleValidation.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "방송 제목을 입력���주세요" },
        { status: 400 }
      );
    }

    const result = await createStream(db, session.userId, {
      title,
      description,
      isPublic,
    });

    return NextResponse.json<
      ApiResponse<{ streamId: string; agoraChannel: string }>
    >(
      { success: true, data: { streamId: result.id, agoraChannel: result.agoraChannel } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create stream error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const env = await getEnv();
    const db = getDb(env.DB);
    const activeStreams = await getActiveStreams(db);
    return NextResponse.json<ApiResponse<typeof activeStreams>>({
      success: true,
      data: activeStreams,
    });
  } catch (error) {
    console.error("Get streams error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
