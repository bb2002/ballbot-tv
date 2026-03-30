import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  channelName: text("channel_name").notNull(),
  email: text("email").notNull().unique(),
  profileImageKey: text("profile_image_key"),
  isVerified: integer("is_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const streams = sqliteTable(
  "streams",
  {
    id: text("id").primaryKey(),
    streamerId: text("streamer_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    isPublic: integer("is_public", { mode: "boolean" })
      .notNull()
      .default(true),
    status: text("status", { enum: ["live", "ended"] })
      .notNull()
      .default("live"),
    agoraChannel: text("agora_channel").notNull().unique(),
    thumbnailKey: text("thumbnail_key"),
    viewerCount: integer("viewer_count").notNull().default(0),
    lastHeartbeat: integer("last_heartbeat", { mode: "timestamp" }),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp" }),
  },
  (t) => [
    index("streams_status_idx").on(t.status),
    index("streams_streamer_idx").on(t.streamerId),
  ]
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    subscriberId: text("subscriber_id")
      .notNull()
      .references(() => users.id),
    channelId: text("channel_id")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("subscriptions_unique_idx").on(t.subscriberId, t.channelId),
  ]
);

export const recordings = sqliteTable(
  "recordings",
  {
    id: text("id").primaryKey(),
    streamerId: text("streamer_id")
      .notNull()
      .references(() => users.id),
    streamId: text("stream_id").references(() => streams.id),
    title: text("title").notNull(),
    description: text("description"),
    videoKey: text("video_key").notNull(),
    thumbnailKey: text("thumbnail_key"),
    duration: integer("duration"), // seconds
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("recordings_streamer_idx").on(t.streamerId),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
