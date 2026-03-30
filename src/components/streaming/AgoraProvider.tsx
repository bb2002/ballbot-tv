"use client";

import { useMemo, Suspense } from "react";
import dynamic from "next/dynamic";

const AgoraProviderInner = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } = await import(
      "agora-rtc-react"
    );
    return {
      default: ({
        children,
        mode,
      }: {
        children: React.ReactNode;
        mode?: "rtc" | "live";
      }) => {
        const client = useMemo(
          () => AgoraRTC.createClient({ mode: mode || "live", codec: "vp8" }),
          [mode]
        );
        return <AgoraRTCProvider client={client}>{children}</AgoraRTCProvider>;
      },
    };
  },
  { ssr: false }
);

export function AgoraProvider({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode?: "rtc" | "live";
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <AgoraProviderInner mode={mode}>{children}</AgoraProviderInner>
    </Suspense>
  );
}
