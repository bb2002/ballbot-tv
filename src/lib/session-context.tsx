"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { User } from "@/db/schema";

type SessionUser = Pick<User, "id" | "username" | "channelName" | "profileImageKey">;

type SessionContextType = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType>({
  user: null,
  setUser: () => {},
  logout: async () => {},
});

export function SessionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  const logout = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <SessionContext.Provider value={{ user, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
