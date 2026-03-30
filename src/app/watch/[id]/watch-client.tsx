"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Chat } from "@/components/streaming/Chat";

const StreamViewer = dynamic(
  () => import("@/components/streaming/StreamViewer"),
  { ssr: false }
);

type Props = {
  streamId: string;
  agoraChannel: string;
  title: string;
  streamerName: string;
  streamerUsername: string;
  streamerProfileUrl: string | null;
  viewerCount: number;
  isLoggedIn: boolean;
  isSubscribed: boolean;
  streamerId: string;
};

export default function WatchClient({
  streamId,
  agoraChannel,
  title,
  streamerName,
  streamerUsername,
  streamerProfileUrl,
  viewerCount,
  isLoggedIn,
  isSubscribed: initialSubscribed,
  streamerId,
}: Props) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [subLoading, setSubLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!isLoggedIn) return;
    setSubLoading(true);
    try {
      if (subscribed) {
        await fetch("/api/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: streamerId }),
        });
        setSubscribed(false);
        toast.success("구독이 취소되었습니다");
      } else {
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: streamerId }),
        });
        setSubscribed(true);
        toast.success("구독했습니다");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <StreamViewer streamId={streamId} agoraChannel={agoraChannel} />
        </div>
        <div className="lg:w-80 h-[300px] lg:h-auto lg:min-h-[400px] shrink-0">
          <Chat streamId={streamId} isLoggedIn={isLoggedIn} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/channel/${streamerUsername}`}>
            <Avatar className="size-10">
              {streamerProfileUrl && (
                <AvatarImage src={streamerProfileUrl} />
              )}
              <AvatarFallback>
                {streamerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link
              href={`/channel/${streamerUsername}`}
              className="font-semibold text-sm hover:underline truncate block"
            >
              {streamerName}
            </Link>
            <p className="text-sm text-muted-foreground truncate">{title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="gap-1">
            <Users className="size-3" />
            {viewerCount}
          </Badge>
          <Button
            variant={subscribed ? "secondary" : "default"}
            size="sm"
            onClick={handleSubscribe}
            disabled={!isLoggedIn || subLoading}
          >
            {subscribed ? "구독 중" : "구독"}
          </Button>
        </div>
      </div>
    </div>
  );
}
