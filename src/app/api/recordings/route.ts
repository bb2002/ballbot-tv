import { NextResponse } from "next/server";
import { desc, eq, like, or } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { recordings, users } from "@/db/schema";
import { getPublicUrl } from "@/lib/storage";
import type { ApiResponse } from "@/types/api";

export async function GET(request: Request) {
  try {
    const env = await getEnv();
    const db = getDb(env.DB);
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const streamerId = url.searchParams.get("streamerId");

    let results;
    if (query) {
      const pattern = `%${query}%`;
      results = await db
        .select()
        .from(recordings)
        .where(or(like(recordings.title, pattern), like(recordings.description, pattern)))
        .orderBy(desc(recordings.createdAt))
        .limit(50);
    } else if (streamerId) {
      results = await db
        .select()
        .from(recordings)
        .where(eq(recordings.streamerId, streamerId))
        .orderBy(desc(recordings.createdAt))
        .limit(50);
    } else {
      results = await db
        .select()
        .from(recordings)
        .orderBy(desc(recordings.createdAt))
        .limit(50);
    }

    const withUsers = await Promise.all(
      results.map(async (rec) => {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, rec.streamerId))
          .limit(1);
        return {
          ...rec,
          channelName: user[0]?.channelName ?? "Unknown",
          username: user[0]?.username ?? "",
          thumbnailUrl: rec.thumbnailKey
            ? getPublicUrl(env.R2_PUBLIC_URL, rec.thumbnailKey)
            : null,
          videoUrl: getPublicUrl(env.R2_PUBLIC_URL, rec.videoKey),
        };
      })
    );

    return NextResponse.json<ApiResponse<typeof withUsers>>({
      success: true,
      data: withUsers,
    });
  } catch (error) {
    console.error("Recordings list error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
