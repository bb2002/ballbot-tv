import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { uploadThumbnail, getPublicUrl } from "@/lib/storage";
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const streamId = formData.get("streamId") as string | null;

    if (!file || !streamId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "파일과 스트림 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const result = await uploadThumbnail(
      env.STORAGE,
      db,
      streamId,
      await file.arrayBuffer()
    );

    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url: getPublicUrl(env.R2_PUBLIC_URL, result.key) },
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
