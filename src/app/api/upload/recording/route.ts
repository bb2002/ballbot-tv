import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { recordings } from "@/db/schema";
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
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const streamId = formData.get("streamId") as string | null;
    const duration = Number(formData.get("duration") || "0");
    const thumbnailFile = formData.get("thumbnail") as File | null;

    if (!file || !title) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "파일과 제목이 필요합니다" },
        { status: 400 }
      );
    }

    const id = ulid();
    const videoKey = `recordings/${session.userId}/${id}.webm`;

    await env.STORAGE.put(videoKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: "video/webm" },
    });

    let thumbnailKey: string | null = null;
    if (thumbnailFile) {
      thumbnailKey = `recordings/${session.userId}/${id}_thumb.webp`;
      await env.STORAGE.put(thumbnailKey, await thumbnailFile.arrayBuffer(), {
        httpMetadata: { contentType: "image/webp" },
      });
    }

    await db.insert(recordings).values({
      id,
      streamerId: session.userId,
      streamId: streamId || null,
      title,
      description: description || null,
      videoKey,
      thumbnailKey,
      duration: duration || null,
      createdAt: new Date(),
    });

    return NextResponse.json<ApiResponse<{ recordingId: string }>>({
      success: true,
      data: { recordingId: id },
    });
  } catch (error) {
    console.error("Recording upload error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
