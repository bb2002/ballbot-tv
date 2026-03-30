import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { getSubscriptions } from "@/lib/subscriptions";
import { users } from "@/db/schema";
import type { ApiResponse } from "@/types/api";

export async function GET(request: Request) {
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

    const subs = await getSubscriptions(db, session.userId);
    const channels = await Promise.all(
      subs.map(async (sub) => {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, sub.channelId))
          .limit(1);
        if (user.length === 0) return null;
        return {
          channelId: sub.channelId,
          username: user[0].username,
          channelName: user[0].channelName,
          profileImageKey: user[0].profileImageKey,
        };
      })
    );

    const filteredChannels = channels.filter(Boolean) as NonNullable<(typeof channels)[0]>[];
    return NextResponse.json({ success: true, data: filteredChannels });
  } catch (error) {
    console.error("List subscriptions error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
