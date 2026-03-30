"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StreamCard } from "@/components/streaming/StreamCard";
import { RecordingCard } from "@/components/streaming/RecordingCard";
import { toast } from "sonner";

type Props = {
  channelName: string;
  username: string;
  profileUrl: string | null;
  subscriberCount: number;
  isSubscribed: boolean;
  isLoggedIn: boolean;
  channelId: string;
  recordings: {
    id: string;
    title: string;
    duration: number | null;
    thumbnailUrl: string | null;
    createdAt: Date;
  }[];
  liveStream: {
    id: string;
    title: string;
    viewerCount: number;
    thumbnailUrl: string | null;
  } | null;
};

export default function ChannelClient({
  channelName,
  username,
  profileUrl,
  subscriberCount: initialCount,
  isSubscribed: initialSubscribed,
  isLoggedIn,
  channelId,
  recordings: channelRecordings,
  liveStream,
}: Props) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [subCount, setSubCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      if (subscribed) {
        await fetch("/api/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        });
        setSubscribed(false);
        setSubCount((c) => c - 1);
        toast.success("구독이 취소되었습니다");
      } else {
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        });
        setSubscribed(true);
        setSubCount((c) => c + 1);
        toast.success("구독했습니다");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="size-20">
          {profileUrl && <AvatarImage src={profileUrl} />}
          <AvatarFallback className="text-2xl">
            {channelName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{channelName}</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
          <p className="text-sm text-muted-foreground mt-1">
            구독자 {subCount}명
          </p>
        </div>
        {isLoggedIn && (
          <Button
            variant={subscribed ? "secondary" : "default"}
            onClick={handleSubscribe}
            disabled={loading}
          >
            {subscribed ? "구독 중" : "구독"}
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">방송</h2>
        {liveStream ? (
          <div className="max-w-sm">
            <StreamCard
              id={liveStream.id}
              title={liveStream.title}
              channelName={channelName}
              viewerCount={liveStream.viewerCount}
              thumbnailUrl={liveStream.thumbnailUrl}
              profileImageUrl={profileUrl}
            />
          </div>
        ) : (
          <p className="text-muted-foreground">현재 방송 중이지 않습니다</p>
        )}
      </div>

      {channelRecordings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">다시보기</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelRecordings.map((rec) => (
              <RecordingCard
                key={rec.id}
                id={rec.id}
                title={rec.title}
                channelName={channelName}
                duration={rec.duration}
                thumbnailUrl={rec.thumbnailUrl}
                profileImageUrl={profileUrl}
                createdAt={rec.createdAt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
