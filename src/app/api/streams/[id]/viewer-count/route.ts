import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getStreamById, updateViewerCount } from "@/lib/streaming";
import type { ApiResponse } from "@/types/api";

export async function GET(
  _request: Request,
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

    return NextResponse.json<ApiResponse<{ viewerCount: number }>>({
      success: true,
      data: { viewerCount: stream.viewerCount },
    });
  } catch (error) {
    console.error("Viewer count error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했��니다" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const env = await getEnv();
    const db = getDb(env.DB);
    const body = await request.json();
    const { count } = body as { count: number };

    await updateViewerCount(db, id, count);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error("Update viewer count error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
