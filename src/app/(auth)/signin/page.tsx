"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { signInSchema } from "@/lib/validation";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { z } from "zod";
import type { ApiResponse } from "@/types/api";

type SignInForm = z.infer<typeof signInSchema>;

type SessionUser = { id: string; username: string; channelName: string; profileImageKey: string | null };

export default function SignInPage() {
  const router = useRouter();
  const { setUser } = useSession();
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    if (!turnstileToken) {
      toast.error("보안 검증을 완료해주세요");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken }),
      });
      const result = (await res.json()) as ApiResponse<SessionUser>;

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setUser(result.data);
      toast.success("로그인되었습니다");
      router.push("/");
    } catch {
      toast.error("서버 오류가 발생했습니다");
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-3.5rem)] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">로그인</h1>
          <p className="text-muted-foreground text-sm">
            ballbot-tv에 오신 것을 환영합니다
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">아이디</Label>
            <Input id="username" {...register("username")} />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Turnstile
            ref={turnstileRef}
            siteKey="0x4AAAAAACxzXQCRBlsd7AAK"
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
          />
          <Button type="submit" disabled={loading || !turnstileToken}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
