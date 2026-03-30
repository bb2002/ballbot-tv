import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getActiveStreams, endStaleStreams } from "@/lib/streaming";
import { searchStreams } from "@/lib/search";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPublicUrl } from "@/lib/storage";
import { StreamCard } from "@/components/streaming/StreamCard";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const env = await getEnv();
  const db = getDb(env.DB);

  // Clean up stale streams in background (non-blocking)
  endStaleStreams(db).catch(() => {});

  const activeStreams = q
    ? await searchStreams(db, q)
    : await getActiveStreams(db);

  const streamsWithUsers = await Promise.all(
    activeStreams.map(async (stream) => {
      const streamer = await db
        .select()
        .from(users)
        .where(eq(users.id, stream.streamerId))
        .limit(1);
      return {
        ...stream,
        channelName: streamer[0]?.channelName ?? "Unknown",
        profileImageUrl: streamer[0]?.profileImageKey
          ? getPublicUrl(env.R2_PUBLIC_URL, streamer[0].profileImageKey)
          : null,
        thumbnailUrl: stream.thumbnailKey
          ? getPublicUrl(env.R2_PUBLIC_URL, stream.thumbnailKey)
          : null,
      };
    })
  );

  return (
    <div className="p-4 lg:p-6">
      {q && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            &ldquo;{q}&rdquo; 검색 결과
          </h2>
        </div>
      )}

      {streamsWithUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">
            {q ? "검색 결과가 없습니다" : "현재 진행 중인 방송이 없습니다"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {streamsWithUsers.map((stream) => (
            <StreamCard
              key={stream.id}
              id={stream.id}
              title={stream.title}
              channelName={stream.channelName}
              viewerCount={stream.viewerCount}
              thumbnailUrl={stream.thumbnailUrl}
              profileImageUrl={stream.profileImageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
