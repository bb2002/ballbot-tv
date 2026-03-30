import { and, eq, like, or } from "drizzle-orm";
import { streams } from "@/db/schema";
import type { Database } from "@/db/client";

export async function searchStreams(db: Database, query: string) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.status, "live"),
        eq(streams.isPublic, true),
        or(like(streams.title, pattern), like(streams.description, pattern))
      )
    );
}
