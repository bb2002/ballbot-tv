import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth";
import type { ApiResponse } from "@/types/api";

export async function POST() {
  const response = NextResponse.json<ApiResponse<null>>({
    success: true,
    data: null,
  });
  response.headers.set("Set-Cookie", deleteSessionCookie());
  return response;
}
