type StreamLike = {
  status: string;
  isPublic: boolean;
  viewerCount?: number;
  title?: string;
  description?: string;
};

export function filterActivePublicStreams<T extends StreamLike>(
  streams: T[]
): T[] {
  return streams.filter((s) => s.status === "live" && s.isPublic === true);
}

export function sortByViewerCount<T extends { viewerCount: number }>(
  streams: T[]
): T[] {
  return [...streams].sort((a, b) => b.viewerCount - a.viewerCount);
}

export function searchStreamsLocal<
  T extends { title: string; description: string },
>(query: string, streams: T[]): T[] {
  return streams.filter(
    (s) => s.title.includes(query) || s.description.includes(query)
  );
}
