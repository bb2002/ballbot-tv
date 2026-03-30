"use client";

import { useRef, useState } from "react";
import { useSession } from "@/lib/session-context";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import type { ApiResponse } from "@/types/api";

export default function MyPage() {
  const { user, setUser } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) {
    router.push("/signin");
    return null;
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/profile", {
        method: "POST",
        body: formData,
      });
      const result = (await res.json()) as ApiResponse<{ url: string }>;

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setUser({ ...user, profileImageKey: result.data.url });
      toast.success("프로필 사진이 업데이트되었습니다");
      router.refresh();
    } catch {
      toast.error("업로드에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="size-24">
            {user.profileImageKey && (
              <AvatarImage src={user.profileImageKey} />
            )}
            <AvatarFallback className="text-2xl">
              {user.channelName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-0 right-0 rounded-full size-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="size-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold">{user.channelName}</h2>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>
    </div>
  );
}
