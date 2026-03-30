import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

type StreamCardProps = {
  id: string;
  title: string;
  channelName: string;
  viewerCount: number;
  thumbnailUrl?: string | null;
  profileImageUrl?: string | null;
};

export function StreamCard({
  id,
  title,
  channelName,
  viewerCount,
  thumbnailUrl,
  profileImageUrl,
}: StreamCardProps) {
  return (
    <Link href={`/watch/${id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground text-sm">미리보기 없음</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="destructive" className="text-xs">
            LIVE
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <Users className="size-3" />
            {viewerCount}
          </Badge>
        </div>
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
            {channelName}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function StreamCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-video rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <div className="flex flex-col gap-1 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}
