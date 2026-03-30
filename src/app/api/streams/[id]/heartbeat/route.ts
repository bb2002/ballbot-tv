import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { heartbeat } from "@/lib/streaming";
import type { ApiResponse } from "@/types/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const env = await getEnv();
    const db = getDb(env.DB);

    await heartbeat(db, id);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
