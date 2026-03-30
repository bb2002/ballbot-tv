import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { getStreamById, getActiveStreams } from "@/lib/streaming";
import { isSubscribed } from "@/lib/subscriptions";
import { getPublicUrl } from "@/lib/storage";
import { users } from "@/db/schema";
import { StreamCard } from "@/components/streaming/StreamCard";
import WatchClient from "./watch-client";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = await getEnv();
  const db = getDb(env.DB);
  const headersList = await headers();
  const session = await getSession(db, env.JWT_SECRET, headersList.get("cookie"));

  const stream = await getStreamById(db, id);
  if (!stream || stream.status !== "live") {
    redirect("/");
  }

  // Private stream access control
  if (!stream.isPublic) {
    if (!session || session.userId !== stream.streamerId) {
      redirect("/");
    }
  }

  const streamer = await db
    .select()
    .from(users)
    .where(eq(users.id, stream.streamerId))
    .limit(1);

  const subscribed = session
    ? await isSubscribed(db, session.userId, stream.streamerId)
    : false;

  const otherStreams = (await getActiveStreams(db)).filter(
    (s) => s.id !== stream.id
  );

  const otherStreamsWithUsers = await Promise.all(
    otherStreams.slice(0, 6).map(async (s) => {
      const u = await db
        .select()
        .from(users)
        .where(eq(users.id, s.streamerId))
        .limit(1);
      return {
        ...s,
        channelName: u[0]?.channelName ?? "Unknown",
        profileImageUrl: u[0]?.profileImageKey
          ? getPublicUrl(env.R2_PUBLIC_URL, u[0].profileImageKey)
          : null,
        thumbnailUrl: s.thumbnailKey
          ? getPublicUrl(env.R2_PUBLIC_URL, s.thumbnailKey)
          : null,
      };
    })
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <WatchClient
          streamId={stream.id}
          agoraChannel={stream.agoraChannel}
          title={stream.title}
          streamerName={streamer[0]?.channelName ?? "Unknown"}
          streamerUsername={streamer[0]?.username ?? ""}
          streamerProfileUrl={
            streamer[0]?.profileImageKey
              ? getPublicUrl(env.R2_PUBLIC_URL, streamer[0].profileImageKey)
              : null
          }
          viewerCount={stream.viewerCount}
          isLoggedIn={!!session}
          isSubscribed={subscribed}
          streamerId={stream.streamerId}
        />
      </div>

      {/* Sidebar - other streams */}
      <div className="lg:w-72 xl:w-80 shrink-0">
        <h3 className="text-sm font-semibold mb-3">다른 방송</h3>
        <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible">
          {otherStreamsWithUsers.length > 0 ? (
            otherStreamsWithUsers.map((s) => (
              <div key={s.id} className="min-w-[200px] lg:min-w-0">
                <StreamCard
                  id={s.id}
                  title={s.title}
                  channelName={s.channelName}
                  viewerCount={s.viewerCount}
                  thumbnailUrl={s.thumbnailUrl}
                  profileImageUrl={s.profileImageUrl}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              다른 진행 중인 방송이 없습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
