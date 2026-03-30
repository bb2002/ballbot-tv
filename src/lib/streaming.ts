import { RtcTokenBuilder, RtcRole } from "agora-token";
import { eq, and, desc, lt, isNull, or } from "drizzle-orm";
import { ulid } from "ulid";
import { streams } from "@/db/schema";
import type { Database } from "@/db/client";

export function generateAgoraToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: "publisher" | "subscriber"
) {
  const agoraRole =
    role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expireTime = 3600;
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    agoraRole,
    expireTime,
    privilegeExpireTime
  );
}

const HEARTBEAT_TIMEOUT_MS = 120_000; // 2분: heartbeat 10초 간격 대비 충분한 여유

export async function createStream(
  db: Database,
  streamerId: string,
  data: { title: string; description?: string; isPublic: boolean }
) {
  const id = ulid();
  const agoraChannel = `stream_${id}`;

  await db.insert(streams).values({
    id,
    streamerId,
    title: data.title,
    description: data.description || null,
    isPublic: data.isPublic,
    status: "live",
    agoraChannel,
    viewerCount: 0,
    lastHeartbeat: new Date(),
    startedAt: new Date(),
  });

  return { id, agoraChannel };
}

export async function endStream(db: Database, streamId: string) {
  await db
    .update(streams)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(streams.id, streamId));
}

export async function getActiveStreams(db: Database) {
  return db
    .select()
    .from(streams)
    .where(and(eq(streams.status, "live"), eq(streams.isPublic, true)))
    .orderBy(desc(streams.viewerCount));
}

export async function getStreamById(db: Database, streamId: string) {
  const result = await db
    .select()
    .from(streams)
    .where(eq(streams.id, streamId))
    .limit(1);
  return result[0] || null;
}

export async function updateViewerCount(
  db: Database,
  streamId: string,
  count: number
) {
  await db
    .update(streams)
    .set({ viewerCount: count })
    .where(eq(streams.id, streamId));
}

export async function heartbeat(db: Database, streamId: string) {
  await db
    .update(streams)
    .set({ lastHeartbeat: new Date() })
    .where(eq(streams.id, streamId));
}

export async function endStaleStreams(db: Database) {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const stale = await db
    .select({ id: streams.id })
    .from(streams)
    .where(
      and(
        eq(streams.status, "live"),
        or(
          lt(streams.lastHeartbeat, cutoff),
          isNull(streams.lastHeartbeat)
        )
      )
    );

  if (stale.length > 0) {
    for (const s of stale) {
      await endStream(db, s.id);
    }
  }

  return stale.length;
}
