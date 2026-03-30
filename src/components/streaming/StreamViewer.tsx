"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

type Props = {
  streamId: string;
  agoraChannel: string;
};

export default function StreamViewer({ streamId, agoraChannel }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const init = useCallback(async () => {
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    client.setClientRole("audience");
    clientRef.current = client;

    const tokenRes = await fetch("/api/agora/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelName: agoraChannel,
        uid: 0,
        role: "subscriber",
      }),
    });
    const tokenData = (await tokenRes.json()) as ApiResponse<{ token: string; appId: string }>;
    if (!tokenData.success) {
      toast.error("연결에 실패했습니다");
      return;
    }

    await client.join(
      tokenData.data.appId,
      agoraChannel,
      tokenData.data.token,
      null
    );
    setConnected(true);

    // Update viewer count
    fetch(`/api/streams/${streamId}/viewer-count`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        count: client.remoteUsers.length + 1,
      }),
    }).catch(() => {});

    client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video" && videoRef.current) {
        user.videoTrack?.play(videoRef.current);
      }
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    });

    client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      if (mediaType === "video") {
        user.videoTrack?.stop();
      }
    });

    client.on("user-left", () => {
      if (client.remoteUsers.length === 0) {
        toast.info("방송이 종료되었습니다");
        setTimeout(() => router.push("/"), 2000);
      }
    });

    // Token renewal
    client.on("token-privilege-will-expire", async () => {
      const res = await fetch("/api/agora/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: agoraChannel,
          uid: 0,
          role: "subscriber",
        }),
      });
      const data = (await res.json()) as ApiResponse<{ token: string; appId: string }>;
      if (data.success) {
        await client.renewToken(data.data.token);
      }
    });

    // Reconnection
    client.on(
      "connection-state-change",
      (curState: string, prevState: string) => {
        if (curState === "DISCONNECTED") {
          toast.error("연결이 끊어졌습니다. 재연결을 시도합니다...");
        }
        if (curState === "CONNECTED" && prevState === "RECONNECTING") {
          toast.success("재연결되었습니다");
        }
      }
    );
  }, [agoraChannel, streamId, router]);

  useEffect(() => {
    init();
    return () => {
      clientRef.current?.leave();
    };
  }, [init]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative w-full aspect-video bg-black rounded-lg overflow-hidden"
    >
      <div ref={videoRef} className="w-full h-full" />
      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white">연결 중...</p>
        </div>
      )}
      {/* Controls overlay - visible on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 size-8"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
