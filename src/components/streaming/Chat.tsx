"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import type { ApiResponse } from "@/types/api";

type ChatMessage = {
  id: string;
  username: string;
  channelName: string;
  message: string;
  timestamp: number;
};

type Props = {
  streamId: string;
  isLoggedIn: boolean;
};

export function Chat({ streamId, isLoggedIn }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const lastTimestampRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for new messages
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/streams/${streamId}/chat?after=${lastTimestampRef.current}`
        );
        const data = (await res.json()) as ApiResponse<ChatMessage[]>;
        if (data.success && data.data.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const newMsgs = data.data.filter((m) => !ids.has(m.id));
            return [...prev, ...newMsgs].slice(-100);
          });
          lastTimestampRef.current = data.data[data.data.length - 1].timestamp;
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [streamId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/streams/${streamId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = (await res.json()) as ApiResponse<ChatMessage>;
      if (!data.success) {
        toast.error(data.error);
        setInput(msg);
      }
    } catch {
      toast.error("전송에 실패했습니다");
      setInput(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-lg bg-background">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold">채팅</h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            아직 채팅이 없습니다
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm break-words">
              <span className="font-semibold text-primary">
                {msg.channelName}
              </span>{" "}
              <span className="text-foreground">{msg.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border shrink-0">
        {isLoggedIn ? (
          <div className="flex gap-1">
            <Input
              placeholder="메시지 보내기..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
              className="text-sm h-8"
            />
            <Button
              size="icon"
              className="size-8 shrink-0"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              <SendHorizonal className="size-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-1">
            로그인 후 채팅에 참여할 수 있습니다
          </p>
        )}
      </div>
    </div>
  );
}
