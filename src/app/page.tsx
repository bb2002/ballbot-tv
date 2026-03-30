import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getActiveStreams, endStaleStreams } from "@/lib/streaming";
import { searchStreams } from "@/lib/search";
import { users, recordings } from "@/db/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { getPublicUrl } from "@/lib/storage";
import { StreamCard } from "@/components/streaming/StreamCard";
import { RecordingCard } from "@/components/streaming/RecordingCard";

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

  // Live streams
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

  // Recordings
  const recentRecordings = q
    ? await db
        .select()
        .from(recordings)
        .where(
          or(
            like(recordings.title, `%${q}%`),
            like(recordings.description, `%${q}%`)
          )
        )
        .orderBy(desc(recordings.createdAt))
        .limit(12)
    : await db
        .select()
        .from(recordings)
        .orderBy(desc(recordings.createdAt))
        .limit(12);

  const recordingsWithUsers = await Promise.all(
    recentRecordings.map(async (rec) => {
      const streamer = await db
        .select()
        .from(users)
        .where(eq(users.id, rec.streamerId))
        .limit(1);
      return {
        ...rec,
        channelName: streamer[0]?.channelName ?? "Unknown",
        profileImageUrl: streamer[0]?.profileImageKey
          ? getPublicUrl(env.R2_PUBLIC_URL, streamer[0].profileImageKey)
          : null,
        thumbnailUrl: rec.thumbnailKey
          ? getPublicUrl(env.R2_PUBLIC_URL, rec.thumbnailKey)
          : null,
      };
    })
  );

  const noResults =
    streamsWithUsers.length === 0 && recordingsWithUsers.length === 0;

  return (
    <div className="p-4 lg:p-6">
      {q && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            &ldquo;{q}&rdquo; 검색 결과
          </h2>
        </div>
      )}

      {noResults ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">
            {q ? "검색 결과가 없습니다" : "콘텐츠가 없습니다"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Live streams */}
          {streamsWithUsers.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                {q ? "라이브 방송" : "지금 라이브"}
              </h2>
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
            </section>
          )}

          {/* Recordings */}
          {recordingsWithUsers.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                {q ? "다시보기" : "최근 다시보기"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recordingsWithUsers.map((rec) => (
                  <RecordingCard
                    key={rec.id}
                    id={rec.id}
                    title={rec.title}
                    channelName={rec.channelName}
                    duration={rec.duration}
                    thumbnailUrl={rec.thumbnailUrl}
                    profileImageUrl={rec.profileImageUrl}
                    createdAt={rec.createdAt}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
