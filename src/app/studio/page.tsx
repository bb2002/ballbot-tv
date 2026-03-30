"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "@/lib/session-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Radio } from "lucide-react";
import type { ApiResponse } from "@/types/api";

const StreamerStudio = dynamic(
  () => import("@/components/streaming/StreamerStudio"),
  { ssr: false }
);

export default function StudioPage() {
  const { user } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<"setup" | "live">("setup");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [streamData, setStreamData] = useState<{
    streamId: string;
    agoraChannel: string;
  } | null>(null);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">방송을 시작하려면 로그인이 필요합니다</p>
          <Button onClick={() => router.push("/signin")}>로그인</Button>
        </div>
      </div>
    );
  }

  const handleStart = async () => {
    if (!title.trim()) {
      toast.error("방송 제목을 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, isPublic }),
      });
      const result = (await res.json()) as ApiResponse<{ streamId: string; agoraChannel: string }>;

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setStreamData({
        streamId: result.data.streamId,
        agoraChannel: result.data.agoraChannel,
      });
      setStep("live");
    } catch {
      toast.error("방송 시작에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (step === "live" && streamData) {
    return (
      <StreamerStudio
        streamId={streamData.streamId}
        agoraChannel={streamData.agoraChannel}
        title={title}
      />
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-3.5rem)] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Radio className="mx-auto size-8 text-primary" />
          <h1 className="text-2xl font-bold">방송 시작</h1>
          <p className="text-muted-foreground text-sm">
            방송 정보를 입력하고 시작하세요
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">방송 제목 *</Label>
            <Input
              id="title"
              placeholder="방송 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">방송 설명 (선택)</Label>
            <Input
              id="description"
              placeholder="방송에 대한 간단한 설명"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isPublic">공개 방송</Label>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
          <Button onClick={handleStart} disabled={loading}>
            {loading ? "준비 중..." : "방송 시작"}
          </Button>
        </div>
      </div>
    </div>
  );
}
