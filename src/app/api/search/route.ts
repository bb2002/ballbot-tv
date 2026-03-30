import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { searchStreams } from "@/lib/search";
import type { ApiResponse } from "@/types/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "검색어를 입력해주세요" },
        { status: 400 }
      );
    }

    const env = await getEnv();
    const db = getDb(env.DB);
    const results = await searchStreams(db, query.trim());

    return NextResponse.json<ApiResponse<typeof results>>({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
