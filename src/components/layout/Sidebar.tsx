"use client";

import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Users } from "lucide-react";
import { useEffect, useState } from "react";

type SubscribedChannel = {
  channelId: string;
  username: string;
  channelName: string;
  profileImageKey: string | null;
};

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useSession();
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/subscriptions/list")
      .then((res) => res.json() as Promise<{ success: boolean; data: SubscribedChannel[] }>)
      .then((data) => {
        if (data.success) setChannels(data.data);
      })
      .catch(() => {});
  }, [user]);

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-sidebar h-full ${collapsed ? "w-16" : "w-60"} shrink-0`}
    >
      <nav className="flex flex-col gap-1 p-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Home className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">홈</span>}
        </Link>
      </nav>

      <div className="border-t border-border mx-2" />

      <div className="flex flex-col gap-1 p-2 overflow-y-auto flex-1">
        {!collapsed && (
          <span className="px-3 py-1 text-xs text-muted-foreground font-medium">
            구독
          </span>
        )}
        {user ? (
          channels.length > 0 ? (
            channels.map((ch) => (
              <Link
                key={ch.channelId}
                href={`/channel/${ch.username}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Avatar className="size-6">
                  {ch.profileImageKey && (
                    <AvatarImage src={ch.profileImageKey} />
                  )}
                  <AvatarFallback>
                    {ch.channelName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="text-sm truncate">{ch.channelName}</span>
                )}
              </Link>
            ))
          ) : (
            !collapsed && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                구독한 채널이 없습니다
              </p>
            )
          )
        ) : (
          !collapsed && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              로그인하면 구독 목록을 볼 수 있습니다
            </p>
          )
        )}
      </div>
    </aside>
  );
}
