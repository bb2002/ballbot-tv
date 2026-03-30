import { eq } from "drizzle-orm";
import { users, streams } from "@/db/schema";
import type { Database } from "@/db/client";
import { validateProfileImage } from "./validation";

export async function uploadProfileImage(
  db: Database,
  bucket: R2Bucket,
  userId: string,
  file: File
) {
  const validation = validateProfileImage(file.type, file.size);
  if (!validation.success) {
    return { success: false as const, error: validation.error! };
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const key = `profiles/${userId}/${Date.now()}.${ext}`;

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  await db
    .update(users)
    .set({ profileImageKey: key })
    .where(eq(users.id, userId));

  return { success: true as const, data: { key } };
}

export async function uploadThumbnail(
  bucket: R2Bucket,
  db: Database,
  streamId: string,
  blob: ArrayBuffer
) {
  const key = `thumbnails/${streamId}/${Date.now()}.webp`;

  await bucket.put(key, blob, {
    httpMetadata: { contentType: "image/webp" },
  });

  await db
    .update(streams)
    .set({ thumbnailKey: key })
    .where(eq(streams.id, streamId));

  return { key };
}

export function getPublicUrl(r2PublicUrl: string, key: string): string {
  return `${r2PublicUrl}/${key}`;
}
