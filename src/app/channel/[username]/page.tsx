import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth";
import { isSubscribed, getSubscriberCount } from "@/lib/subscriptions";
import { getPublicUrl } from "@/lib/storage";
import { users, streams } from "@/db/schema";
import { StreamCard } from "@/components/streaming/StreamCard";
import ChannelClient from "./channel-client";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const env = await getEnv();
  const db = getDb(env.DB);
  const headersList = await headers();
  const session = await getSession(db, env.JWT_SECRET, headersList.get("cookie"));

  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (user.length === 0) {
    redirect("/");
  }

  const channelUser = user[0];
  const subscriberCount = await getSubscriberCount(db, channelUser.id);
  const subscribed = session
    ? await isSubscribed(db, session.userId, channelUser.id)
    : false;

  const liveStream = await db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.streamerId, channelUser.id),
        eq(streams.status, "live")
      )
    )
    .limit(1);

  const profileUrl = channelUser.profileImageKey
    ? getPublicUrl(env.R2_PUBLIC_URL, channelUser.profileImageKey)
    : null;

  return (
    <ChannelClient
      channelName={channelUser.channelName}
      username={channelUser.username}
      profileUrl={profileUrl}
      subscriberCount={subscriberCount}
      isSubscribed={subscribed}
      isLoggedIn={!!session}
      channelId={channelUser.id}
      liveStream={
        liveStream[0]
          ? {
              id: liveStream[0].id,
              title: liveStream[0].title,
              viewerCount: liveStream[0].viewerCount,
              thumbnailUrl: liveStream[0].thumbnailKey
                ? getPublicUrl(env.R2_PUBLIC_URL, liveStream[0].thumbnailKey)
                : null,
            }
          : null
      }
    />
  );
}
