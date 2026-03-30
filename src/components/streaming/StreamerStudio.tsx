"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users } from "lucide-react";
import { Chat } from "@/components/streaming/Chat";
import type { ApiResponse } from "@/types/api";

type Props = {
  streamId: string;
  agoraChannel: string;
  title: string;
  description?: string;
  saveRecording?: boolean;
};

export default function StreamerStudio({
  streamId,
  agoraChannel,
  title,
  description,
  saveRecording,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLDivElement>(null);
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [uploading, setUploading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localAudioRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localVideoRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const init = useCallback(async () => {
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    client.setClientRole("host");
    clientRef.current = client;

    const tokenRes = await fetch("/api/agora/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelName: agoraChannel,
        uid: 0,
        role: "publisher",
      }),
    });
    const tokenData = (await tokenRes.json()) as ApiResponse<{ token: string; appId: string }>;
    if (!tokenData.success) {
      toast.error("토큰 발급 실패");
      return;
    }

    await client.join(
      tokenData.data.appId,
      agoraChannel,
      tokenData.data.token,
      null
    );

    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const videoTrack = await AgoraRTC.createCameraVideoTrack();
    localAudioRef.current = audioTrack;
    localVideoRef.current = videoTrack;

    await client.publish([audioTrack, videoTrack]);

    if (videoRef.current) {
      videoTrack.play(videoRef.current);
    }

    const devices = await AgoraRTC.getDevices();
    const videoDevices = devices.filter((d: MediaDeviceInfo) => d.kind === "videoinput");
    setCameras(videoDevices);
    if (videoDevices.length > 0) {
      setSelectedCamera(videoDevices[0].deviceId);
    }

    // Capture thumbnail
    setTimeout(async () => {
      try {
        const canvas = document.createElement("canvas");
        const videoEl = videoRef.current?.querySelector("video");
        if (videoEl) {
          canvas.width = videoEl.videoWidth || 640;
          canvas.height = videoEl.videoHeight || 360;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/webp", 0.8)
          );
          if (blob) {
            const formData = new FormData();
            formData.append("file", blob, "thumbnail.webp");
            formData.append("streamId", streamId);
            fetch("/api/upload/thumbnail", {
              method: "POST",
              body: formData,
            }).catch(() => {});
          }
        }
      } catch {
        // Non-blocking
      }
    }, 3000);

    // Token renewal
    client.on("token-privilege-will-expire", async () => {
      const res = await fetch("/api/agora/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: agoraChannel,
          uid: 0,
          role: "publisher",
        }),
      });
      const data = (await res.json()) as ApiResponse<{ token: string; appId: string }>;
      if (data.success) {
        await client.renewToken(data.data.token);
      }
    });

    // Start recording if enabled
    if (saveRecording) {
      try {
        const videoEl = videoRef.current?.querySelector("video");
        if (videoEl) {
          // Wait for video to be playing
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const canvasEl = document.createElement("canvas");
          const ctx = canvasEl.getContext("2d")!;
          canvasEl.width = videoEl.videoWidth || 1280;
          canvasEl.height = videoEl.videoHeight || 720;

          const canvasStream = canvasEl.captureStream(30);
          // Mix audio
          const audioCtx = new AudioContext();
          const dest = audioCtx.createMediaStreamDestination();
          const audioStream = audioTrack.getMediaStreamTrack();
          const source = audioCtx.createMediaStreamSource(
            new MediaStream([audioStream])
          );
          source.connect(dest);
          for (const track of dest.stream.getAudioTracks()) {
            canvasStream.addTrack(track);
          }

          // Draw video frames to canvas
          const drawFrame = () => {
            if (mediaRecorderRef.current?.state === "recording") {
              ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
              requestAnimationFrame(drawFrame);
            }
          };

          const recorder = new MediaRecorder(canvasStream, {
            mimeType: "video/webm;codecs=vp8,opus",
            videoBitsPerSecond: 2_500_000,
          });
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          mediaRecorderRef.current = recorder;
          recordedChunksRef.current = [];
          recordingStartTimeRef.current = Date.now();
          recorder.start(5000); // collect data every 5s
          drawFrame();
        }
      } catch (err) {
        console.error("Recording setup failed:", err);
        toast.error("녹화 시작에 실패했습니다. ���송은 계속됩니다.");
      }
    }

    setJoined(true);
  }, [agoraChannel, streamId, saveRecording]);

  useEffect(() => {
    init();
    return () => {
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      clientRef.current?.leave();
    };
  }, [init]);

  // sendBeacon on tab close / navigate away
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `/api/streams/${streamId}`,
        new Blob([JSON.stringify({ action: "end" })], {
          type: "application/json",
        })
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [streamId]);

  // Heartbeat every 10 seconds
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => {
      fetch(`/api/streams/${streamId}/heartbeat`, { method: "POST" }).catch(
        () => {}
      );
    }, 10_000);
    // Send first heartbeat immediately
    fetch(`/api/streams/${streamId}/heartbeat`, { method: "POST" }).catch(
      () => {}
    );
    return () => clearInterval(interval);
  }, [joined, streamId]);

  // Poll viewer count
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/viewer-count`);
        const data = (await res.json()) as ApiResponse<{ viewerCount: number }>;
        if (data.success) setViewerCount(data.data.viewerCount);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [joined, streamId]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleMic = async () => {
    if (localAudioRef.current) {
      await localAudioRef.current.setEnabled(!micOn);
      setMicOn(!micOn);
    }
  };

  const toggleCam = async () => {
    if (localVideoRef.current) {
      await localVideoRef.current.setEnabled(!camOn);
      setCamOn(!camOn);
    }
  };

  const handleCameraChange = async (deviceId: string | null) => {
    if (!deviceId) return;
    if (deviceId === "screen") {
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        const oldTrack = localVideoRef.current;
        localVideoRef.current = screenTrack;
        if (clientRef.current) {
          await clientRef.current.unpublish(oldTrack);
          await clientRef.current.publish(screenTrack);
        }
        oldTrack?.close();
        if (videoRef.current) {
          const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
          track.play(videoRef.current);
        }
        setIsScreenShare(true);
        setSelectedCamera("screen");
      } catch {
        toast.error("화면 공유를 시작할 수 없습니다");
      }
    } else {
      if (localVideoRef.current) {
        if (isScreenShare) {
          const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
          const oldTrack = localVideoRef.current;
          const newTrack = await AgoraRTC.createCameraVideoTrack({
            cameraId: deviceId,
          });
          localVideoRef.current = newTrack;
          if (clientRef.current) {
            await clientRef.current.unpublish(oldTrack);
            await clientRef.current.publish(newTrack);
          }
          oldTrack?.close();
          if (videoRef.current) {
            newTrack.play(videoRef.current);
          }
          setIsScreenShare(false);
        } else {
          await localVideoRef.current.setDevice(deviceId);
        }
      }
      setSelectedCamera(deviceId);
    }
  };

  const uploadRecording = async (): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    // Stop recorder and wait for final data
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    const chunks = recordedChunksRef.current;
    if (chunks.length === 0) return;

    setUploading(true);
    toast.info("녹화본을 저장하는 중...");

    try {
      const blob = new Blob(chunks, { type: "video/webm" });
      const duration = Math.floor(
        (Date.now() - recordingStartTimeRef.current) / 1000
      );

      // Capture thumbnail
      let thumbnailBlob: Blob | null = null;
      const videoEl = videoRef.current?.querySelector("video");
      if (videoEl) {
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        thumbnailBlob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/webp", 0.8)
        );
      }

      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("title", title);
      formData.append("description", description || "");
      formData.append("streamId", streamId);
      formData.append("duration", String(duration));
      if (thumbnailBlob) {
        formData.append("thumbnail", thumbnailBlob, "thumb.webp");
      }

      const res = await fetch("/api/upload/recording", {
        method: "POST",
        body: formData,
      });
      const result = (await res.json()) as ApiResponse<{ recordingId: string }>;

      if (result.success) {
        toast.success("녹화본이 저장되었습니다");
      } else {
        toast.error("녹화본 저장에 실패했습니다");
      }
    } catch {
      toast.error("녹화본 업로드에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  const handleEndStream = async () => {
    try {
      // Upload recording first if enabled
      if (saveRecording && mediaRecorderRef.current) {
        await uploadRecording();
      }

      await fetch(`/api/streams/${streamId}`, { method: "PATCH" });
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      await clientRef.current?.leave();
      toast.success("방송이 종료되었습니다");
      router.push("/");
    } catch {
      toast.error("방송 종료에 실패했습니다");
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Video + Controls */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Video preview */}
        <div className="relative flex-1 bg-black">
          <div ref={videoRef} className="w-full h-full" />

        {/* Overlay: top right - viewer count */}
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="gap-1">
            <Users className="size-3" />
            {viewerCount}
          </Badge>
        </div>

        {/* Overlay: bottom left - time + title */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Badge variant="destructive">LIVE</Badge>
          <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
            {currentTime}
          </span>
          <span className="text-white text-sm bg-black/50 px-2 py-1 rounded truncate max-w-xs">
            {title}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-background border-t border-border">
        <Button
          variant={micOn ? "secondary" : "destructive"}
          size="icon"
          onClick={toggleMic}
        >
          {micOn ? <Mic /> : <MicOff />}
        </Button>
        <Button
          variant={camOn ? "secondary" : "destructive"}
          size="icon"
          onClick={toggleCam}
        >
          {camOn ? <Video /> : <VideoOff />}
        </Button>

        <Select value={selectedCamera} onValueChange={handleCameraChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="카메라 선택" />
          </SelectTrigger>
          <SelectContent>
            {cameras.map((cam) => (
              <SelectItem key={cam.deviceId} value={cam.deviceId}>
                {cam.label || "카메라"}
              </SelectItem>
            ))}
            <SelectItem value="screen">
              <span className="flex items-center gap-1">
                <Monitor className="size-3" />
                화면 공유
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive">
                <PhoneOff data-icon="inline-start" />
                방송 종료
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>방송을 종료하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                방송을 종료하면 모든 시청자의 연결이 끊어집니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleEndStream}>
                방송 종료
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      {/* Right: Chat */}
      <div className="hidden md:block w-80 shrink-0 border-l border-border">
        <Chat streamId={streamId} isLoggedIn={true} />
      </div>
    </div>
  );
}
