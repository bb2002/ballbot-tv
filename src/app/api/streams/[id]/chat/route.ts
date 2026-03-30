import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/types/api";

export type ChatMessage = {
  id: string;
  username: string;
  channelName: string;
  message: string;
  timestamp: number;
};

const MAX_MESSAGES = 100;

function chatKey(streamId: string) {
  return `chat:${streamId}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = (await request.json()) as { message: string };
    const message = body.message?.trim();

    if (!message || message.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "메시지를 입력해주세요" },
        { status: 400 }
      );
    }

    if (message.length > 200) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "메시지는 200자 이하여야 합니다" },
        { status: 400 }
      );
    }

    const key = chatKey(id);
    const existing = await env.KV.get<ChatMessage[]>(key, "json");
    const messages = existing ?? [];

    const newMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username: session.user.username,
      channelName: session.user.channelName,
      message,
      timestamp: Date.now(),
    };

    messages.push(newMsg);

    // Keep only last N messages
    const trimmed = messages.slice(-MAX_MESSAGES);

    // TTL 24h — auto-cleanup after stream ends
    await env.KV.put(key, JSON.stringify(trimmed), {
      expirationTtl: 86400,
    });

    return NextResponse.json<ApiResponse<ChatMessage>>({
      success: true,
      data: newMsg,
    });
  } catch (error) {
    console.error("Chat send error:", error);
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

    const url = new URL(request.url);
    const after = Number(url.searchParams.get("after") || "0");

    const key = chatKey(id);
    const messages = (await env.KV.get<ChatMessage[]>(key, "json")) ?? [];

    // Return only messages after the given timestamp
    const filtered = after > 0
      ? messages.filter((m) => m.timestamp > after)
      : messages.slice(-50); // Initial load: last 50

    return NextResponse.json<ApiResponse<ChatMessage[]>>({
      success: true,
      data: filtered,
    });
  } catch (error) {
    console.error("Chat poll error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
