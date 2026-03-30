import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { recordings, users } from "@/db/schema";
import { getPublicUrl } from "@/lib/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = await getEnv();
  const db = getDb(env.DB);

  const rec = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  if (rec.length === 0) redirect("/");

  const recording = rec[0];
  const streamer = await db
    .select()
    .from(users)
    .where(eq(users.id, recording.streamerId))
    .limit(1);

  const videoUrl = getPublicUrl(env.R2_PUBLIC_URL, recording.videoKey);
  const profileUrl = streamer[0]?.profileImageKey
    ? getPublicUrl(env.R2_PUBLIC_URL, streamer[0].profileImageKey)
    : null;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6">
      <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
        <video
          src={videoUrl}
          controls
          autoPlay
          className="w-full h-full"
        />
      </div>

      <h1 className="text-xl font-bold mb-2">{recording.title}</h1>
      {recording.description && (
        <p className="text-sm text-muted-foreground mb-4">
          {recording.description}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Link href={`/channel/${streamer[0]?.username}`}>
          <Avatar className="size-10">
            {profileUrl && <AvatarImage src={profileUrl} />}
            <AvatarFallback>
              {streamer[0]?.channelName?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <Link
            href={`/channel/${streamer[0]?.username}`}
            className="font-semibold text-sm hover:underline"
          >
            {streamer[0]?.channelName ?? "Unknown"}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {recording.duration && (
              <span>{formatDuration(recording.duration)}</span>
            )}
            <span>
              {new Date(recording.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
