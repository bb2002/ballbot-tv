import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlayCircle } from "lucide-react";

type RecordingCardProps = {
  id: string;
  title: string;
  channelName: string;
  duration: number | null;
  thumbnailUrl: string | null;
  profileImageUrl?: string | null;
  createdAt: Date;
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RecordingCard({
  id,
  title,
  channelName,
  duration,
  thumbnailUrl,
  profileImageUrl,
  createdAt,
}: RecordingCardProps) {
  return (
    <Link href={`/recording/${id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <PlayCircle className="size-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            다시보기
          </Badge>
        </div>
        {duration && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs font-mono">
              {formatDuration(duration)}
            </Badge>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Avatar className="size-8 shrink-0">
          {profileImageUrl && <AvatarImage src={profileImageUrl} />}
          <AvatarFallback>
            {channelName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {channelName} · {new Date(createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>
    </Link>
  );
}
