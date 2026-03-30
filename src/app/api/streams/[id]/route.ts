import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { endStream, getStreamById } from "@/lib/streaming";
import type { ApiResponse } from "@/types/api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const env = await getEnv();
    const db = getDb(env.DB);

    // sendBeacon sends cookies, so we can still authenticate
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

    const stream = await getStreamById(db, id);
    if (!stream || stream.streamerId !== session.userId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    if (stream.status === "ended") {
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        data: null,
      });
    }

    await endStream(db, id);
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error("End stream error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const env = await getEnv();
    const db = getDb(env.DB);
    const stream = await getStreamById(db, id);

    if (!stream) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "방송을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<typeof stream>>({
      success: true,
      data: stream,
    });
  } catch (error) {
    console.error("Get stream error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
