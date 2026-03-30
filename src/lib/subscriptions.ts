import { and, eq, count } from "drizzle-orm";
import { ulid } from "ulid";
import { subscriptions } from "@/db/schema";
import type { Database } from "@/db/client";

export async function subscribe(
  db: Database,
  subscriberId: string,
  channelId: string
) {
  const existing = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.subscriberId, subscriberId),
        eq(subscriptions.channelId, channelId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: false as const, error: "이미 구독 중입니다" };
  }

  await db.insert(subscriptions).values({
    id: ulid(),
    subscriberId,
    channelId,
    createdAt: new Date(),
  });

  return { success: true as const };
}

export async function unsubscribe(
  db: Database,
  subscriberId: string,
  channelId: string
) {
  await db
    .delete(subscriptions)
    .where(
      and(
        eq(subscriptions.subscriberId, subscriberId),
        eq(subscriptions.channelId, channelId)
      )
    );

  return { success: true as const };
}

export async function isSubscribed(
  db: Database,
  subscriberId: string,
  channelId: string
): Promise<boolean> {
  const result = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.subscriberId, subscriberId),
        eq(subscriptions.channelId, channelId)
      )
    )
    .limit(1);
  return result.length > 0;
}

export async function getSubscriptions(db: Database, subscriberId: string) {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.subscriberId, subscriberId));
}

export async function getSubscriberCount(
  db: Database,
  channelId: string
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.channelId, channelId));
  return result[0]?.count ?? 0;
}
