import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { uploadProfileImage, getPublicUrl } from "@/lib/storage";
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

    if (!file) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "파일을 선택해주세요" },
        { status: 400 }
      );
    }

    const result = await uploadProfileImage(
      db,
      env.STORAGE,
      session.userId,
      file
    );

    if (!result.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url: getPublicUrl(env.R2_PUBLIC_URL, result.data.key) },
    });
  } catch (error) {
    console.error("Profile upload error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
