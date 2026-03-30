import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { endStaleStreams } from "@/lib/streaming";
import type { ApiResponse } from "@/types/api";

export async function POST(request: Request) {
  try {
    const env = await getEnv();

    // Simple auth: check for a shared secret to prevent unauthorized calls
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${env.JWT_SECRET}`) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = getDb(env.DB);
    const cleaned = await endStaleStreams(db);

    return NextResponse.json<ApiResponse<{ cleaned: number }>>({
      success: true,
      data: { cleaned },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
