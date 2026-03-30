"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { signUpSchema } from "@/lib/validation";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { z } from "zod";
import type { ApiResponse } from "@/types/api";

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const { setUser } = useSession();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [userId, setUserId] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpForm) => {
    if (!turnstileToken) {
      toast.error("보안 검증을 완료해주세요");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, turnstileToken }),
      });
      const result = (await res.json()) as ApiResponse<{ userId: string }>;

      if (!result.success) {
        if (result.fieldErrors) {
          Object.values(result.fieldErrors).forEach(
            (msgs) => msgs.forEach((msg) => toast.error(msg))
          );
        } else {
          toast.error(result.error);
        }
        return;
      }

      setUserId(result.data.userId);
      setStep("verify");
      toast.success("인증번호가 이메일로 발송되었습니다");
    } catch {
      toast.error("서버 오류가 발생했습니다");
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: verificationCode }),
      });
      const result = (await res.json()) as ApiResponse<{ id: string; username: string; channelName: string; profileImageKey: string | null }>;

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setUser(result.data);
      toast.success("회원가입이 완료되었습니다");
      router.push("/");
    } catch {
      toast.error("서버 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resend: true }),
      });
      const result = (await res.json()) as ApiResponse<null>;
      if (result.success) {
        toast.success("인증번호가 재발송되었습니다");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("서버 오류가 발생했습니다");
    }
  };

  if (step === "verify") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-3.5rem)] p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">이메일 인증</h1>
            <p className="text-muted-foreground text-sm">
              이메일로 발송된 6자리 인증번호를 입력해주세요
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">인증번호</Label>
              <Input
                id="code"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <Button onClick={handleVerify} disabled={loading}>
              {loading ? "확인 중..." : "인증 완료"}
            </Button>
            <Button variant="ghost" onClick={handleResend} size="sm">
              인증번호 재발송
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-3.5rem)] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="text-muted-foreground text-sm">
            ballbot-tv에서 방송을 시작하세요
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              placeholder="영문·숫자 4~20자"
              {...register("username")}
            />
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
              placeholder="8자 이상, 영문·숫자·특수문자 포함"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
            <Input
              id="passwordConfirm"
              type="password"
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <p className="text-sm text-destructive">
                {errors.passwordConfirm.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="channelName">채널이름</Label>
            <Input id="channelName" {...register("channelName")} />
            {errors.channelName && (
              <p className="text-sm text-destructive">
                {errors.channelName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
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
            {loading ? "처리 중..." : "회원가입"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/signin" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
